import { logger } from "../observability";
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error({
    type:       'unhandled_error',
    error:      err.message,
    stack:      err.stack,
    method:     req.method,
    path:       req.originalUrl,
    trace_id:   res.locals.span?.spanContext().traceId,
  }, 'Unhandled error');
 
  res.status(500).json({ error: 'Internal Server Error' });
}