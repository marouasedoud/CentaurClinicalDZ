import { Request, Response, NextFunction } from 'express';
import { PatientService, patientService } from '../services/patient.service';
import type { PatientService as PatientServiceName } from '../models/patient.model';

export class PatientController {
  constructor(private readonly patientSvc: PatientService = patientService) { }

  /**
   * GET /api/patients?service=<service>
   *
   * Returns a list of patients for the requested service.
   * Common patient fields are always included; service-specific fields
   * are joined in for `urgence`, `oncologie`, and `cardiologie`.
   *
   * @query service  Required. One of: general | urgence | oncologie | cardiologie
   *
   * @returns 200  { status, statusCode, data: { service, count, patients[] } }
   * @returns 400  When the `service` query parameter is missing or invalid.
   */
  getByService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = req.query.service as PatientServiceName;
      const patients = await this.patientSvc.getPatientsByService(service);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: {
          service,
          count: patients.length,
          patients,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Creates a patient and its service-specific details. */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const patient = await this.patientSvc.createPatient(req.body);

      res.status(201).json({
        status: 'success',
        statusCode: 201,
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
  * Updates the provided common or service-specific fields on the patient.
   *
   * @returns 200  Patient fields updated
   * @throws 404  When the patient does not exist.
   */
  updateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.patientSvc.updatePatient(id, req.body);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: { id, ...req.body },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Deletes the patient with the given ID.
   *
   * @param id  Patient UUID
   * @returns 200  Patient deleted
   * @throws 404  When the patient does not exist.
   */
  deleteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.patientSvc.deletePatient(id);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const patientController = new PatientController();
