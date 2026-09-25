import { Request, Response, NextFunction } from 'express';
import { PatientService, patientService } from '../services/patient.service';
import type { PatientService as PatientServiceName } from '../models/patient.model';

export class PatientController {
  constructor(private readonly patientSvc: PatientService = patientService) {}

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
}

export const patientController = new PatientController();
