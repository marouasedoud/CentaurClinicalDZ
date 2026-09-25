import { Knex } from 'knex';
import { db } from '../database/connection';
import type {
  Patient,
  PatientService,
  PatientRow,
  GeneralPatient,
  UrgencePatient,
  OncologiePatient,
  CardiologiePatient,
} from '../models/patient.model';

export interface IPatientRepository {
  findByService(service: PatientService): Promise<PatientRow[]>;
}

export class PatientRepository implements IPatientRepository {
  constructor(private readonly knexClient: Knex = db) {}

  /**
   * Returns patients filtered by service, joined with the appropriate
   * service-specific detail table (except general which has no detail table).
   */
  async findByService(service: PatientService): Promise<PatientRow[]> {
    const base = this.knexClient<Patient>('patients').where('patients.service', service);

    switch (service) {
      case 'general':
        return base.select<GeneralPatient[]>('patients.*').orderBy('patients.nom');

      case 'urgence':
        return base
          .join('urgence', 'patients.id', 'urgence.patient_id')
          .select<UrgencePatient[]>(
            'patients.*',
            'urgence.heure_arrivee',
            'urgence.niveau_triage',
            'urgence.gravite_initiale'
          )
          .orderBy('patients.nom');

      case 'oncologie':
        return base
          .join('oncologie', 'patients.id', 'oncologie.patient_id')
          .select<OncologiePatient[]>(
            'patients.*',
            'oncologie.type_tumeur',
            'oncologie.stade',
            'oncologie.traitement_en_cours'
          )
          .orderBy('patients.nom');

      case 'cardiologie':
        return base
          .join('cardiologie', 'patients.id', 'cardiologie.patient_id')
          .select<CardiologiePatient[]>(
            'patients.*',
            'cardiologie.resultats_ecg',
            'cardiologie.frequence_cardiaque_repos',
            'cardiologie.tension_arterielle'
          )
          .orderBy('patients.nom');
    }
  }
}

export const patientRepository = new PatientRepository();
