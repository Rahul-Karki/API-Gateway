import { Request, Response, NextFunction } from "express";

/**
 * Category B (semi-dynamic):
 * - Browser should revalidate every time (max-age=0)
 * - Shared edge cache (CDN) can keep warm copy for 5 min
 */
export function semiDynamicEdgeCachePolicy(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const policy = "public, max-age=0, s-maxage=300, stale-while-revalidate=3600";
  res.setHeader("Cache-Control", policy);
  // Explicit CDN hint for providers that honor separate shared cache control.
  res.setHeader("CDN-Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("Vary", "X-Cache-Version, Accept-Encoding");
  next();
}

/**
 * Category C (dynamic):
 * - Never cache client/shared intermediaries
 */
export function dynamicNoStorePolicy(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader("Cache-Control", "no-store, private");
  next();
}
