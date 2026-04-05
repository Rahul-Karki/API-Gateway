/**
 * observability.ts
 * Central observability setup for TypeScript backend.
 * Handles: Prometheus metrics, structured logging (Loki), and OpenTelemetry traces.
 */

import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, metrics, context, SpanStatusCode } from '@opentelemetry/api';
import pino from 'pino';
import type { LokiOptions } from 'pino-loki';

// ─── Config ──────────────────────────────────────────────────────────────────

const GRAFANA_OTLP_ENDPOINT = process.env.GRAFANA_OTLP_ENDPOINT || '';
const OPTL_INSTANCE_ID     = process.env.OPTL_INSTANCE_ID || '';
const GRAFANA_API_TOKEN    = process.env.GRAFANA_API_TOKEN || '';
const SERVICE_NAME         = process.env.SERVICE_NAME || 'my-backend';
const SERVICE_VERSION      = process.env.SERVICE_VERSION || '1.0.0';
const NODE_ENV             = process.env.NODE_ENV || 'production';
const GRAFANA_LOKI_URL     = process.env.GRAFANA_LOKI_URL || '';
const LOKI_INSTANCE_ID     = process.env.LOKI_INSTANCE_ID || '';

const AUTH_HEADER = OPTL_INSTANCE_ID && GRAFANA_API_TOKEN
  ? Buffer.from(`${OPTL_INSTANCE_ID}:${GRAFANA_API_TOKEN}`).toString('base64')
  : '';

// ─── Shared Resource ─────────────────────────────────────────────────────────

const resource = new Resource({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  'deployment.environment': NODE_ENV,
});

// ─── Metrics (Prometheus / OTLP → Grafana Cloud) ────────────────────────────

let meterProvider: MeterProvider | null = null;
let meter: any = null;

if (GRAFANA_OTLP_ENDPOINT && AUTH_HEADER) {
  console.log('✅ Grafana OTLP Metrics enabled:', GRAFANA_OTLP_ENDPOINT);
  const metricExporter = new OTLPMetricExporter({
    url: `${GRAFANA_OTLP_ENDPOINT}/v1/metrics`,
    headers: { Authorization: `Basic ${AUTH_HEADER}` },
  });

  meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 15_000,
      }),
    ],
  });
  
  meter = meterProvider.getMeter(SERVICE_NAME);
} else {
  console.log('⚠️  Grafana OTLP Metrics NOT configured.');
  // Create a no-op meter provider
  meterProvider = new MeterProvider({ resource });
  meter = meterProvider.getMeter(SERVICE_NAME);
}

export { meterProvider };

// Built-in application metrics
export const appMetrics = {
  httpRequestsTotal:   meter.createCounter('http_requests_total',       { description: 'Total HTTP requests' }),
  httpRequestDuration: meter.createHistogram('http_request_duration_ms', { description: 'HTTP request duration in ms', unit: 'ms' }),
  httpErrorsTotal:     meter.createCounter('http_errors_total',          { description: 'Total HTTP errors' }),
  activeConnections:   meter.createUpDownCounter('active_connections',   { description: 'Active connections' }),
  dbQueryDuration:     meter.createHistogram('db_query_duration_ms',     { description: 'DB query duration in ms', unit: 'ms' }),
  cacheHits:           meter.createCounter('cache_hits_total',           { description: 'Cache hits' }),
  cacheMisses:         meter.createCounter('cache_misses_total',         { description: 'Cache misses' }),
  queueSize:           meter.createObservableGauge('queue_size',         { description: 'Current queue size' }),
};

// ─── Traces (OTLP → Grafana Cloud Tempo) ────────────────────────────────────

let tracerProvider: NodeTracerProvider;

if (GRAFANA_OTLP_ENDPOINT && AUTH_HEADER) {
  console.log('✅ Grafana OTLP Traces enabled:', GRAFANA_OTLP_ENDPOINT);
  const traceExporter = new OTLPTraceExporter({
    url: `${GRAFANA_OTLP_ENDPOINT}/v1/traces`,
    headers: { Authorization: `Basic ${AUTH_HEADER}` },
  });
  tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [new SimpleSpanProcessor(traceExporter)],
  });
} else {
  console.log('⚠️  Grafana OTLP Traces NOT configured.');
  tracerProvider = new NodeTracerProvider({ resource });
}

tracerProvider.register();

export { tracerProvider };

export const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

// ─── Structured Logger (Pino) ────────────────────────────────────────────────


const transportTargets: pino.TransportTargetOptions[] = [];

// ✅ Always log to stdout (Render logs)
transportTargets.push({
  target: 'pino/file',
  level: process.env.LOG_LEVEL || 'info',
  options: {
    destination: 1, // stdout
  },
});


// ✅ Add Loki ONLY if properly configured
if (GRAFANA_LOKI_URL && LOKI_INSTANCE_ID && GRAFANA_API_TOKEN) {
  console.log('✅ Grafana Loki enabled:', GRAFANA_LOKI_URL);

  transportTargets.push({
    target: 'pino-loki',
    level: process.env.LOG_LEVEL || 'info',
    options: {
      host: 'https://logs-prod-028.grafana.net', // ✅ FIXED
      basicAuth: {
        username: LOKI_INSTANCE_ID,
        password: GRAFANA_API_TOKEN,
      },
      labels: {
        service: SERVICE_NAME || 'unknown-service',
        version: SERVICE_VERSION || '1.0.0',
        env: NODE_ENV || 'development',
      },
      batching: {
        interval: 5000,
      },
      silenceErrors: false,
    } as LokiOptions,
  });
} else {
  console.warn('⚠️ Loki not configured — using stdout only');
}

// ✅ Create transport
const transport = pino.transport({
  targets: transportTargets,
});

// ✅ Logger instance
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      env: NODE_ENV,
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

// ─── Graceful shutdown ───────────────────────────────────────────────────────

export async function shutdownObservability() {
  await Promise.all([
    meterProvider?.shutdown(),
    tracerProvider?.shutdown(),
  ]);
}

process.on('SIGTERM', async () => {
  await shutdownObservability();
  process.exit(0);
});

export { trace, metrics, context, SpanStatusCode };