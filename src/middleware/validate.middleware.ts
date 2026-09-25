import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { BadRequestError } from '../utils/errors.util';
import { PATIENT_SERVICES } from '../models/patient.model';

/**
 * Higher-order middleware to validate incoming request body against a Zod schema.
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const result = await schema.safeParseAsync(req.body);
    if (!result.success) {
      const errorMessages = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      next(new BadRequestError('Validation failed', errorMessages));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Higher-order middleware to validate incoming query string against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const result = await schema.safeParseAsync(req.query);
    if (!result.success) {
      const errorMessages = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      next(new BadRequestError('Validation failed', errorMessages));
      return;
    }
    req.query = result.data as Record<string, string>;
    next();
  };
}

// Validation schemas for authentication endpoints
export const registerSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
});

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'Username is required' })
    .trim()
    .min(1, 'Username cannot be empty'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'refreshToken is required' })
    .min(1, 'refreshToken cannot be empty'),
});

// Validation schema for GET /api/patients?service=<service>
export const getPatientsByServiceSchema = z.object({
  service: z.enum(PATIENT_SERVICES, {
    required_error: 'Query parameter "service" is required',
    message: `Invalid service. Must be one of: ${PATIENT_SERVICES.join(', ')}`,
  }),
});
