import assert from 'node:assert/strict';

process.env.GATEWAY_INTERNAL_SECRET = 'gateway-only-access-9f2b7c0d4e3a';

const { gatewayOnlyMiddleware } = require('../middleware/gatewayOnly') as typeof import('../middleware/gatewayOnly');

type MockRequest = {
  get: (name: string) => string | undefined;
};

type MockResponse = {
  statusCode: number | null;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: null,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function createMockRequest(headers: Record<string, string | undefined>): MockRequest {
  return {
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
}

async function testRejectsDirectRequest(): Promise<void> {
  const req = createMockRequest({});
  const res = createMockResponse();
  let nextCalled = false;

  gatewayOnlyMiddleware(req as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    message: 'Forbidden: requests must come through the API gateway',
  });
}

async function testAcceptsGatewayRequest(): Promise<void> {
  const req = createMockRequest({
    'x-gateway-secret': 'gateway-only-access-9f2b7c0d4e3a',
  });
  const res = createMockResponse();
  let nextCalled = false;

  gatewayOnlyMiddleware(req as never, res as never, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(res.body, undefined);
}

async function main(): Promise<void> {
  await testRejectsDirectRequest();
  await testAcceptsGatewayRequest();
  console.log('gateway-only middleware tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});