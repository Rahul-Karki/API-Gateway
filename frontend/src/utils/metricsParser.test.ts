import { describe, expect, it } from 'vitest';

import { calculateMetrics } from './metricsParser';

describe('calculateMetrics', () => {
  it('calculates metrics correctly for mixed outcomes', () => {
    const logs = [
      { status: 200, cache: 'HIT', latency: 100 },
      { status: 401, cache: 'MISS', latency: 200 },
      { status: 429, cache: '-', latency: 300 },
      { status: 200, cache: 'MISS', latency: 400 },
    ] as any;

    const metrics = calculateMetrics(logs);

    expect(metrics.totalRequests).toBe(4);
    expect(metrics.success).toBe(2);
    expect(metrics.unauthorized).toBe(1);
    expect(metrics.rateLimited).toBe(1);
    expect(metrics.cacheHit).toBe(1);
    expect(metrics.cacheMiss).toBe(2);
    expect(metrics.avgLatency).toBe(250);
  });

  it('returns zeroed metrics for empty logs', () => {
    const metrics = calculateMetrics([] as any);

    expect(metrics.totalRequests).toBe(0);
    expect(metrics.success).toBe(0);
    expect(metrics.unauthorized).toBe(0);
    expect(metrics.rateLimited).toBe(0);
    expect(metrics.cacheHit).toBe(0);
    expect(metrics.cacheMiss).toBe(0);
    expect(metrics.avgLatency).toBe(0);
  });
});
