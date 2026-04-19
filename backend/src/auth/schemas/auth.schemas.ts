import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address')
  .max(254, 'Email is too long');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

export const signUpBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const googleLoginBodySchema = z
  .object({
    token: z.string().trim().min(1, 'Google token is required'),
  })
  .strict();

export const forgotPasswordBodySchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordBodySchema = z
  .object({
    token: z.string().trim().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resendResetLinkBodySchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const refreshBodySchema = z.object({}).strict();

export const logoutBodySchema = z.object({}).strict();
