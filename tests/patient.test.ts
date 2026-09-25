import request from 'supertest';
import express, { Application } from 'express';
import { PatientController } from '../src/controllers/patient.controller';
import { PatientService } from '../src/services/patient.service';
import { IPatientRepository } from '../src/repositories/patient.repository';
import { authenticate } from '../src/middleware/auth.middleware';
import { signAccessToken } from '../src/utils/jwt.util';
import { errorHandler } from '../src/middleware/error.middleware';
import { notFoundHandler } from '../src/middleware/not-found.middleware';
import { validateQuery, getPatientsByServiceSchema } from '../src/middleware/validate.middleware';
import type {
  PatientRow,
  PatientService as PatientServiceName,
  GeneralPatient,
  UrgencePatient,
  OncologiePatient,
  CardiologiePatient,
} from '../src/models/patient.model';

// ─── In-Memory Patient Repository Mock ───────────────────────────────────────

const generalPatients: GeneralPatient[] = [
  {
    id: 'aaaa-0001',
    nom: 'Benali',
    prenom: 'Amina',
    date_hospitalisation: '2026-09-10',
    service: 'general',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const urgencePatients: UrgencePatient[] = [
  {
    id: 'bbbb-0001',
    nom: 'Hamidi',
    prenom: 'Sonia',
    date_hospitalisation: '2026-09-20',
    service: 'urgence',
    created_at: new Date(),
    updated_at: new Date(),
    heure_arrivee: '08:45:00',
    niveau_triage: 2,
    gravite_initiale: 'Douleur thoracique aiguë',
  },
];

const oncologiePatients: OncologiePatient[] = [
  {
    id: 'cccc-0001',
    nom: 'Touati',
    prenom: 'Leila',
    date_hospitalisation: '2026-08-01',
    service: 'oncologie',
    created_at: new Date(),
    updated_at: new Date(),
    type_tumeur: 'Carcinome mammaire',
    stade: 'II',
    traitement_en_cours: 'Chimiothérapie - Cycle 3',
  },
];

const cardiologiePatients: CardiologiePatient[] = [
  {
    id: 'dddd-0001',
    nom: 'Zerrouk',
    prenom: 'Omar',
    date_hospitalisation: '2026-09-05',
    service: 'cardiologie',
    created_at: new Date(),
    updated_at: new Date(),
    resultats_ecg: 'Fibrillation auriculaire',
    frequence_cardiaque_repos: 92,
    tension_arterielle: '145/95',
  },
];

class MockPatientRepository implements IPatientRepository {
  async findByService(service: PatientServiceName): Promise<PatientRow[]> {
    switch (service) {
      case 'general':
        return generalPatients;
      case 'urgence':
        return urgencePatients;
      case 'oncologie':
        return oncologiePatients;
      case 'cardiologie':
        return cardiologiePatients;
    }
  }
}

// ─── Test Application Factory ─────────────────────────────────────────────────

function createTestApp(): Application {
  const repo = new MockPatientRepository();
  const service = new PatientService(repo);
  const controller = new PatientController(service);

  const app: Application = express();
  app.use(express.json());

  app.get(
    '/api/patients',
    authenticate,
    validateQuery(getPatientsByServiceSchema),
    controller.getByService
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/patients — Patient Service Endpoint', () => {
  let app: Application;
  let validToken: string;

  beforeEach(() => {
    app = createTestApp();
    validToken = signAccessToken({ sub: 'user-001', username: 'dr_tester' });
  });

  // ── Authentication ─────────────────────────────────────────────────────────

  describe('Authentication', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/patients?service=general');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toContain('Authorization header is missing');
    });

    it('should return 401 when Authorization header format is not Bearer <token>', async () => {
      const res = await request(app)
        .get('/api/patients?service=general')
        .set('Authorization', 'Basic 12345');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toContain('Authorization format must be "Bearer <token>"');
    });

    it('should return 401 when access token is invalid', async () => {
      const res = await request(app)
        .get('/api/patients?service=general')
        .set('Authorization', 'Bearer invalid.token.value');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid access token');
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it('should return 400 when service query param is missing', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'service' }),
      ])
    );
  });

  it('should return 400 when service is an invalid value', async () => {
    const res = await request(app)
      .get('/api/patients?service=radiologie')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'service' }),
      ])
    );
  });

  // ── general ────────────────────────────────────────────────────────────────

  it('should return general patients with only common fields', async () => {
    const res = await request(app)
      .get('/api/patients?service=general')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.service).toBe('general');
    expect(res.body.data.count).toBe(1);

    const patient = res.body.data.patients[0];
    expect(patient.nom).toBe('Benali');
    expect(patient.prenom).toBe('Amina');
    expect(patient.service).toBe('general');

    // general must NOT have service-specific fields
    expect(patient.heure_arrivee).toBeUndefined();
    expect(patient.type_tumeur).toBeUndefined();
    expect(patient.resultats_ecg).toBeUndefined();
  });

  // ── urgence ────────────────────────────────────────────────────────────────

  it('should return urgence patients with urgence-specific fields', async () => {
    const res = await request(app)
      .get('/api/patients?service=urgence')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('urgence');
    expect(res.body.data.count).toBe(1);

    const patient = res.body.data.patients[0];
    expect(patient.nom).toBe('Hamidi');
    expect(patient.service).toBe('urgence');
    expect(patient.heure_arrivee).toBe('08:45:00');
    expect(patient.niveau_triage).toBe(2);
    expect(patient.gravite_initiale).toBe('Douleur thoracique aiguë');

    // Must NOT include fields from other services
    expect(patient.type_tumeur).toBeUndefined();
    expect(patient.resultats_ecg).toBeUndefined();
  });

  // ── oncologie ──────────────────────────────────────────────────────────────

  it('should return oncologie patients with oncologie-specific fields', async () => {
    const res = await request(app)
      .get('/api/patients?service=oncologie')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('oncologie');
    expect(res.body.data.count).toBe(1);

    const patient = res.body.data.patients[0];
    expect(patient.nom).toBe('Touati');
    expect(patient.service).toBe('oncologie');
    expect(patient.type_tumeur).toBe('Carcinome mammaire');
    expect(patient.stade).toBe('II');
    expect(patient.traitement_en_cours).toBe('Chimiothérapie - Cycle 3');

    // Must NOT include fields from other services
    expect(patient.heure_arrivee).toBeUndefined();
    expect(patient.resultats_ecg).toBeUndefined();
  });

  // ── cardiologie ────────────────────────────────────────────────────────────

  it('should return cardiologie patients with cardiologie-specific fields', async () => {
    const res = await request(app)
      .get('/api/patients?service=cardiologie')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('cardiologie');
    expect(res.body.data.count).toBe(1);

    const patient = res.body.data.patients[0];
    expect(patient.nom).toBe('Zerrouk');
    expect(patient.service).toBe('cardiologie');
    expect(patient.resultats_ecg).toBe('Fibrillation auriculaire');
    expect(patient.frequence_cardiaque_repos).toBe(92);
    expect(patient.tension_arterielle).toBe('145/95');

    // Must NOT include fields from other services
    expect(patient.heure_arrivee).toBeUndefined();
    expect(patient.type_tumeur).toBeUndefined();
  });

  // ── Response envelope ──────────────────────────────────────────────────────

  it('should always include status, statusCode, and data envelope', async () => {
    const res = await request(app)
      .get('/api/patients?service=general')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.body).toMatchObject({
      status: 'success',
      statusCode: 200,
      data: {
        service: 'general',
        count: expect.any(Number),
        patients: expect.any(Array),
      },
    });
  });

  // ── PatientService unit tests (no HTTP layer) ──────────────────────────────

  describe('PatientService.getPatientsByService', () => {
    const repo = new MockPatientRepository();
    const service = new PatientService(repo);

    it('should return general patients', async () => {
      const result = await service.getPatientsByService('general');
      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('general');
    });

    it('should return urgence patients with urgence fields', async () => {
      const result = await service.getPatientsByService('urgence');
      expect(result).toHaveLength(1);
      const p = result[0] as UrgencePatient;
      expect(p.niveau_triage).toBe(2);
    });

    it('should return oncologie patients with oncologie fields', async () => {
      const result = await service.getPatientsByService('oncologie');
      const p = result[0] as OncologiePatient;
      expect(p.stade).toBe('II');
    });

    it('should return cardiologie patients with cardiologie fields', async () => {
      const result = await service.getPatientsByService('cardiologie');
      const p = result[0] as CardiologiePatient;
      expect(p.frequence_cardiaque_repos).toBe(92);
    });
  });
});
