import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateBody,
  validateQuery,
  createPatientSchema,
  getPatientsByServiceSchema,
  updatePatientSchema,
} from '../middleware/validate.middleware';

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

/**
 * POST /api/patients
 *
 * Create a patient with the required fields for its service.
 * Requires a valid Bearer access token.
 *
 * Responses:
 *   201  Patient created.
 *   400  Missing or invalid fields for the selected service.
 *   401  Missing, invalid, or expired access token.
 */
router.post(
  '/',
  authenticate,
  validateBody(createPatientSchema),
  patientController.create
);

/**
 * PATCH /api/patients/:id
 *
 * Update one or more common or service-specific patient fields.
 * Accepts common fields and optional detail fields for the patient's service.
 *
 * Responses:
 *   200  Patient fields updated.
 *   400  Empty request body, invalid fields, or a specialty field for the wrong service.
 *   401  Missing, invalid, or expired access token.
 *   404  No patient exists with the given ID.
 */
router.patch(
  '/:id',
  authenticate,
  validateBody(updatePatientSchema),
  patientController.updateById
);

/**
 * DELETE /api/patients/:id
 *
 * Delete an existing patient and its service-specific details.
 * Requires a valid Bearer access token.
 *
 * Responses:
 *   200  Patient deleted.
 *   401  Missing, invalid, or expired access token.
 *   404  No patient exists with the given ID.
 */
router.delete('/:id', authenticate, patientController.deleteById);

export default router;

