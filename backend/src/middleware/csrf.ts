import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import { setCsrfCookie } from '../auth/utils/cookieOptions';

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_ROUTES = new Set([
  'POST:/auth/signup',
  'POST:/auth/login',
  'POST:/auth/google-login',
  'POST:/auth/forgot-password',
  'POST:/auth/reset-password',
  'POST:/auth/resend',
  'POST:/auth/logout',
  'POST:/refresh',
]);

function normalizeToken(token: unknown): string {
  if (typeof token !== 'string') {
    return '';
  }

  return token.trim();
}

function issueCsrfToken(req: Request, res: Response): string {
  const existing = normalizeToken(req.cookies?.[CSRF_COOKIE_NAME]);
  if (existing) {
    return existing;
  }

  const token = crypto.randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  return token;
}

export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction): void {
  issueCsrfToken(req, res);
  next();
}

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const routeKey = `${req.method.toUpperCase()}:${req.path}`;
  if (CSRF_EXEMPT_ROUTES.has(routeKey)) {
    next();
    return;
  }

  const cookieToken = normalizeToken(req.cookies?.[CSRF_COOKIE_NAME]);
  const headerToken = normalizeToken(req.get(CSRF_HEADER_NAME));

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      message: 'CSRF token validation failed',
    });
    return;
  }

  next();
}
