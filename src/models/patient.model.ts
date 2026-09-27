export const PATIENT_SERVICES = ['general', 'urgence', 'oncologie', 'cardiologie'] as const;
export type PatientService = (typeof PATIENT_SERVICES)[number];

/**
 * Fields common to every patient record.
 */
export interface Patient {
  id: string;
  nom: string;
  prenom: string;
  date_hospitalisation: string; // ISO date string (YYYY-MM-DD)
  service: PatientService;
  created_at: Date;
  updated_at: Date;
}

// ─── Service-specific detail rows ────────────────────────────────────────────

export interface UrgenceDetail {
  patient_id: string;
  heure_arrivee: string; // HH:mm:ss
  niveau_triage: number; // 1 (critical) – 5 (non-urgent)
  gravite_initiale: string;
}

export interface OncologieDetail {
  patient_id: string;
  type_tumeur: string;
  stade: number;
  traitement_en_cours: string;
}

export type UpdatePatientInput = Partial<Pick<Patient, 'nom' | 'prenom' | 'date_hospitalisation'>> &
  Partial<Pick<UrgenceDetail, 'heure_arrivee' | 'niveau_triage' | 'gravite_initiale'>> &
  Partial<Pick<OncologieDetail, 'type_tumeur' | 'stade' | 'traitement_en_cours'>> &
  Partial<
    Pick<
      CardiologieDetail,
      'resultats_ecg' | 'frequence_cardiaque_repos' | 'tension_arterielle'
    >
  >;

export interface CardiologieDetail {
  patient_id: string;
  resultats_ecg: string;
  frequence_cardiaque_repos: number;
  tension_arterielle: string;
}

type NewPatientFields = Pick<Patient, 'nom' | 'prenom' | 'date_hospitalisation'>;

export type CreatePatientInput =
  | (NewPatientFields & { service: 'general' })
  | (NewPatientFields & { service: 'urgence' } & Omit<UrgenceDetail, 'patient_id'>)
  | (NewPatientFields & { service: 'oncologie' } & Omit<OncologieDetail, 'patient_id'>)
  | (NewPatientFields & { service: 'cardiologie' } & Omit<CardiologieDetail, 'patient_id'>);

// ─── Joined response types ───────────────────────────────────────────────────

export type GeneralPatient = Patient;

export type UrgencePatient = Patient & Omit<UrgenceDetail, 'patient_id'>;

export type OncologiePatient = Patient & Omit<OncologieDetail, 'patient_id'>;

export type CardiologiePatient = Patient & Omit<CardiologieDetail, 'patient_id'>;

export type PatientRow =
  | GeneralPatient
  | UrgencePatient
  | OncologiePatient
  | CardiologiePatient;

/**
 * Query parameters accepted by GET /api/patients.
 */
export interface GetPatientsQuery {
  service: PatientService;
}
