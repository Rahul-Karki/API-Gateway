import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';

process.env.GATEWAY_INTERNAL_SECRET = 'gateway-only-access-9f2b7c0d4e3a';

import { gatewayOnlyMiddleware } from '../middleware/gatewayOnly';

function createMockResponse() {
  const state = {
    statusCode: null as number | null,
    body: undefined as unknown,
  };

  const res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
  } as unknown as Response;

  return { res, state };
}

function createMockRequest(headers: Record<string, string | undefined>) {
  return {
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

describe('gatewayOnlyMiddleware', () => {
  it('rejects direct requests without gateway secret', () => {
    const req = createMockRequest({});
    const { res, state } = createMockResponse();
    let nextCalled = false;

    gatewayOnlyMiddleware(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    expect(nextCalled).toBe(false);
    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({
      message: 'Forbidden: requests must come through the API gateway',
    });
  });

  it('accepts requests with the valid gateway secret', () => {
    const req = createMockRequest({
      'x-gateway-secret': 'gateway-only-access-9f2b7c0d4e3a',
    });
    const { res, state } = createMockResponse();
    let nextCalled = false;

    gatewayOnlyMiddleware(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    expect(nextCalled).toBe(true);
    expect(state.statusCode).toBeNull();
    expect(state.body).toBeUndefined();
  });
});