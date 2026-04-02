import { appMetrics } from "../observability";

export function recordCacheResult(hit: boolean, cache: string = 'redis') {
  if (hit) {
    appMetrics.cacheHits.add(1, { cache });
  } else {
    appMetrics.cacheMisses.add(1, { cache });
  }
}