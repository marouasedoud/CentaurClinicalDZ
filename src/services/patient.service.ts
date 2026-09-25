import { IPatientRepository, patientRepository } from '../repositories/patient.repository';
import type { PatientService as PatientServiceName, PatientRow } from '../models/patient.model';

export class PatientService {
  constructor(private readonly patientRepo: IPatientRepository = patientRepository) {}

  /**
   * Returns all patients belonging to the given service,
   * including service-specific fields where applicable.
   */
  async getPatientsByService(service: PatientServiceName): Promise<PatientRow[]> {
    return this.patientRepo.findByService(service);
  }
}

export const patientService = new PatientService();
