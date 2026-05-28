import { NextFunction, Request, Response } from 'express';

const GATEWAY_SECRET_HEADER = 'x-gateway-secret';

function normalizeHeader(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function getGatewaySecret(): string {
  const secret = process.env.GATEWAY_INTERNAL_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('GATEWAY_INTERNAL_SECRET must be set in production');
  }
  return secret || '';
}

export function gatewayOnlyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const gatewaySecret = getGatewaySecret();
  if (!gatewaySecret) {
    next();
    return;
  }

  const providedSecret = normalizeHeader(req.get(GATEWAY_SECRET_HEADER));
  if (providedSecret !== gatewaySecret) {
    res.status(403).json({
      message: 'Forbidden: requests must come through the API gateway',
    });
    return;
  }

  next();
}