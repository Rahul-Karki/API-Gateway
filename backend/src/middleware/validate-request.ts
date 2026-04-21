import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

type ValidationSchema = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      if (schema.params) {
        req.params = schema.params.parse(req.params) as Request['params'];
      }

      if (schema.query) {
        req.query = schema.query.parse(req.query) as Request['query'];
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      return res.status(400).json({
        message: 'Invalid request payload',
      });
    }
  };
}
