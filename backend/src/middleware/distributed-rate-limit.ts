import { Request, Response, NextFunction } from "express";
import { redisExpire, redisIncr } from "../config/redis-upstash";
import {
  appMetrics,
  logger,
  tracer,
  SpanStatusCode,
} from "../observability/observability";

/**
 * Distributed Rate Limiter using Upstash Redis
 *
 * Algorithm: Fixed Window Counter
 * - Simple, distributed, no clock sync required
 * - Trade-off: May allow bursts at window boundaries (acceptable for most APIs)
 *
 * Per-Request Tracking:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests left in current window
 * - Retry-After: Seconds to wait (on 429)
 */

interface ClientIdentifier {
  type: "ip" | "user";
  value: string;
}

/**
 * Extract stable client identifier from request
 */
function getClientIdentifier(req: Request): ClientIdentifier {
  // Priority: User ID > IP Address
  const userId = (req as any).userId;
  if (userId) {
    return { type: "user", value: `user:${userId}` };
  }

  // Fallback to IP (respect X-Forwarded-For from proxy)
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  return { type: "ip", value: `ip:${ip}` };
}

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  points: number; // Request quota
  duration: number; // Window duration in seconds
  blockDuration?: number; // Block duration on exceed (if implemented)
  prefix: string; // Redis key prefix
}

/**
 * Track request against rate limit
 * Returns: { count: number, remaining: number, resetAt: number, exceeded: boolean }
 */
async function trackRequest(
  identifier: ClientIdentifier,
  config: RateLimitConfig
): Promise<{
  count: number;
  remaining: number;
  resetAt: number;
  exceeded: boolean;
}> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / config.duration) * config.duration;
  const windowEnd = windowStart + config.duration;
  const key = `${config.prefix}:${identifier.value}:${windowStart}`;

  try {
    // Atomic increment to avoid race conditions under concurrency.
    const count = await redisIncr(key);
    if (count === null) {
      throw new Error("Rate limiter increment failed");
    }

    // Set TTL only when key is first created.
    if (count === 1) {
      await redisExpire(key, config.duration + 1);
    }

    const exceeded = count > config.points;
    const remaining = Math.max(0, config.points - count);

    return {
      count,
      remaining,
      resetAt: windowEnd,
      exceeded,
    };
  } catch (error) {
    logger.error(
      { error, identifier: identifier.value },
      "Rate limiter tracking failed"
    );
    // On error, fail open - allow request
    return {
      count: 0,
      remaining: config.points,
      resetAt: windowEnd,
      exceeded: false,
    };
  }
}

/**
 * General API rate limiter middleware
 * Default: 100 requests per 60 seconds, per IP
 */
