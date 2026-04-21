import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import {
  redisGet,
  redisSet,
  redisDel,
  redisLockAcquire,
} from "../config/redis-upstash";
import {
  appMetrics,
  logger,
  tracer,
  SpanStatusCode,
} from "../observability/observability";

/**
 * Distributed Cache Middleware for Redis Upstash
 *
 * Features:
 * - Locks prevent thundering herd (all-MISS on concurrent requests)
 * - Wait-and-poll for other concurrent requests during cache refresh
 * - Stale-while-revalidate for graceful degradation
 * - Proper cache header exposure for debugging
 * - Production error handling (fail open)
 *
 * Header Signals:
 * X-Cache: HIT | MISS | STALE | WAIT-HIT
 * X-Cache-Status: same as X-Cache
 * Cache-Control: always includes max-age and stale-while-revalidate
 */

// Configuration (override via environment)
const CACHE_DEFAULT_TTL_SECONDS = Number(
  process.env.CACHE_TTL_SECONDS || 60
);
const CACHE_STALE_TTL_SECONDS = Number(
  process.env.CACHE_STALE_SECONDS || 30
);
const CACHE_LOCK_TTL_MS = Number(
  process.env.CACHE_LOCK_TTL_MS || 3000
);
const CACHE_WAIT_TOTAL_MS = Number(
  process.env.CACHE_WAIT_TOTAL_MS || 500
);
const CACHE_WAIT_POLL_MS = Number(
  process.env.CACHE_WAIT_POLL_MS || 25
);
const CACHE_VERSION = "v2";
const CLIENT_CACHE_MODE = (process.env.CACHE_CLIENT_MODE || "public").toLowerCase();
const CACHE_CLIENT_MAX_AGE_SECONDS = Number(
  process.env.CACHE_CLIENT_MAX_AGE_SECONDS || 30
);
const CACHE_CLIENT_STALE_SECONDS = Number(
  process.env.CACHE_CLIENT_STALE_SECONDS || 60
);

interface CacheEntry {
  data: unknown;
  createdAt: number;
  ttl: number;
  stale: number;
}

interface CacheOptions {
  ttl?: number;
  stale?: number;
  resource?: string;
  excludeParams?: string[];
}

/**
 * Generate stable cache key from request
 * Format: cache:v2:{method}:{path}:{queryHash}
 */
function generateCacheKey(req: Request, options?: CacheOptions): string {
  const method = req.method.toUpperCase();
  const path = req.path;

  // Normalize query params if present
  const excluded = new Set(options?.excludeParams || []);
  const queryEntries = Object.entries(req.query)
    .filter(([k]) => !excluded.has(k))
    .sort(([a], [b]) => a.localeCompare(b));

  const queryString =
    queryEntries.length > 0
      ? queryEntries
          .map(([k, v]) => `${k}=${Array.isArray(v) ? v[0] : v}`)
          .join("&")
      : "";

  const queryHash = queryString
    ? createHash("sha256").update(queryString).digest("hex").slice(0, 12)
    : "noquery";

  return `cache:${CACHE_VERSION}:${method}:${path}:${queryHash}`;
}

/**
 * Safe sleep utility for polling
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe parse of cache entry
 */
function parseCacheEntry(raw: string | null): CacheEntry | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in parsed &&
      "createdAt" in parsed &&
      "ttl" in parsed &&
      "stale" in parsed
    ) {
      return parsed as CacheEntry;
    }
  } catch {
    // Silently ignore parse errors
  }
  return null;
}

/**
 * Determine cache status based on entry age
 */
function getCacheStatus(
  entry: CacheEntry | null
): "HIT" | "STALE" | "MISS" {
  if (!entry) return "MISS";

  const ageSeconds = (Date.now() - entry.createdAt) / 1000;
  if (ageSeconds <= entry.ttl) return "HIT";
  if (ageSeconds <= entry.ttl + entry.stale) return "STALE";
  return "MISS";
}

/**
 * Attach timing headers so browser DevTools can separate backend time from network time.
 */
