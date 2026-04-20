import { describe, expect, it } from 'vitest';

import { loginSchema, signupSchema } from './validation';

describe('validation schemas', () => {
  it('accepts valid login input', () => {
    const result = loginSchema.safeParse({
      email: 'rahul@example.com',
      password: 'StrongPass123!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid login email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPass123!',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid signup input', () => {
    const result = signupSchema.safeParse({
      name: 'Rahul',
      email: 'rahul@example.com',
      password: 'StrongPass123!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects signup with too-short name', () => {
    const result = signupSchema.safeParse({
      name: 'R',
      email: 'rahul@example.com',
      password: 'StrongPass123!',
    });

    expect(result.success).toBe(false);
  });
});
