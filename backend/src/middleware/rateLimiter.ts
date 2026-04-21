import { RateLimiterRedis } from "rate-limiter-flexible";
import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";
import { logger } from "../observability/observability";

function isRateLimitRejection(error: unknown): error is { msBeforeNext: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "msBeforeNext" in error &&
    typeof (error as { msBeforeNext?: unknown }).msBeforeNext === "number"
  );
}

/**
 * Get client identifier for rate limiting
 * Supports: IP address (with proxy trust), User ID, API key
 */
function getClientIdentifier(req: Request): string {
  // Priority: User ID > API Key > IP Address
  if ((req as any).userId) {
    return `user:${(req as any).userId}`;
  }
  if ((req as any).apiKey) {
    return `key:${(req as any).apiKey}`;
  }
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
}

const GENERAL_LIMIT_POINTS = Number(process.env.RATE_LIMIT_GENERAL_POINTS || 10);
const GENERAL_LIMIT_DURATION = Number(process.env.RATE_LIMIT_GENERAL_DURATION || 1);
const AUTH_LIMIT_POINTS = Number(process.env.RATE_LIMIT_AUTH_POINTS || 5);
const AUTH_LIMIT_DURATION = Number(process.env.RATE_LIMIT_AUTH_DURATION || 60);

/**
 * General API rate limiter
 * Use for general endpoints
 */
const generalRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:general",
  points: GENERAL_LIMIT_POINTS,
  duration: GENERAL_LIMIT_DURATION,
  blockDuration: 1, // seconds
  inMemoryBlockOnConsumed: 100, // Keep last 100 consumption data in memory
});

/**
 * Strict rate limiter for auth endpoints
 * Use for signup, login, password reset
 */
const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:auth",
  points: AUTH_LIMIT_POINTS,
  duration: AUTH_LIMIT_DURATION,
  blockDuration: 1, // seconds
});

/**
 * General API limiter middleware
 * Apply to most routes
 */
export const apiLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = getClientIdentifier(req);
    const rlRes = await generalRateLimiter.consume(identifier);
    res.setHeader("X-RateLimit-Limit", String(GENERAL_LIMIT_POINTS));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(rlRes.remainingPoints, 0)));
    next();
  } catch (error: unknown) {
    if (isRateLimitRejection(error)) {
      logger.warn(
        { type: "general", ip: req.ip, path: req.path, retryAfter: error.msBeforeNext },
        "Rate limit exceeded"
      );
      const retryAfterSeconds = Math.ceil(error.msBeforeNext / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Too many requests",
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    // Fail open on Redis/internal errors so healthy requests are not blocked.
    logger.error({ error, ip: req.ip, path: req.path }, "Rate limiter internal error; allowing request");
    next();
  }
};

/**
 * Strict auth endpoint limiter
 * Apply to: signup, login, password reset, forgot-password
 */
export const authLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = getClientIdentifier(req);
    const rlRes = await authRateLimiter.consume(identifier);
    res.setHeader("X-RateLimit-Limit", String(AUTH_LIMIT_POINTS));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(rlRes.remainingPoints, 0)));
    next();
  } catch (error: unknown) {
    if (isRateLimitRejection(error)) {
      logger.warn(
        { type: "auth", ip: req.ip, path: req.path, retryAfter: error.msBeforeNext },
        "Auth rate limit exceeded"
      );
      const retryAfterSeconds = Math.ceil(error.msBeforeNext / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Too many attempts. Please try again later.",
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    // Fail open on Redis/internal errors so auth flow is not broken by infra blips.
    logger.error({ error, ip: req.ip, path: req.path }, "Auth rate limiter internal error; allowing request");
    next();
  }
};

/**
 * Create custom limiter for specific use cases
 */
export function createCustomLimiter(
  keyPrefix: string,
  points: number,
  duration: number
) {
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points,
    duration,
  });
}