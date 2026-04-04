import Redis from "ioredis";
import { logger } from "../observability/observability";

/**
 * Production-ready Redis client with proper pooling and error handling
 * Reused across rate limiting and caching middlewares
 */
function resolveRedisUrl(): string {
  // Preferred explicit URL for self-hosted/managed Redis.
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  // Upstash REST credentials fallback.
  // UPSTASH_REDIS_REST_URL is HTTPS, but ioredis needs rediss:// on Redis TCP port.
  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisRestToken = process.env.REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!upstashRestUrl || !redisRestToken) {
    throw new Error(
      "Redis configuration missing: set REDIS_URL or both UPSTASH_REDIS_REST_URL and REDIS_REST_TOKEN (Upstash)"
    );
  }

  const parsed = new URL(upstashRestUrl);
  const host = parsed.hostname;
  const port = process.env.UPSTASH_REDIS_PORT || parsed.port || "6379";
  const username = "default";
  const password = encodeURIComponent(redisRestToken);

  return `rediss://${username}:${password}@${host}:${port}`;
}

const redisUrl = resolveRedisUrl();

if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const redis = new Redis(redisUrl, {
  // Connection pooling
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,

  // Timeouts (aligned with Node.js best practices)
  connectTimeout: 10000, // 10s to establish connection
  commandTimeout: 5000, // 5s per command execution
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000); // Max 2s backoff
    return delay;
  },

  // Monitoring & keepalive
  keepAlive: 30000, // 30s TCP keepalive
  lazyConnect: false,

  // Reconnection behavior
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true; // Reconnect on read-only error
    }
    return false;
  },
});

/**
 * Connection lifecycle events
 */
redis.on("connect", () => {
  logger.info("✅ Redis connected");
});

redis.on("ready", () => {
  logger.info("✅ Redis ready to accept commands");
});

redis.on("error", (err : any) => {
 logger.warn({ error: err.message, stack: err.stack }, "Redis connection error");
});

redis.on("close", () => {
  logger.warn("⚠️ Redis connection closed");
});

redis.on("reconnecting", () => {
  logger.info("⏳ Redis reconnecting...");
});

/**
 * Health check function
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch (error) {
    logger.error({ error }, "Redis health check failed");
    return false;
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  return new Promise((resolve) => {
    redis.quit(() => {
      logger.info("✅ Redis connection closed gracefully");
      resolve();
    });
  });
}

export default redis;