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

// ─── Config ──────────────────────────────────────────────────────────────────

const GRAFANA_OTLP_ENDPOINT = process.env.GRAFANA_OTLP_ENDPOINT!;     // e.g. https://otlp-gateway-prod-us-east-0.grafana.net/otlp
const GRAFANA_INSTANCE_ID  = process.env.GRAFANA_INSTANCE_ID!;         // Grafana Cloud stack ID
const GRAFANA_API_TOKEN    = process.env.GRAFANA_API_TOKEN!;            // Grafana Cloud API token
const SERVICE_NAME         = process.env.SERVICE_NAME || 'my-backend';
const SERVICE_VERSION      = process.env.SERVICE_VERSION || '1.0.0';
const NODE_ENV             = process.env.NODE_ENV || 'production';

const AUTH_HEADER = Buffer
  .from(`${GRAFANA_INSTANCE_ID}:${GRAFANA_API_TOKEN}`)
  .toString('base64');

const OTLP_HEADERS = {
  Authorization: `Basic ${AUTH_HEADER}`,
};

// ─── Shared Resource ─────────────────────────────────────────────────────────

const resource = new Resource({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  'deployment.environment': NODE_ENV,
});
// ─── Metrics (Prometheus / OTLP → Grafana Cloud) ────────────────────────────

const metricExporter = new OTLPMetricExporter({
  url: `${GRAFANA_OTLP_ENDPOINT}/v1/metrics`,
  headers: OTLP_HEADERS,
});

export const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15_000,   // push every 15 s
    }),
  ],
});

const meter = meterProvider.getMeter(SERVICE_NAME);

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

const traceExporter = new OTLPTraceExporter({
  url: `${GRAFANA_OTLP_ENDPOINT}/v1/traces`,
  headers: OTLP_HEADERS,
});

export const tracerProvider = new NodeTracerProvider({ resource });
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
tracerProvider.register();

export const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

// ─── Structured Logger (Pino → Grafana Cloud Loki) ───────────────────────────
// Logs are shipped by Promtail / alloy agent — see docker/alloy-config.alloy
// Pino outputs JSON; Alloy picks it up from stdout/file and forwards to Loki.

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    env: NODE_ENV,
  },
  formatters: {
    level(label) { return { level: label }; },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────

export async function shutdownObservability() {
  await Promise.all([
    meterProvider.shutdown(),
    tracerProvider.shutdown(),
  ]);
}

process.on('SIGTERM', async () => {
  await shutdownObservability();
  process.exit(0);
});

export { trace, metrics, context, SpanStatusCode };