import { CookieOptions, Response } from 'express';

type SameSiteValue = 'lax' | 'strict' | 'none';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CSRF_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getSecureCookieFlag(): boolean {
  if (process.env.COOKIE_SECURE === 'true') {
    return true;
  }

  if (process.env.COOKIE_SECURE === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

function getSameSiteValue(secure: boolean): SameSiteValue {
  const configured = (process.env.COOKIE_SAME_SITE || '').toLowerCase();

  if (configured === 'lax' || configured === 'strict') {
    return configured;
  }

  if (configured === 'none') {
    return secure ? 'none' : 'lax';
  }

  return secure ? 'none' : 'lax';
}

function getCookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain ? domain : undefined;
}

function getBaseCookieOptions(): CookieOptions {
  const secure = getSecureCookieFlag();
  const sameSite = getSameSiteValue(secure);

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    domain: getCookieDomain(),
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const baseOptions = getBaseCookieOptions();

  res.cookie('accessToken', accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  res.cookie('refreshToken', refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response): void {
  const baseOptions = getBaseCookieOptions();

  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
}

export function setCsrfCookie(res: Response, csrfToken: string): void {
  const baseOptions = getBaseCookieOptions();

  res.cookie('csrfToken', csrfToken, {
    ...baseOptions,
    httpOnly: false,
    maxAge: CSRF_TOKEN_MAX_AGE_MS,
  });
}
