import { Request, Response, NextFunction } from 'express';
import { appMetrics, tracer, logger, SpanStatusCode } from "../observability";
import { context, propagation } from '@opentelemetry/api';



// ─── HTTP Instrumentation Middleware ─────────────────────────────────────────
 
export function httpInstrumentation(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const route     = req.route?.path || req.path || 'unknown';
  const method    = req.method;
 
  // Extract trace context from upstream (e.g. nginx passes W3C headers)
  const extractedCtx = propagation.extract(context.active(), req.headers);
 
  // Start span
  const span = tracer.startSpan(
    `${method} ${route}`,
    {
      attributes: {
        'http.method':     method,
        'http.url':        req.originalUrl,
        'http.route':      route,
        'http.user_agent': req.headers['user-agent'] || '',
        'http.client_ip':  req.ip || '',
      },
    },
    extractedCtx,
  );
 
  appMetrics.activeConnections.add(1);
 
  // Attach span to response locals for use in route handlers
  res.locals.span = span;
 
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const status     = res.statusCode;
    const labels     = { method, route, status_code: String(status) };
 
    // Record metrics
    appMetrics.httpRequestsTotal.add(1, labels);
    appMetrics.httpRequestDuration.record(durationMs, labels);
    appMetrics.activeConnections.add(-1);
 
    if (status >= 400) {
      appMetrics.httpErrorsTotal.add(1, { ...labels, error_type: status >= 500 ? 'server' : 'client' });
    }
 
    // Finalize span
    span.setAttributes({
      'http.status_code':     status,
      'http.response_size':   Number(res.getHeader('content-length') || 0),
      'duration_ms':          durationMs,
    });
 
    if (status >= 500) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${status}` });
    }
    span.end();
 
    // Structured log per request
    const logFn = status >= 500 ? logger.error.bind(logger)
                : status >= 400 ? logger.warn.bind(logger)
                : logger.info.bind(logger);
 
    logFn({
      type:        'http_request',
      method,
      path:        req.originalUrl,
      route,
      status,
      duration_ms: durationMs,
      trace_id:    span.spanContext().traceId,
      span_id:     span.spanContext().spanId,
      user_agent:  req.headers['user-agent'],
      ip:          req.ip,
    }, `${method} ${route} ${status} ${durationMs}ms`);
  });
 
  next();
}