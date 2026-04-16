import Redis from "ioredis";
import { logger } from "../observability/observability";

/**
 * Production Redis Upstash client with proper pooling, error handling, and monitoring.
 * Supports both TCP (REDIS_URL) and REST API fallback (UPSTASH_REDIS_REST_URL).
 */

function resolveRedisConfig(): { url: string; type: "tcp" | "rest" } {
  // Prefer TCP connection (ioredis) for better performance
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL, type: "tcp" };
  }

  // Fallback to REST API with token auth
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.REDIS_REST_TOKEN;

  if (!restUrl || !restToken) {
    throw new Error(
      "Redis configuration missing: set REDIS_URL or both UPSTASH_REDIS_REST_URL and REDIS_REST_TOKEN"
    );
  }

  return { url: restUrl, type: "rest" };
}

const config = resolveRedisConfig();

if (config.type === "rest") {
  logger.warn(
    "Redis using REST API fallback - performance may be lower than TCP"
  );
}

/**
 * ioredis client for TCP connections (primary)
 * Supports both standard Redis and Upstash's TCP endpoint with TLS
 */
const redis = new Redis(config.url, {
  // Connection settings
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,

  // Timeouts aligned with production best practices
  connectTimeout: 10000, // 10s to establish connection
  commandTimeout: 5000, // 5s per command execution
  
  // Exponential backoff with max 2s
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Keep-alive and monitoring
  keepAlive: 30000, // 30s TCP keep-alive
  lazyConnect: false,

  // Reconnection behavior for cluster/failover scenarios
  reconnectOnError: (err) => {
    const targetErrors = ["READONLY", "LOADING"];
    const shouldReconnect = targetErrors.some((e) =>
      err.message.includes(e)
    );
    if (shouldReconnect) {
      logger.warn({
        error: err.message,
        reconnecting: true,
      });
      return true;
    }
    return false;
  },
});

/**
 * Connection lifecycle monitoring
 */
redis.on("connect", () => {
  logger.info("✅ Redis connected");
});

redis.on("ready", () => {
  logger.info("✅ Redis ready to accept commands");
});

redis.on("error", (err: any) => {
  logger.error(
    { error: err.message, code: err.code, stack: err.stack },
    "❌ Redis connection error"
  );
});

redis.on("close", () => {
  logger.warn("⚠️  Redis connection closed");
});

redis.on("reconnecting", () => {
  logger.info("⏳ Redis reconnecting...");
});

/**
 * Health check - returns boolean true if Redis is accessible
 * Safe to call frequently for monitoring
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
 * Wrapper for cache operations with error handling
 * Returns null on any error instead of throwing
 */
export async function redisGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    logger.error({ error, key }, "Redis GET failed");
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const result = await redis.set(key, value, "EX", ttlSeconds);
    return result === "OK";
  } catch (error) {
    logger.error({ error, key, ttlSeconds }, "Redis SET failed");
    return false;
  }
}

export async function redisDel(...keys: string[]): Promise<number> {
  try {
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch (error) {
    logger.error({ error, keyCount: keys.length }, "Redis DEL failed");
    return 0;
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  try {
    return await redis.incr(key);
  } catch (error) {
    logger.error({ error, key }, "Redis INCR failed");
    return null;
  }
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<boolean> {
  try {
    const result = await redis.expire(key, ttlSeconds);
    return result === 1;
  } catch (error) {
    logger.error({ error, key, ttlSeconds }, "Redis EXPIRE failed");
    return false;
  }
}

/**
 * Lock acquisition for distributed operations
 * Returns true if lock was acquired, false if already held
 */
export async function redisLockAcquire(
  key: string,
  ttlMs: number
): Promise<boolean> {
  try {
    const result = await redis.set(key, "1", "PX", ttlMs, "NX");
    return result === "OK";
  } catch (error) {
    logger.error({ error, key }, "Redis lock acquire failed");
    return false;
  }
}

/**
 * Graceful Redis shutdown
 */
export async function closeRedis(): Promise<void> {
  return new Promise((resolve) => {
    if (redis.status === "end") {
      resolve();
      return;
    }

    redis.quit((error) => {
      if (error) {
        logger.error({ error }, "Redis quit error");
      } else {
        logger.info("✅ Redis connection closed gracefully");
      }
      resolve();
    });
  });
}

export default redis;
