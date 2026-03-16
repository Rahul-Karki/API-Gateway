import type { RequestLog, Metrics } from "../types/metrics"

export function calculateMetrics(logs: RequestLog[]): Metrics {

  let success = 0
  let unauthorized = 0
  let rateLimited = 0
  let cacheHit = 0
  let cacheMiss = 0
  let totalLatency = 0

  logs.forEach(log => {

    totalLatency += log.latency

    if (log.status === 200) success++
    if (log.status === 401) unauthorized++
    if (log.status === 429) rateLimited++

    if (log.cache === "HIT") cacheHit++
    if (log.cache === "MISS") cacheMiss++

  })

  return {
    totalRequests: logs.length,
    success,
    unauthorized,
    rateLimited,
    cacheHit,
    cacheMiss,
    avgLatency: logs.length ? totalLatency / logs.length : 0
  }

}