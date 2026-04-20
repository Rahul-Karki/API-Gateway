import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateAccessToken, generateRefreshToken } from '../../auth/utils/generateToken';

const originalEnv = { ...process.env };

describe('generateToken utilities', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ACCESS_TOKEN_SECRET = 'access-secret-for-tests';
    process.env.REFRESH_TOKEN_SECRET = 'refresh-secret-for-tests';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('generates a valid access token', () => {
    const token = generateAccessToken('user-123');
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { userId: string };

    expect(payload.userId).toBe('user-123');
  });

  it('generates a valid refresh token', () => {
    const token = generateRefreshToken('user-abc');
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET as string) as { userId: string };

    expect(payload.userId).toBe('user-abc');
  });

  it('throws if access token secret is missing', () => {
    delete process.env.ACCESS_TOKEN_SECRET;

    expect(() => generateAccessToken('user-123')).toThrow('Failed to generate access token');
  });

  it('throws if refresh token secret is missing', () => {
    delete process.env.REFRESH_TOKEN_SECRET;

    expect(() => generateRefreshToken('user-123')).toThrow('Failed to generate refresh token');
  });
});
