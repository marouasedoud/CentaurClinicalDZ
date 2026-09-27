import { IPatientRepository, patientRepository } from '../repositories/patient.repository';
import type {
  PatientService as PatientServiceName,
  PatientRow,
  CreatePatientInput,
  UpdatePatientInput,
} from '../models/patient.model';
import { BadRequestError, NotFoundError } from '../utils/errors.util';

const serviceByUpdateField = {
  heure_arrivee: 'urgence',
  niveau_triage: 'urgence',
  gravite_initiale: 'urgence',
  type_tumeur: 'oncologie',
  stade: 'oncologie',
  traitement_en_cours: 'oncologie',
  resultats_ecg: 'cardiologie',
  frequence_cardiaque_repos: 'cardiologie',
  tension_arterielle: 'cardiologie',
} as const;

export class PatientService {
  constructor(private readonly patientRepo: IPatientRepository = patientRepository) { }

  /**
   * Returns all patients belonging to the given service,
   * including service-specific fields where applicable.
   */
  async getPatientsByService(service: PatientServiceName): Promise<PatientRow[]> {
    return this.patientRepo.findByService(service);
  }

  async createPatient(input: CreatePatientInput): Promise<PatientRow> {
    return this.patientRepo.createPatient(input);
  }

  async updatePatient(id: string, updates: UpdatePatientInput): Promise<void> {
    const service = await this.patientRepo.findServiceById(id);
    if (!service) {
      throw new NotFoundError('Patient not found');
    }

    for (const [field, fieldService] of Object.entries(serviceByUpdateField)) {
      if (updates[field as keyof UpdatePatientInput] !== undefined && service !== fieldService) {
        throw new BadRequestError(`${field} can only be updated for ${fieldService} patients`);
      }
    }

    const updated = await this.patientRepo.updateById(id, updates);
    if (!updated) {
      throw new NotFoundError('Patient not found');
    }
  }

  async deletePatient(id: string): Promise<void> {
    const deleted = await this.patientRepo.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('Patient not found');
    }
  }
}

export const patientService = new PatientService();
