import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { csrfProtectionMiddleware } from '../../middleware/csrf';

function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(csrfProtectionMiddleware);

  app.post('/auth/login', (_req, res) => res.status(200).json({ ok: true }));
  app.post('/secure-write', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('csrf protection integration', () => {
  it('allows exempt auth route without csrf header', async () => {
    const app = buildApp();

    const res = await request(app).post('/auth/login').send({ email: 'a@b.com', password: '123456' });

    expect(res.status).toBe(200);
  });

  it('blocks secure write without matching csrf token', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/secure-write')
      .set('Cookie', ['csrfToken=cookie-token'])
      .send({ foo: 'bar' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('CSRF token validation failed');
  });

  it('allows secure write with matching csrf cookie + header', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/secure-write')
      .set('Cookie', ['csrfToken=token-123'])
      .set('x-csrf-token', 'token-123')
      .send({ foo: 'bar' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
