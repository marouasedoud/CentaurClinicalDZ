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

const newPatientFields = {
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  date_hospitalisation: z.string().date(),
};
const hospitalTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/);

export const createPatientSchema = z.discriminatedUnion('service', [
  z.object({ ...newPatientFields, service: z.literal('general') }).strict(),
  z.object({
    ...newPatientFields,
    service: z.literal('urgence'),
    heure_arrivee: hospitalTimeSchema,
    niveau_triage: z.number().int().min(1).max(5),
    gravite_initiale: z.string().trim().min(1).max(100),
  }).strict(),
  z.object({
    ...newPatientFields,
    service: z.literal('oncologie'),
    type_tumeur: z.string().trim().min(1).max(150),
    stade: z.number().int().min(1).max(4),
    traitement_en_cours: z.string().trim().min(1).max(255),
  }).strict(),
  z.object({
    ...newPatientFields,
    service: z.literal('cardiologie'),
    resultats_ecg: z.string().trim().min(1).max(255),
    frequence_cardiaque_repos: z.number().int().positive(),
    tension_arterielle: z.string().trim().min(1).max(20),
  }).strict(),
]);

export const updatePatientSchema = z
  .object({
    nom: z.string().trim().min(1).max(100).optional(),
    prenom: z.string().trim().min(1).max(100).optional(),
    date_hospitalisation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    heure_arrivee: hospitalTimeSchema.optional(),
    stade: z.number().int().min(1).max(4).optional(),
    niveau_triage: z.number().int().min(1).max(5).optional(),
    gravite_initiale: z.string().trim().min(1).max(100).optional(),
    type_tumeur: z.string().trim().min(1).max(150).optional(),
    traitement_en_cours: z.string().trim().min(1).max(255).optional(),
    resultats_ecg: z.string().trim().min(1).max(255).optional(),
    frequence_cardiaque_repos: z.number().int().positive().optional(),
    tension_arterielle: z.string().trim().min(1).max(20).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one patient field must be provided',
  });
