import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import redis from "../config/redis";
import { logger } from "../observability/observability";

const DEFAULT_TTL = 60; // seconds
const CACHE_VERSION = "v1";
const DEFAULT_STALE_SECONDS = Number(process.env.CACHE_STALE_SECONDS || 30);
const CACHE_TTL_JITTER_SECONDS = Number(process.env.CACHE_TTL_JITTER_SECONDS || 10);
const CACHE_SCAN_COUNT = Number(process.env.CACHE_SCAN_COUNT || 500);

type CacheOptions = {
  includeUser?: boolean;
  excludeParams?: string[];
  resource?: string;
  staleSeconds?: number;
};

type CacheEnvelope = {
  body: unknown;
  cachedAt: number;
  freshFor: number;
  staleFor: number;
};

function normalizeQuery(
  query: Request["query"],
  excludeParams: string[] = []
): string {
  const excluded = new Set(excludeParams);
  const entries = Object.entries(query)
    .filter(([key]) => !excluded.has(key))
    .map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return "";
  }

  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

function resolveResource(req: Request, options?: CacheOptions): string {
  if (options?.resource) {
    return options.resource;
  }

  const fromBaseUrl = req.baseUrl?.replace(/^\//, "").split("/")[1];
  if (fromBaseUrl) {
    return fromBaseUrl;
  }

  return "global";
}

/**
 * Cache key generation with options
 * Distributed-safe key format:
 * cache:{version}:{env}:{resource}:{method}:{sha256(path|query|vary)}
 */
function generateCacheKey(
  req: Request,
  options?: CacheOptions
): string {
  const env = process.env.NODE_ENV || "development";
  const resource = resolveResource(req, options);
  const method = req.method.toUpperCase();
  const path = `${req.baseUrl || ""}${req.path}`;
  const normalizedQuery = normalizeQuery(req.query, options?.excludeParams);

  let vary = "public";
  if (options?.includeUser) {
    vary = (req as any).userId ? `user:${(req as any).userId}` : "anon";
  }

  const fingerprint = createHash("sha256")
    .update(`${path}|${normalizedQuery || "noquery"}|${vary}`)
    .digest("hex")
    .slice(0, 24);

  return [
    "cache",
    CACHE_VERSION,
    env,
    resource,
    method,
    fingerprint,
  ].join(":");
}

/**
 * Production-ready cache middleware
 * - Only caches successful GET requests (200-202)
 * - Respects Cache-Control headers
 * - Includes error handling and logging
 * - Sets X-Cache headers for debugging
 */
export function cacheMiddleware(
  ttl: number = DEFAULT_TTL,
  options?: CacheOptions
) {
  const setCacheHeaders = (res: Response, status: string, cacheControl: string) => {
    res.setHeader("X-Cache-Status", status);
    res.setHeader("X-Cache", status);
    res.setHeader("Cache-Control", cacheControl);
  };

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Only cache GETs
    if (req.method !== "GET") {
      return next();
    }

    // Check for no-cache directive
    const cacheControl = req.get("Cache-Control");
    if (cacheControl?.includes("no-cache") || cacheControl?.includes("no-store")) {
      return next();
    }

    const cacheKey = generateCacheKey(req, options);
    const staleSeconds = options?.staleSeconds ?? DEFAULT_STALE_SECONDS;

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached) as CacheEnvelope | unknown;

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "body" in parsed &&
          "cachedAt" in parsed &&
          "freshFor" in parsed &&
          "staleFor" in parsed
        ) {
          const envelope = parsed as CacheEnvelope;
          const ageSeconds = Math.floor((Date.now() - envelope.cachedAt) / 1000);

          if (ageSeconds <= envelope.freshFor) {
            logger.debug({ path: req.path, key: cacheKey, ageSeconds }, "Cache HIT");
            setCacheHeaders(res, "HIT", `public, max-age=${ttl}`);
            res.json(envelope.body);
            return;
          }

          if (ageSeconds <= envelope.freshFor + envelope.staleFor) {
            logger.debug({ path: req.path, key: cacheKey, ageSeconds }, "Cache STALE");
            setCacheHeaders(res, "STALE", `public, max-age=${ttl}, stale-while-revalidate=${staleSeconds}`);
            res.json(envelope.body);

            // Force a refresh on the next request without blocking current response.
            redis.del(cacheKey).catch((error) =>
              logger.error({ error, key: cacheKey }, "Failed to clear stale cache key")
            );
            return;
          }
        } else {
          // Backward compatibility for old plain JSON cache values.
          logger.debug({ path: req.path, key: cacheKey }, "Cache HIT (legacy)");
          res.setHeader("X-Cache", "HIT");
          res.setHeader("Cache-Control", `public, max-age=${ttl}`);
          res.json(parsed);
          return;
        }
      }

      // Cache miss - patch res.json to write to cache
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown) {
        // Only cache successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          const jitter = CACHE_TTL_JITTER_SECONDS > 0
            ? Math.floor(Math.random() * (CACHE_TTL_JITTER_SECONDS + 1))
            : 0;
          const totalTtl = ttl + staleSeconds + jitter;
          const envelope: CacheEnvelope = {
            body,
            cachedAt: Date.now(),
            freshFor: ttl,
            staleFor: staleSeconds,
          };

          redis
            .set(cacheKey, JSON.stringify(envelope), "EX", totalTtl)
            .catch((error) =>
              logger.error({ error, key: cacheKey }, "Failed to cache response")
            );
        }

        setCacheHeaders(res, "MISS", `public, max-age=${ttl}, stale-while-revalidate=${staleSeconds}`);
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error({ error, key: cacheKey }, "Cache middleware error");
      // Fail open - continue without caching on error
      next();
    }
  };
}

/**
 * Cache invalidation by exact key
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  try {
    await redis.del(key);
    logger.info({ key }, "Cache invalidated");
  } catch (error) {
    logger.error({ error, key }, "Failed to invalidate cache");
  }
}

/**
 * Cache invalidation by pattern
 * Use with caution in production - can be slow with many keys
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  try {
    let cursor = "0";
    let deleted = 0;
    const BATCH_SIZE = 100;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        CACHE_SCAN_COUNT
      );
      cursor = nextCursor;

      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        if (batch.length > 0) {
          deleted += await redis.del(...batch);
        }
      }
    } while (cursor !== "0");

    logger.info({ pattern, count: deleted }, "Cache pattern invalidated");
    return deleted;
  } catch (error) {
    logger.error({ error, pattern }, "Failed to invalidate cache pattern");
    return 0;
  }
}

/**
 * Clear all cache
 * Only use during maintenance or tests
 */
export async function clearAllCache(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    logger.warn("clearAllCache called in production");
  }
  try {
    await redis.flushdb();
    logger.info("All cache cleared");
  } catch (error) {
    logger.error({ error }, "Failed to clear all cache");
  }
}

/**
 * Invalidate all cache entries for a resource (e.g. products)
 */
export async function invalidateResourceCache(resource: string): Promise<number> {
  return invalidateCachePattern(`cache:${CACHE_VERSION}:*:${resource}:*`);
}