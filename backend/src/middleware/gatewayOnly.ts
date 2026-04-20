import { NextFunction, Request, Response } from 'express';

const GATEWAY_SECRET_HEADER = 'x-gateway-secret';
const GATEWAY_INTERNAL_SECRET = process.env.GATEWAY_INTERNAL_SECRET || 'gateway-only-access-9f2b7c0d4e3a';

function normalizeHeader(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export function gatewayOnlyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const providedSecret = normalizeHeader(req.get(GATEWAY_SECRET_HEADER));

  if (providedSecret !== GATEWAY_INTERNAL_SECRET) {
    res.status(403).json({
      message: 'Forbidden: requests must come through the API gateway',
    });
    return;
  }

  next();
}