import { RateLimiterRedis } from "rate-limiter-flexible";
import { Request, Response, NextFunction } from "express";
import redis from "../config/redis";
import { logger } from "../observability/observability";

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

/**
 * General API rate limiter - 100 req/min
 * Use for general endpoints
 */
const generalRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:general",
  points: 100,
  duration: 60,
  blockDuration: 60, // seconds
  inMemoryBlockOnConsumed: 100, // Keep last 100 consumption data in memory
});

/**
 * Strict rate limiter for auth endpoints - 5 req/min
 * Use for signup, login, password reset
 */
const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:auth",
  points: 5,
  duration: 60,
  blockDuration: 300, // seconds
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
    res.setHeader("X-RateLimit-Limit", "100");
    res.setHeader("X-RateLimit-Remaining", String(Math.max(rlRes.remainingPoints, 0)));
    next();
  } catch (error: any) {
    logger.warn(
      { type: "general", ip: req.ip, path: req.path, retryAfter: error.msBeforeNext },
      "Rate limit exceeded"
    );
    res.status(429).json({
      error: "Too many requests",
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    });
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
    res.setHeader("X-RateLimit-Limit", "5");
    res.setHeader("X-RateLimit-Remaining", String(Math.max(rlRes.remainingPoints, 0)));
    next();
  } catch (error: any) {
    logger.warn(
      { type: "auth", ip: req.ip, path: req.path, retryAfter: error.msBeforeNext },
      "Auth rate limit exceeded"
    );
    res.status(429).json({
      error: "Too many attempts. Please try again later.",
      retryAfter: Math.ceil(error.msBeforeNext / 1000),
    });
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