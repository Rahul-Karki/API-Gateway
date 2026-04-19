import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const priceSchema = z
  .coerce
  .number()
  .finite('Price must be finite')
  .nonnegative('Price must be greater than or equal to 0');

const baseProductFields = {
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name is too long'),
  description: z.string().trim().max(5000, 'Description is too long').optional(),
  price: priceSchema,
  category: z.string().trim().min(1, 'Category is required').max(100, 'Category is too long'),
};

export const productIdParamsSchema = z
  .object({
    productId: z.string().regex(objectIdRegex, 'Invalid productId'),
  })
  .strict();

export const createProductBodySchema = z
  .object(baseProductFields)
  .strict();

export const updateProductBodySchema = z
  .object({
    name: baseProductFields.name.optional(),
    description: baseProductFields.description,
    price: baseProductFields.price.optional(),
    category: baseProductFields.category.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });
