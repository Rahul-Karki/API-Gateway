import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAuthCookies,
  clearCsrfCookie,
  setAuthCookies,
  setCsrfCookie,
} from '../../auth/utils/cookieOptions';

function createMockResponse() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as unknown as Response & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
}

const originalEnv = { ...process.env };

describe('cookieOptions', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COOKIE_SECURE;
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.COOKIE_DOMAIN;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sets auth cookies with secure defaults in non-production', () => {
    const res = createMockResponse();

    setAuthCookies(res, 'access-token', 'refresh-token');

    expect(res.cookie).toHaveBeenCalledTimes(2);
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      'accessToken',
      'access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      }),
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      'refreshToken',
      'refresh-token',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      }),
    );
  });

  it('honors explicit secure + sameSite none configuration', () => {
    process.env.COOKIE_SECURE = 'true';
    process.env.COOKIE_SAME_SITE = 'none';
    process.env.COOKIE_DOMAIN = '.example.com';
    const res = createMockResponse();

    setCsrfCookie(res, 'csrf-value');

    expect(res.cookie).toHaveBeenCalledWith(
      'csrfToken',
      'csrf-value',
      expect.objectContaining({
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        domain: '.example.com',
      }),
    );
  });

  it('clears auth cookies', () => {
    const res = createMockResponse();

    clearAuthCookies(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('clears csrf cookie with httpOnly false', () => {
    const res = createMockResponse();

    clearCsrfCookie(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'csrfToken',
      expect.objectContaining({ httpOnly: false }),
    );
  });
});
