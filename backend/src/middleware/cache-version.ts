import { Request, Response, NextFunction } from "express";
import { redisGet, redisIncr } from "../config/redis-upstash";
import { logger } from "../observability/observability";

const CACHE_VERSION_PREFIX = "cache:version";

function getVersionKey(scope: string): string {
  return `${CACHE_VERSION_PREFIX}:${scope}`;
}

async function readVersion(scope: string): Promise<number> {
  try {
    const value = await redisGet(getVersionKey(scope));
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch (error) {
    logger.error({ error, scope }, "Failed to read cache version");
    return 0;
  }
}

async function bumpVersion(scope: string): Promise<number> {
  try {
    const version = await redisIncr(getVersionKey(scope));
    return version ?? 0;
  } catch (error) {
    logger.error({ error, scope }, "Failed to bump cache version");
    return 0;
  }
}

export function attachCacheVersionHeader(scope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const version = await readVersion(scope);
    res.setHeader("X-Cache-Version", String(version));
    next();
  };
}

export function bumpCacheVersionOnWrite(scope: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }

    const version = await bumpVersion(scope);
    res.setHeader("X-Cache-Version", String(version));
    next();
  };
}
