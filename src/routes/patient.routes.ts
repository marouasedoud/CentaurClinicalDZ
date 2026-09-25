import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery, getPatientsByServiceSchema } from '../middleware/validate.middleware';

const router = Router();

/**
 * GET /api/patients?service=<service>
 *
 * Retrieve patients by service department.
 * Requires a valid Bearer access token.
 *
 * Query Parameters:
 *   service  (required)  One of: general | urgence | oncologie | cardiologie
 *
 * Headers:
 *   Authorization: Bearer <access_token>
 *
 * Responses:
 *   200  Success — returns common patient fields + service-specific fields.
 *   400  Missing or invalid `service` query parameter.
 *   401  Missing, invalid, or expired access token.
 *
 * Example:
 *   GET /api/patients?service=oncologie
 *   → { status, statusCode, data: { service, count, patients: [...] } }
 */
router.get(
  '/',
  authenticate,
  validateQuery(getPatientsByServiceSchema),
  patientController.getByService
);

export default router;

