export interface Metrics {
    totalRequests: number;
    success: number;
    unauthorized: number;
    rateLimited: number;
    cacheHit: number,
    cacheMiss: number;
    avgLatency: number;
}

export interface RequestLog {
    cache: string;
    id: number;
    status: number;
    cacheStatus: string;
    latency: number;
}

