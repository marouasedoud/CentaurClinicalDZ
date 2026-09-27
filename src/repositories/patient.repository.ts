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
  CreatePatientInput,
  UpdatePatientInput,
} from '../models/patient.model';

export interface IPatientRepository {
  findByService(service: PatientService): Promise<PatientRow[]>;
  findServiceById(id: string): Promise<PatientService | null>;
  createPatient(input: CreatePatientInput): Promise<PatientRow>;
  updateById(id: string, updates: UpdatePatientInput): Promise<boolean>;
  deleteById(id: string): Promise<boolean>;
}

export class PatientRepository implements IPatientRepository {
  constructor(private readonly knexClient: Knex = db) { }

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

  async findServiceById(id: string): Promise<PatientService | null> {
    const patient = await this.knexClient<Patient>('patients')
      .select('service')
      .where({ id })
      .first();
    return patient?.service ?? null;
  }

  async createPatient(input: CreatePatientInput): Promise<PatientRow> {
    const { nom, prenom, date_hospitalisation, service } = input;

    return this.knexClient.transaction(async (transaction) => {
      const [patient] = await transaction<Patient>('patients')
        .insert({ nom, prenom, date_hospitalisation, service })
        .returning('*');

      switch (service) {
        case 'general':
          return patient;
        case 'urgence': {
          const details = {
            patient_id: patient.id,
            heure_arrivee: input.heure_arrivee,
            niveau_triage: input.niveau_triage,
            gravite_initiale: input.gravite_initiale,
          };
          await transaction('urgence').insert(details);
          const { patient_id: _patientId, ...patientDetails } = details;
          return { ...patient, ...patientDetails };
        }
        case 'oncologie': {
          const details = {
            patient_id: patient.id,
            type_tumeur: input.type_tumeur,
            stade: input.stade,
            traitement_en_cours: input.traitement_en_cours,
          };
          await transaction('oncologie').insert(details);
          const { patient_id: _patientId, ...patientDetails } = details;
          return { ...patient, ...patientDetails };
        }
        case 'cardiologie': {
          const details = {
            patient_id: patient.id,
            resultats_ecg: input.resultats_ecg,
            frequence_cardiaque_repos: input.frequence_cardiaque_repos,
            tension_arterielle: input.tension_arterielle,
          };
          await transaction('cardiologie').insert(details);
          const { patient_id: _patientId, ...patientDetails } = details;
          return { ...patient, ...patientDetails };
        }
      }
    });
  }

  async deleteById(id: string): Promise<boolean> {
    const deletedRows = await this.knexClient<Patient>('patients').where({ id }).delete();
    return deletedRows > 0;
  }

  async updateById(id: string, updates: UpdatePatientInput): Promise<boolean> {
    const {
      heure_arrivee,
      niveau_triage,
      gravite_initiale,
      type_tumeur,
      stade,
      traitement_en_cours,
      resultats_ecg,
      frequence_cardiaque_repos,
      tension_arterielle,
      ...patientUpdates
    } = updates;

    return this.knexClient.transaction(async (transaction) => {
      const updatedRows = await transaction<Patient>('patients')
        .where({ id })
        .update({ ...patientUpdates, updated_at: transaction.fn.now() });

      if (updatedRows === 0) {
        return false;
      }

      const urgencyUpdates = {
        ...(heure_arrivee !== undefined && { heure_arrivee }),
        ...(niveau_triage !== undefined && { niveau_triage }),
        ...(gravite_initiale !== undefined && { gravite_initiale }),
      }
      if (Object.keys(urgencyUpdates).length > 0) {
        await transaction('urgence').where({ patient_id: id }).update(urgencyUpdates);
      }

      const oncologyUpdates = {
        ...(type_tumeur !== undefined && { type_tumeur }),
        ...(stade !== undefined && { stade }),
        ...(traitement_en_cours !== undefined && { traitement_en_cours }),
      };
      if (Object.keys(oncologyUpdates).length > 0) {
        await transaction('oncologie').where({ patient_id: id }).update(oncologyUpdates);
      }

      const cardiologyUpdates = {
        ...(resultats_ecg !== undefined && { resultats_ecg }),
        ...(frequence_cardiaque_repos !== undefined && { frequence_cardiaque_repos }),
        ...(tension_arterielle !== undefined && { tension_arterielle }),
      };
      if (Object.keys(cardiologyUpdates).length > 0) {
        await transaction('cardiologie').where({ patient_id: id }).update(cardiologyUpdates);
      }

      return true;
    });
  }
}

export const patientRepository = new PatientRepository();
