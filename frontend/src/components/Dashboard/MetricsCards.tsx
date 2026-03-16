import type { Metrics } from "../../types/metrics"

export default function MetricsCards({ metrics }: { metrics: Metrics }) {

  return (

    <div>

      <h3>Total Requests: {metrics.totalRequests}</h3>
      <h3>Success: {metrics.success}</h3>
      <h3>Unauthorized: {metrics.unauthorized}</h3>
      <h3>Rate Limited: {metrics.rateLimited}</h3>
      <h3>Cache Hit: {metrics.cacheHit}</h3>
      <h3>Cache Miss: {metrics.cacheMiss}</h3>
      <h3>Avg Latency: {metrics.avgLatency.toFixed(2)} ms</h3>

    </div>

  )

}