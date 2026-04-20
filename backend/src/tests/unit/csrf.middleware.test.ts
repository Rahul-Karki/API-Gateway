import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setCsrfCookieMock } = vi.hoisted(() => ({
  setCsrfCookieMock: vi.fn(),
}));

vi.mock('../../auth/utils/cookieOptions', () => ({
  setCsrfCookie: setCsrfCookieMock,
}));

import { csrfCookieMiddleware, csrfProtectionMiddleware } from '../../middleware/csrf';

function createRes() {
  const status = vi.fn();
  const json = vi.fn();
  status.mockReturnValue({ json });
  return { status, json } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe('csrf middleware', () => {
  beforeEach(() => {
    setCsrfCookieMock.mockReset();
  });

  it('issues csrf cookie when missing', () => {
    const req = { cookies: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfCookieMiddleware(req, res, next);

    expect(setCsrfCookieMock).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not re-issue csrf cookie when token exists', () => {
    const req = { cookies: { csrfToken: 'already-present' } } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfCookieMiddleware(req, res, next);

    expect(setCsrfCookieMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows safe methods without csrf checks', () => {
    const req = { method: 'GET', path: '/products', cookies: {}, get: vi.fn() } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((res as any).status).not.toHaveBeenCalled();
  });

  it('allows exempt routes without csrf checks', () => {
    const req = { method: 'POST', path: '/refresh', cookies: {}, get: vi.fn() } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((res as any).status).not.toHaveBeenCalled();
  });

  it('rejects when csrf header is missing', () => {
    const req = {
      method: 'POST',
      path: '/products/create',
      cookies: { csrfToken: 'abc123' },
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfProtectionMiddleware(req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect((res as any).json).toHaveBeenCalledWith({ message: 'CSRF token validation failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when csrf header does not match cookie', () => {
    const req = {
      method: 'POST',
      path: '/products/create',
      cookies: { csrfToken: 'abc123' },
      get: vi.fn().mockReturnValue('different'),
    } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfProtectionMiddleware(req, res, next);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts when csrf header matches cookie', () => {
    const req = {
      method: 'POST',
      path: '/products/create',
      cookies: { csrfToken: 'abc123' },
      get: vi.fn().mockReturnValue('abc123'),
    } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    csrfProtectionMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((res as any).status).not.toHaveBeenCalled();
  });
});