export function generalRateLimiter(
  customConfig?: Partial<RateLimitConfig>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config: RateLimitConfig = {
    points: Number(process.env.RATE_LIMIT_GENERAL_POINTS || 100),
    duration: Number(process.env.RATE_LIMIT_GENERAL_DURATION || 60),
    prefix: "rl:general",
    ...customConfig,
  };

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const identifier = getClientIdentifier(req);
    const startedAt = Date.now();
    const span = tracer.startSpan("rate_limit.check", {
      attributes: {
        "rate_limit.prefix": config.prefix,
        "rate_limit.limit": config.points,
        "rate_limit.duration_s": config.duration,
        "rate_limit.identifier_type": identifier.type,
        "http.method": req.method,
        "http.path": req.path,
      },
    });

    try {
      const result = await trackRequest(identifier, config);
      const durationMs = Date.now() - startedAt;
      appMetrics.rateLimitChecksTotal.add(1, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      appMetrics.rateLimitDuration.record(durationMs, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });

      // Always expose rate limit headers
      res.setHeader(
        "X-RateLimit-Limit",
        String(config.points)
      );
      res.setHeader(
        "X-RateLimit-Remaining",
        String(result.remaining)
      );
      res.setHeader(
        "X-RateLimit-Reset",
        String(result.resetAt)
      );

      if (result.exceeded) {
        const retryAfter = config.duration;
        res.setHeader("Retry-After", String(retryAfter));
        appMetrics.rateLimitBlockedTotal.add(1, {
          limiter: config.prefix,
          identifier_type: identifier.type,
        });
        span.setAttributes({
          "rate_limit.exceeded": true,
          "rate_limit.remaining": result.remaining,
          "rate_limit.count": result.count,
          "rate_limit.reset_at": result.resetAt,
        });
        span.end();

        logger.warn(
          {
            type: "rate_limit_exceeded",
            identifier: identifier.value,
            limit: config.points,
          },
          "Rate limit exceeded"
        );

        res.status(429).json({
          error: "Too many requests",
          retryAfter,
          limit: config.points,
          remaining: 0,
        });
        return;
      }

      span.setAttributes({
        "rate_limit.exceeded": false,
        "rate_limit.remaining": result.remaining,
        "rate_limit.count": result.count,
        "rate_limit.reset_at": result.resetAt,
      });
      span.end();

      next();
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      appMetrics.rateLimitErrorsTotal.add(1, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      appMetrics.rateLimitDuration.record(durationMs, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      logger.error(
        { error, path: req.path },
        "Rate limiter middleware error"
      );
      span.setStatus({ code: SpanStatusCode.ERROR, message: "rate_limit_error" });
      span.setAttribute("rate_limit.exceeded", false);
      span.end();
      // Fail open - allow request on error
      res.setHeader(
        "X-RateLimit-Limit",
        String(config.points)
      );
      res.setHeader(
        "X-RateLimit-Remaining",
        String(config.points)
      );
      next();
    }
  };
}

/**
 * Strict auth endpoint rate limiter
 * Default: 5 requests per 60 seconds, per IP
 * Protects against brute force on login/signup
 */
export function authRateLimiter(
  customConfig?: Partial<RateLimitConfig>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const config: RateLimitConfig = {
    points: Number(process.env.RATE_LIMIT_AUTH_POINTS || 5),
    duration: Number(process.env.RATE_LIMIT_AUTH_DURATION || 60),
    prefix: "rl:auth",
    ...customConfig,
  };

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const identifier = getClientIdentifier(req);
    const startedAt = Date.now();
    const span = tracer.startSpan("rate_limit.auth_check", {
      attributes: {
        "rate_limit.prefix": config.prefix,
        "rate_limit.limit": config.points,
        "rate_limit.duration_s": config.duration,
        "rate_limit.identifier_type": identifier.type,
        "http.method": req.method,
        "http.path": req.path,
      },
    });

    try {
      const result = await trackRequest(identifier, config);
      const durationMs = Date.now() - startedAt;
      appMetrics.rateLimitChecksTotal.add(1, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      appMetrics.rateLimitDuration.record(durationMs, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });

      // Always expose rate limit headers
      res.setHeader(
        "X-RateLimit-Limit",
        String(config.points)
      );
      res.setHeader(
        "X-RateLimit-Remaining",
        String(result.remaining)
      );
      res.setHeader(
        "X-RateLimit-Reset",
        String(result.resetAt)
      );

      if (result.exceeded) {
        const retryAfter = config.duration;
        res.setHeader("Retry-After", String(retryAfter));
        appMetrics.rateLimitBlockedTotal.add(1, {
          limiter: config.prefix,
          identifier_type: identifier.type,
        });
        span.setAttributes({
          "rate_limit.exceeded": true,
          "rate_limit.remaining": result.remaining,
          "rate_limit.count": result.count,
          "rate_limit.reset_at": result.resetAt,
        });
        span.end();

        logger.warn(
          {
            type: "auth_rate_limit_exceeded",
            identifier: identifier.value,
            endpoint: req.path,
            limit: config.points,
          },
          "Auth rate limit exceeded - possible brute force"
        );

        res.status(429).json({
          error: "Too many attempts. Please try again later.",
          retryAfter,
          limit: config.points,
          remaining: 0,
        });
        return;
      }

      span.setAttributes({
        "rate_limit.exceeded": false,
        "rate_limit.remaining": result.remaining,
        "rate_limit.count": result.count,
        "rate_limit.reset_at": result.resetAt,
      });
      span.end();

      next();
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      appMetrics.rateLimitErrorsTotal.add(1, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      appMetrics.rateLimitDuration.record(durationMs, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      logger.error(
        { error, path: req.path },
        "Auth rate limiter middleware error"
      );
      span.setStatus({ code: SpanStatusCode.ERROR, message: "auth_rate_limit_error" });
      span.setAttribute("rate_limit.exceeded", false);
      span.end();
      // Fail open - allow request on error
      res.setHeader(
        "X-RateLimit-Limit",
        String(config.points)
      );
      res.setHeader(
        "X-RateLimit-Remaining",
        String(config.points)
      );
      next();
    }
  };
}

/**
 * Custom rate limiter factory for specific use cases
 */
export function createRateLimiter(
  config: RateLimitConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const identifier = getClientIdentifier(req);
    const startedAt = Date.now();
    const span = tracer.startSpan("rate_limit.custom_check", {
      attributes: {
        "rate_limit.prefix": config.prefix,
        "rate_limit.limit": config.points,
        "rate_limit.duration_s": config.duration,
        "rate_limit.identifier_type": identifier.type,
        "http.method": req.method,
        "http.path": req.path,
      },
    });

    try {
      const result = await trackRequest(identifier, config);
      const durationMs = Date.now() - startedAt;
      appMetrics.rateLimitChecksTotal.add(1, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      appMetrics.rateLimitDuration.record(durationMs, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });

      res.setHeader(
        "X-RateLimit-Limit",
        String(config.points)
      );
      res.setHeader(
        "X-RateLimit-Remaining",
        String(result.remaining)
      );
      res.setHeader(
        "X-RateLimit-Reset",
        String(result.resetAt)
      );

      if (result.exceeded) {
        const retryAfter = config.duration;
        res.setHeader("Retry-After", String(retryAfter));
        appMetrics.rateLimitBlockedTotal.add(1, {
          limiter: config.prefix,
          identifier_type: identifier.type,
        });
        span.setAttributes({
          "rate_limit.exceeded": true,
          "rate_limit.remaining": result.remaining,
          "rate_limit.count": result.count,
          "rate_limit.reset_at": result.resetAt,
        });
        span.end();

        logger.warn(
          { prefix: config.prefix, identifier: identifier.value },
          "Rate limit exceeded"
        );

        res.status(429).json({
          error: "Rate limit exceeded",
          retryAfter,
          limit: config.points,
        });
        return;
      }

      span.setAttributes({
        "rate_limit.exceeded": false,
        "rate_limit.remaining": result.remaining,
        "rate_limit.count": result.count,
        "rate_limit.reset_at": result.resetAt,
      });
      span.end();

      next();
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      appMetrics.rateLimitErrorsTotal.add(1, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      appMetrics.rateLimitDuration.record(durationMs, {
        limiter: config.prefix,
        identifier_type: identifier.type,
      });
      logger.error({ error }, "Custom rate limiter error");
      span.setStatus({ code: SpanStatusCode.ERROR, message: "custom_rate_limit_error" });
      span.setAttribute("rate_limit.exceeded", false);
      span.end();
      // Fail open
      next();
    }
  };
}