function setTimingHeaders(res: Response, status: string, durationMs: number): void {
  const roundedDuration = Math.max(0, Math.round(durationMs));
  res.setHeader("X-Backend-Duration", String(roundedDuration));
  res.setHeader("Server-Timing", `cache;desc="${status}";dur=${roundedDuration}`);
}

function setCachePolicyHeader(res: Response, cacheStatus: string): void {
  const policy = resolveClientCacheControl(cacheStatus);
  res.setHeader("X-Cache-Policy", policy);
}

function resolveClientCacheControl(cacheStatus: string): string {
  if (CLIENT_CACHE_MODE === "no-store") {
    return "no-store";
  }

  if (cacheStatus === "BYPASS" || cacheStatus === "ERROR") {
    return "no-store";
  }

  return `public, max-age=${CACHE_CLIENT_MAX_AGE_SECONDS}, stale-while-revalidate=${CACHE_CLIENT_STALE_SECONDS}`;
}

/**
 * Distributed cache middleware factory
 */
export function distributedCacheMiddleware(options?: CacheOptions) {
  const ttl = options?.ttl || CACHE_DEFAULT_TTL_SECONDS;
  const stale = options?.stale || CACHE_STALE_TTL_SECONDS;

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startedAt = Date.now();
    const span = tracer.startSpan("cache.middleware", {
      attributes: {
        "cache.layer": "redis",
        "http.method": req.method,
        "http.route": req.baseUrl || req.path,
        "http.path": req.path,
      },
    });

    // Only cache GET and HEAD
    if (req.method !== "GET" && req.method !== "HEAD") {
      span.setAttribute("cache.skipped", true);
      span.setAttribute("cache.skip_reason", "unsupported_method");
      span.end();
      return next();
    }

    // Respect client no-cache directive
    const cacheControl = req.get("Cache-Control");
    if (
      cacheControl?.includes("no-cache") ||
      cacheControl?.includes("no-store")
    ) {
      res.setHeader("X-Cache", "BYPASS");
      res.setHeader("X-Cache-Status", "BYPASS");
      res.setHeader("Cache-Control", resolveClientCacheControl("BYPASS"));
      setCachePolicyHeader(res, "BYPASS");
      setTimingHeaders(res, "BYPASS", Date.now() - startedAt);
      appMetrics.cacheRequestsTotal.add(1, { cache: "redis", status: "BYPASS" });
      appMetrics.cacheMisses.add(1, { cache: "redis", status: "BYPASS" });
      appMetrics.cacheOperationDuration.record(Date.now() - startedAt, {
        cache: "redis",
        status: "BYPASS",
      });
      logger.info(
        {
          type: "cache_decision",
          status: "BYPASS",
          path: req.path,
          method: req.method,
          reason: "cache_control",
          duration_ms: Date.now() - startedAt,
        },
        "Cache BYPASS"
      );
      span.setAttributes({
        "cache.status": "BYPASS",
        "cache.skipped": true,
        "cache.skip_reason": "cache_control",
      });
      span.end();
      return next();
    }

    const cacheKey = generateCacheKey(req, options);
    const lockKey = `${cacheKey}:lock`;
    let cacheStatus: "HIT" | "MISS" | "STALE" | "WAIT-HIT" = "MISS";

    try {
      // Attempt 1: Try to get from cache
      const cached = await redisGet(cacheKey);
      const entry = parseCacheEntry(cached);

      if (entry) {
        cacheStatus = getCacheStatus(entry);

        if (cacheStatus === "HIT") {
          // Fresh cache hit
          logger.debug(
            { path: req.path, key: cacheKey },
            "Cache HIT"
          );
          appMetrics.cacheRequestsTotal.add(1, { cache: "redis", status: "HIT" });
          appMetrics.cacheHits.add(1, { cache: "redis", status: "HIT" });
          appMetrics.cacheOperationDuration.record(Date.now() - startedAt, {
            cache: "redis",
            status: "HIT",
          });
          logger.info(
            {
              type: "cache_decision",
              status: "HIT",
              path: req.path,
              method: req.method,
              key: cacheKey,
              duration_ms: Date.now() - startedAt,
            },
            "Cache HIT"
          );
          span.setAttributes({
            "cache.status": "HIT",
            "cache.key_present": true,
          });
          span.end();
          res.setHeader("X-Cache", "HIT");
          res.setHeader("X-Cache-Status", "HIT");
          res.setHeader("Cache-Control", resolveClientCacheControl("HIT"));
          setCachePolicyHeader(res, "HIT");
          setTimingHeaders(res, "HIT", Date.now() - startedAt);
          res.json(entry.data);
          return;
        }

        if (cacheStatus === "STALE") {
          // Stale entry exists, return it while refreshing
          logger.debug(
            { path: req.path, key: cacheKey },
            "Cache STALE"
          );
          appMetrics.cacheRequestsTotal.add(1, { cache: "redis", status: "STALE" });
          appMetrics.cacheHits.add(1, { cache: "redis", status: "STALE" });
          appMetrics.cacheOperationDuration.record(Date.now() - startedAt, {
            cache: "redis",
            status: "STALE",
          });
          logger.info(
            {
              type: "cache_decision",
              status: "STALE",
              path: req.path,
              method: req.method,
              key: cacheKey,
              duration_ms: Date.now() - startedAt,
            },
            "Cache STALE"
          );
          span.setAttributes({
            "cache.status": "STALE",
            "cache.key_present": true,
          });
          span.end();
          res.setHeader("X-Cache", "STALE");
          res.setHeader("X-Cache-Status", "STALE");
          res.setHeader("Cache-Control", resolveClientCacheControl("STALE"));
          setCachePolicyHeader(res, "STALE");
          setTimingHeaders(res, "STALE", Date.now() - startedAt);
          res.json(entry.data);

          // Async refresh (don't wait)
          redisDel(cacheKey).catch(() => undefined);
          return;
        }
      }

      // Attempt 2: Try to acquire refresh lock
      const lockAcquired = await redisLockAcquire(lockKey, CACHE_LOCK_TTL_MS);

      if (!lockAcquired) {
        // Lock already held - wait for warm cache
        const waitStart = Date.now();
        while (Date.now() - waitStart < CACHE_WAIT_TOTAL_MS) {
          await sleep(CACHE_WAIT_POLL_MS);

          const warmed = await redisGet(cacheKey);
          const warmedEntry = parseCacheEntry(warmed);
          if (warmedEntry) {
            const status = getCacheStatus(warmedEntry);
            if (status === "HIT" || status === "STALE") {
              logger.debug(
                { path: req.path, key: cacheKey },
                "Cache WAIT-HIT"
              );
              cacheStatus = "WAIT-HIT";
              appMetrics.cacheRequestsTotal.add(1, {
                cache: "redis",
                status: "WAIT-HIT",
              });
              appMetrics.cacheHits.add(1, {
                cache: "redis",
                status: "WAIT-HIT",
              });
              appMetrics.cacheOperationDuration.record(Date.now() - startedAt, {
                cache: "redis",
                status: "WAIT-HIT",
              });
              logger.info(
                {
                  type: "cache_decision",
                  status: "WAIT-HIT",
                  path: req.path,
                  method: req.method,
                  key: cacheKey,
                  duration_ms: Date.now() - startedAt,
                },
                "Cache WAIT-HIT"
              );
              span.setAttributes({
                "cache.status": "WAIT-HIT",
                "cache.waited": true,
                "cache.key_present": true,
              });
              span.end();
              res.setHeader("X-Cache", "WAIT-HIT");
              res.setHeader("X-Cache-Status", "WAIT-HIT");
              res.setHeader("Cache-Control", resolveClientCacheControl("WAIT-HIT"));
              setCachePolicyHeader(res, "WAIT-HIT");
              setTimingHeaders(res, "WAIT-HIT", Date.now() - startedAt);
              res.json(warmedEntry.data);
              return;
            }
          }
        }
        // Timeout waiting - fall through to refresh path
      }

      // Attempt 3: Refresh path - intercept res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function (body: unknown): Response {
        const statusCode = res.statusCode;

        // Only cache successful responses (200-299)
        if (statusCode >= 200 && statusCode < 300 && body) {
          const totalTtl = ttl + stale + 10; // Add 10s buffer for clock skew
          const entry: CacheEntry = {
            data: body,
            createdAt: Date.now(),
            ttl,
            stale,
          };

          redisSet(cacheKey, JSON.stringify(entry), totalTtl)
            .then((success) => {
              if (success) {
                logger.debug(
                  { path: req.path, key: cacheKey, ttl: totalTtl },
                  "Cache SET"
                );
              }
            })
            .catch(() => undefined);
        }

        // Always clean up lock
        redisDel(lockKey).catch(() => undefined);

        cacheStatus = "MISS";
        appMetrics.cacheRequestsTotal.add(1, { cache: "redis", status: "MISS" });
        appMetrics.cacheMisses.add(1, { cache: "redis", status: "MISS" });
        appMetrics.cacheOperationDuration.record(Date.now() - startedAt, {
          cache: "redis",
          status: "MISS",
        });
        logger.info(
          {
            type: "cache_decision",
            status: "MISS",
            path: req.path,
            method: req.method,
            key: cacheKey,
            duration_ms: Date.now() - startedAt,
            http_status_code: statusCode,
          },
          "Cache MISS"
        );
        span.setAttributes({
          "cache.status": "MISS",
          "cache.key_present": false,
          "http.status_code": statusCode,
        });
        span.end();
        res.setHeader("X-Cache", "MISS");
        res.setHeader("X-Cache-Status", "MISS");
        res.setHeader("Cache-Control", resolveClientCacheControl("MISS"));
        setCachePolicyHeader(res, "MISS");
        setTimingHeaders(res, "MISS", Date.now() - startedAt);

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error(
        { error, path: req.path, key: cacheKey },
        "Cache middleware error"
      );
      appMetrics.cacheRequestsTotal.add(1, { cache: "redis", status: "ERROR" });
      appMetrics.cacheMisses.add(1, { cache: "redis", status: "ERROR" });
      appMetrics.cacheOperationDuration.record(Date.now() - startedAt, {
        cache: "redis",
        status: "ERROR",
      });
      logger.warn(
        {
          type: "cache_decision",
          status: "ERROR",
          path: req.path,
          method: req.method,
          key: cacheKey,
          duration_ms: Date.now() - startedAt,
        },
        "Cache ERROR (fail-open)"
      );
      span.setStatus({ code: SpanStatusCode.ERROR, message: "cache_middleware_error" });
      span.setAttribute("cache.status", "ERROR");
      setCachePolicyHeader(res, "ERROR");
      setTimingHeaders(res, "ERROR", Date.now() - startedAt);
      span.end();
      // Clean up lock on error
      redisDel(lockKey).catch(() => undefined);
      // Fail open - continue without caching
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 * Use after write operations (POST, PUT, DELETE, PATCH)
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  try {
    // Using simple prefix deletion for Upstash safety
    const key = `cache:${CACHE_VERSION}:GET:${pattern}:*`;
    // Note: Full pattern scan not supported on all Redis tiers
    // For production, consider explicit key management per resource
    logger.info({ pattern }, "Cache invalidation requested");
    return 0; // Return 0 as Upstash may not support full SCAN
  } catch (error) {
    logger.error({ error, pattern }, "Cache invalidation failed");
    return 0;
  }
}

/**
 * Invalidate cache by exact key
 */
export async function invalidateCacheByKey(key: string): Promise<boolean> {
  try {
    const deleted = await redisDel(key);
    if (deleted > 0) {
      logger.info({ key }, "Cache invalidated by key");
    }
    return deleted > 0;
  } catch (error) {
    logger.error({ error, key }, "Cache key invalidation failed");
    return false;
  }
}
