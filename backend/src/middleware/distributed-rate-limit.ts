import { Request, Response, NextFunction } from "express";
import { redisGet, redisSet } from "../config/redis-upstash";
import { logger } from "../observability/observability";

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
  const windowEnd = now + config.duration;
  const key = `${config.prefix}:${identifier.value}:${now}`;

  try {
    // Get current count
    const currentStr = await redisGet(key);
    let count = currentStr ? parseInt(currentStr, 10) : 0;

    // Increment
    count++;
    const succeeded = await redisSet(key, String(count), config.duration + 1);

    if (!succeeded && count === 1) {
      // First request - retry get
      const retryStr = await redisGet(key);
      count = retryStr ? parseInt(retryStr, 10) : 1;
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

    try {
      const result = await trackRequest(identifier, config);

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

        logger.warn(
          {
            type: "rate_limit_exceeded",
            identifier: identifier.value,
            limit: config.points,
          },
          "Rate limit exceeded"
        );

        return res.status(429).json({
          error: "Too many requests",
          retryAfter,
          limit: config.points,
          remaining: 0,
        });
      }

      next();
    } catch (error) {
      logger.error(
        { error, path: req.path },
        "Rate limiter middleware error"
      );
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

    try {
      const result = await trackRequest(identifier, config);

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

        logger.warn(
          {
            type: "auth_rate_limit_exceeded",
            identifier: identifier.value,
            endpoint: req.path,
            limit: config.points,
          },
          "Auth rate limit exceeded - possible brute force"
        );

        return res.status(429).json({
          error: "Too many attempts. Please try again later.",
          retryAfter,
          limit: config.points,
          remaining: 0,
        });
      }

      next();
    } catch (error) {
      logger.error(
        { error, path: req.path },
        "Auth rate limiter middleware error"
      );
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

    try {
      const result = await trackRequest(identifier, config);

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

        logger.warn(
          { prefix: config.prefix, identifier: identifier.value },
          "Rate limit exceeded"
        );

        return res.status(429).json({
          error: "Rate limit exceeded",
          retryAfter,
          limit: config.points,
        });
      }

      next();
    } catch (error) {
      logger.error({ error }, "Custom rate limiter error");
      // Fail open
      next();
    }
  };
}
