import { appMetrics, tracer, logger, SpanStatusCode } from "../observability";


export async function traceDbQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>,
): Promise<T> {
  const span = tracer.startSpan(`db.${operation}`, {
    attributes: {
      'db.system':    'postgresql',
      'db.operation': operation,
      'db.table':     table,
    },
  });
 
  const start = Date.now();
  try {
    const result = await fn();
    appMetrics.dbQueryDuration.record(Date.now() - start, { operation, table, success: 'true' });
    return result;
  } catch (err: any) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    appMetrics.dbQueryDuration.record(Date.now() - start, { operation, table, success: 'false' });
    logger.error({ type: 'db_error', operation, table, error: err.message }, 'DB query failed');
    throw err;
  } finally {
    span.end();
  }
}