import { describe, expect, it } from 'vitest';
import {
  signUpBodySchema,
  loginBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  resendResetLinkBodySchema,
  refreshBodySchema,
} from '../../auth/schemas/auth.schemas';

describe('Auth schema validation', () => {
  describe('signUpBodySchema', () => {
    it('accepts valid signup data', () => {
      const result = signUpBodySchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongPass1!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
      const result = signUpBodySchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Ab1!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = signUpBodySchema.safeParse({
        name: 'Test User',
        email: 'not-an-email',
        password: 'StrongPass1!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing name', () => {
      const result = signUpBodySchema.safeParse({
        email: 'test@example.com',
        password: 'StrongPass1!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra fields (strict mode)', () => {
      const result = signUpBodySchema.safeParse({
        name: 'Test User',
        email: 'test@example.com',
        password: 'StrongPass1!',
        extraField: 'should not be here',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginBodySchema', () => {
    it('accepts valid login data', () => {
      const result = loginBodySchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const result = loginBodySchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordBodySchema', () => {
    it('accepts valid email', () => {
      const result = forgotPasswordBodySchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = forgotPasswordBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordBodySchema', () => {
    it('accepts valid reset data', () => {
      const result = resetPasswordBodySchema.safeParse({
        token: 'valid-token-here',
        password: 'NewStrongPass1!',
        confirmPassword: 'NewStrongPass1!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = resetPasswordBodySchema.safeParse({
        token: 'valid-token',
        password: 'StrongPass1!',
        confirmPassword: 'DifferentPass1!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resendResetLinkBodySchema', () => {
    it('accepts valid email', () => {
      const result = resendResetLinkBodySchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('refreshBodySchema', () => {
    it('accepts empty object', () => {
      const result = refreshBodySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects extra fields', () => {
      const result = refreshBodySchema.safeParse({ token: 'something' });
      expect(result.success).toBe(false);
    });
  });
});
