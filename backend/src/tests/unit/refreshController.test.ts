import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  setAuthCookiesMock,
  setCsrfCookieMock,
  generateAccessTokenMock,
  generateRefreshTokenMock,
} = vi.hoisted(() => ({
  setAuthCookiesMock: vi.fn(),
  setCsrfCookieMock: vi.fn(),
  generateAccessTokenMock: vi.fn(),
  generateRefreshTokenMock: vi.fn(),
}));

vi.mock('../../auth/utils/cookieOptions', () => ({
  setAuthCookies: setAuthCookiesMock,
  setCsrfCookie: setCsrfCookieMock,
}));

vi.mock('../../auth/utils/generateToken', () => ({
  generateAccessToken: generateAccessTokenMock,
  generateRefreshToken: generateRefreshTokenMock,
}));

vi.mock('../../observability/observability', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  tracer: {
    startSpan: vi.fn(() => ({
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    })),
  },
  SpanStatusCode: {
    ERROR: 2,
  },
}));

import { refreshAccessToken } from '../../auth/controller/refreshController';

function createRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe('refreshAccessToken controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';
    generateAccessTokenMock.mockReturnValue('new-access-token');
    generateRefreshTokenMock.mockReturnValue('new-refresh-token');
  });

  it('returns 401 when refresh token cookie is missing', async () => {
    const req = { cookies: {} } as unknown as Request;
    const res = createRes();

    await refreshAccessToken(req, res);

    expect((res as any).status).toHaveBeenCalledWith(401);
    expect((res as any).json).toHaveBeenCalledWith({ message: 'No refresh token provided' });
  });

  it('returns 403 when refresh token is invalid', async () => {
    vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
      throw new Error('invalid token');
    });

    const req = { cookies: { refreshToken: 'bad-token' } } as unknown as Request;
    const res = createRes();

    await refreshAccessToken(req, res);

    expect((res as any).status).toHaveBeenCalledWith(403);
    expect((res as any).json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
  });

  it('returns 200 and rotates tokens when refresh token is valid', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValueOnce({ userId: 'user-1' } as any);

    const req = { cookies: { refreshToken: 'valid-token' } } as unknown as Request;
    const res = createRes();

    await refreshAccessToken(req, res);

    expect(setAuthCookiesMock).toHaveBeenCalledWith(res, 'new-access-token', 'new-refresh-token');
    expect(setCsrfCookieMock).toHaveBeenCalledOnce();
    expect((res as any).status).toHaveBeenCalledWith(200);
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Access token refreshed',
        csrfToken: expect.any(String),
      }),
    );
  });
});
