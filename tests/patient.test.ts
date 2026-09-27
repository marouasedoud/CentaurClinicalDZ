import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { PatientController } from '../src/controllers/patient.controller';
import { PatientService } from '../src/services/patient.service';
import { IPatientRepository } from '../src/repositories/patient.repository';
import { authenticate } from '../src/middleware/auth.middleware';
import { signAccessToken } from '../src/utils/jwt.util';
import { errorHandler } from '../src/middleware/error.middleware';
import { notFoundHandler } from '../src/middleware/not-found.middleware';
import {
  validateBody,
  validateQuery,
  createPatientSchema,
  getPatientsByServiceSchema,
  updatePatientSchema,
} from '../src/middleware/validate.middleware';
import type {
  PatientRow,
  PatientService as PatientServiceName,
  GeneralPatient,
  UrgencePatient,
  OncologiePatient,
  CardiologiePatient,
  CreatePatientInput,
  UpdatePatientInput,
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
    stade: 2,
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
  private readonly deletedPatientIds = new Set<string>();
  private readonly patientUpdates = new Map<string, UpdatePatientInput>();
  private readonly createdPatients: PatientRow[] = [];

  private withUpdates<T extends PatientRow>(patients: T[]): T[] {
    return patients
      .filter((patient) => !this.deletedPatientIds.has(patient.id))
      .map((patient) => Object.assign({}, patient, this.patientUpdates.get(patient.id)));
  }

  async findByService(service: PatientServiceName): Promise<PatientRow[]> {
    switch (service) {
      case 'general':
        return this.withUpdates([
          ...generalPatients,
          ...this.createdPatients.filter((patient) => patient.service === 'general'),
        ]);
      case 'urgence':
        return this.withUpdates([
          ...urgencePatients,
          ...this.createdPatients.filter((patient) => patient.service === 'urgence'),
        ]);
      case 'oncologie':
        return this.withUpdates([
          ...oncologiePatients,
          ...this.createdPatients.filter((patient) => patient.service === 'oncologie'),
        ]);
      case 'cardiologie':
        return this.withUpdates([
          ...cardiologiePatients,
          ...this.createdPatients.filter((patient) => patient.service === 'cardiologie'),
        ]);
    }
  }

  async createPatient(input: CreatePatientInput): Promise<PatientRow> {
    const commonFields = {
      id: `created-${this.createdPatients.length + 1}`,
      nom: input.nom,
      prenom: input.prenom,
      date_hospitalisation: input.date_hospitalisation,
      created_at: new Date(),
      updated_at: new Date(),
    };

    let patient: PatientRow;
    switch (input.service) {
      case 'general':
        patient = { ...commonFields, service: 'general' };
        break;
      case 'urgence':
        patient = {
          ...commonFields,
          service: 'urgence',
          heure_arrivee: input.heure_arrivee,
          niveau_triage: input.niveau_triage,
          gravite_initiale: input.gravite_initiale,
        };
        break;
      case 'oncologie':
        patient = {
          ...commonFields,
          service: 'oncologie',
          type_tumeur: input.type_tumeur,
          stade: input.stade,
          traitement_en_cours: input.traitement_en_cours,
        };
        break;
      case 'cardiologie':
        patient = {
          ...commonFields,
          service: 'cardiologie',
          resultats_ecg: input.resultats_ecg,
          frequence_cardiaque_repos: input.frequence_cardiaque_repos,
          tension_arterielle: input.tension_arterielle,
        };
        break;
    }

    this.createdPatients.push(patient);
    return patient;
  }

  async findServiceById(id: string): Promise<PatientServiceName | null> {
    const patient = [
      ...generalPatients,
      ...urgencePatients,
      ...oncologiePatients,
      ...cardiologiePatients,
      ...this.createdPatients,
    ].find((candidate) => candidate.id === id && !this.deletedPatientIds.has(id));
    return patient?.service ?? null;
  }

  async updateById(id: string, updates: UpdatePatientInput): Promise<boolean> {
    const patientExists = [
      ...generalPatients,
      ...urgencePatients,
      ...oncologiePatients,
      ...cardiologiePatients,
      ...this.createdPatients,
    ].some((patient) => patient.id === id && !this.deletedPatientIds.has(id));

    if (patientExists) {
      this.patientUpdates.set(id, { ...this.patientUpdates.get(id), ...updates });
    }

    return patientExists;
  }

  async deleteById(id: string): Promise<boolean> {
    const patientExists = [
      ...generalPatients,
      ...urgencePatients,
      ...oncologiePatients,
      ...cardiologiePatients,
      ...this.createdPatients,
    ].some((patient) => patient.id === id && !this.deletedPatientIds.has(id));

    if (patientExists) {
      this.deletedPatientIds.add(id);
    }

    return patientExists;
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
  app.post(
    '/api/patients',
    authenticate,
    validateBody(createPatientSchema),
    controller.create
  );
  app.patch(
    '/api/patients/:id',
    authenticate,
    validateBody(updatePatientSchema),
    controller.updateById
  );
  app.delete('/api/patients/:id', authenticate, controller.deleteById);

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

    it('should return 401 when access token has expired', async () => {
      const expiredToken = jwt.sign(
        { username: 'dr_tester' },
        config.jwt.accessSecret,
        { expiresIn: '-10s', subject: 'user-001' }
      );

      const res = await request(app)
        .get('/api/patients?service=general')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toContain('Access token has expired');
    });

    it('should return 401 when token is signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { username: 'dr_tester' },
        config.jwt.refreshSecret, // Signed with refresh secret instead of access secret
        { expiresIn: '15m', subject: 'user-001' }
      );

      const res = await request(app)
        .get('/api/patients?service=general')
        .set('Authorization', `Bearer ${wrongSecretToken}`);
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
    expect(patient.stade).toBe(2);
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
      expect(p.stade).toBe(2);
    });

    it('should return cardiologie patients with cardiologie fields', async () => {
      const result = await service.getPatientsByService('cardiologie');
      const p = result[0] as CardiologiePatient;
      expect(p.frequence_cardiaque_repos).toBe(92);
    });
  });

  describe('PatientService.createPatient', () => {
    it('should return the created patient with the selected service details', async () => {
      const service = new PatientService(new MockPatientRepository());
      const input: CreatePatientInput = {
        service: 'oncologie',
        nom: 'Test',
        prenom: 'Patient',
        date_hospitalisation: '2026-09-27',
        type_tumeur: 'Carcinome',
        stade: 3,
        traitement_en_cours: 'Radiothérapie',
      };

      await expect(service.createPatient(input)).resolves.toMatchObject({
        service: 'oncologie',
        nom: 'Test',
        stade: 3,
      });
    });
  });

  describe('PatientService.updatePatient', () => {
    it('should update only the provided patient fields', async () => {
      const service = new PatientService(new MockPatientRepository());

      await service.updatePatient('aaaa-0001', { nom: 'Updated' });

      const [patient] = await service.getPatientsByService('general');
      expect(patient).toMatchObject({ nom: 'Updated', prenom: 'Amina' });
    });

    it('should reject specialty fields that do not match the patient service', async () => {
      const service = new PatientService(new MockPatientRepository());

      await expect(service.updatePatient('aaaa-0001', { stade: 2 }))
        .rejects.toThrow('stade can only be updated for oncologie patients');
    });

    it('should throw when the patient does not exist', async () => {
      const service = new PatientService(new MockPatientRepository());

      await expect(service.updatePatient('does-not-exist', { nom: 'Updated' }))
        .rejects.toThrow('Patient not found');
    });
  });
});

describe('POST /api/patients — Create Patient Endpoint', () => {
  let app: Application;
  let validToken: string;

  beforeEach(() => {
    app = createTestApp();
    validToken = signAccessToken({ sub: 'user-001', username: 'dr_tester' });
  });

  it.each([
    [
      'general',
      {
        service: 'general',
        nom: 'Test',
        prenom: 'General',
        date_hospitalisation: '2026-09-27',
      },
    ],
    [
      'urgence',
      {
        service: 'urgence',
        nom: 'Test',
        prenom: 'Urgence',
        date_hospitalisation: '2026-09-27',
        heure_arrivee: '10:30:00',
        niveau_triage: 1,
        gravite_initiale: 'Urgent assessment',
      },
    ],
    [
      'oncologie',
      {
        service: 'oncologie',
        nom: 'Test',
        prenom: 'Oncologie',
        date_hospitalisation: '2026-09-27',
        type_tumeur: 'Carcinome',
        stade: 4,
        traitement_en_cours: 'Radiothérapie',
      },
    ],
    [
      'cardiologie',
      {
        service: 'cardiologie',
        nom: 'Test',
        prenom: 'Cardiologie',
        date_hospitalisation: '2026-09-27',
        resultats_ecg: 'Rythme sinusal',
        frequence_cardiaque_repos: 72,
        tension_arterielle: '120/80',
      },
    ],
  ])('should create a %s patient', async (_service, body) => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${validToken}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'success',
      statusCode: 201,
      data: { id: expect.any(String), ...body },
    });

    const patients = await request(app)
      .get(`/api/patients?service=${body.service}`)
      .set('Authorization', `Bearer ${validToken}`);
    expect(patients.body.data.patients).toContainEqual(expect.objectContaining(body));
  });

  it.each(['10:30', '10:30:00'])('should accept an urgency arrival time of %s', async (heure_arrivee) => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        service: 'urgence',
        nom: 'Test',
        prenom: 'Urgence',
        date_hospitalisation: '2026-09-27',
        heure_arrivee,
        niveau_triage: 2,
        gravite_initiale: 'Urgent assessment',
      });

    expect(res.status).toBe(201);
  });

  it.each([
    { service: 'general', nom: 'Test', date_hospitalisation: '2026-09-27' },
    {
      service: 'urgence',
      nom: 'Test',
      prenom: 'Missing detail',
      date_hospitalisation: '2026-09-27',
      heure_arrivee: '10:30:00',
      niveau_triage: 2,
    },
    {
      service: 'urgence',
      nom: 'Test',
      prenom: 'Invalid triage',
      date_hospitalisation: '2026-09-27',
      heure_arrivee: '10:30:00',
      niveau_triage: 6,
      gravite_initiale: 'Urgent assessment',
    },
    {
      service: 'urgence',
      nom: 'Test',
      prenom: 'Invalid triage',
      date_hospitalisation: '2026-09-27',
      heure_arrivee: '10:30:00',
      niveau_triage: 0,
      gravite_initiale: 'Urgent assessment',
    },
    {
      service: 'oncologie',
      nom: 'Test',
      prenom: 'Invalid stage',
      date_hospitalisation: '2026-09-27',
      type_tumeur: 'Carcinome',
      stade: 5,
      traitement_en_cours: 'Radiothérapie',
    },
    {
      service: 'oncologie',
      nom: 'Test',
      prenom: 'Invalid stage',
      date_hospitalisation: '2026-09-27',
      type_tumeur: 'Carcinome',
      stade: 0,
      traitement_en_cours: 'Radiothérapie',
    },
    {
      service: 'cardiologie',
      nom: 'Test',
      prenom: 'Invalid heart rate',
      date_hospitalisation: '2026-09-27',
      resultats_ecg: 'Rythme sinusal',
      frequence_cardiaque_repos: 0,
      tension_arterielle: '120/80',
    },
    {
      service: 'radiologie',
      nom: 'Test',
      prenom: 'Invalid service',
      date_hospitalisation: '2026-09-27',
    },
  ])('should reject missing or invalid patient data', async (body) => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${validToken}`)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });
});

describe('DELETE /api/patients/:id — Delete Patient Endpoint', () => {
  let app: Application;
  let validToken: string;

  beforeEach(() => {
    app = createTestApp();
    validToken = signAccessToken({ sub: 'user-001', username: 'dr_tester' });
  });

  it('should delete an existing patient', async () => {
    const res = await request(app)
      .delete('/api/patients/aaaa-0001')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'success',
      statusCode: 200,
      data: { id: 'aaaa-0001' },
    });

    const patients = await request(app)
      .get('/api/patients?service=general')
      .set('Authorization', `Bearer ${validToken}`);
    expect(patients.body.data.patients).toHaveLength(0);
  });

  it('should return 404 when the patient does not exist', async () => {
    const res = await request(app)
      .delete('/api/patients/does-not-exist')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      message: 'Patient not found',
    });
  });
});

describe('PATCH /api/patients/:id — Update Patient Endpoint', () => {
  let app: Application;
  let validToken: string;

  beforeEach(() => {
    app = createTestApp();
    validToken = signAccessToken({ sub: 'user-001', username: 'dr_tester' });
  });

  it('should update only the fields provided', async () => {
    const res = await request(app)
      .patch('/api/patients/aaaa-0001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ nom: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'success',
      statusCode: 200,
      data: { id: 'aaaa-0001', nom: 'Updated' },
    });
    expect(res.body.data.prenom).toBeUndefined();

    const patients = await request(app)
      .get('/api/patients?service=general')
      .set('Authorization', `Bearer ${validToken}`);
    expect(patients.body.data.patients[0]).toMatchObject({
      nom: 'Updated',
      prenom: 'Amina',
      date_hospitalisation: '2026-09-10',
    });
  });

  it.each([
    [
      'urgence',
      'bbbb-0001',
      {
        heure_arrivee: '09:15:00',
        niveau_triage: 3,
        gravite_initiale: 'Updated emergency details',
      },
    ],
    [
      'oncologie',
      'cccc-0001',
      {
        type_tumeur: 'Updated tumour',
        stade: 3,
        traitement_en_cours: 'Updated treatment',
      },
    ],
    [
      'cardiologie',
      'dddd-0001',
      {
        resultats_ecg: 'Updated ECG',
        frequence_cardiaque_repos: 75,
        tension_arterielle: '120/80',
      },
    ],
  ])('should update %s service-specific fields', async (service, id, updates) => {
    const res = await request(app)
      .patch(`/api/patients/${id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(updates);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id, ...updates });

    const patients = await request(app)
      .get(`/api/patients?service=${service}`)
      .set('Authorization', `Bearer ${validToken}`);
    expect(patients.body.data.patients[0]).toMatchObject(updates);
  });

  it.each(['09:15', '09:15:00'])('should accept an urgency arrival time of %s', async (heure_arrivee) => {
    const res = await request(app)
      .patch('/api/patients/bbbb-0001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ heure_arrivee });

    expect(res.status).toBe(200);
  });

  it('should return 404 when the patient does not exist', async () => {
    const res = await request(app)
      .patch('/api/patients/does-not-exist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ nom: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      message: 'Patient not found',
    });
  });

  it.each([1, 4])('should accept oncology stage %i', async (stade) => {
    const res = await request(app)
      .patch('/api/patients/cccc-0001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ stade });

    expect(res.status).toBe(200);
    const patients = await request(app)
      .get('/api/patients?service=oncologie')
      .set('Authorization', `Bearer ${validToken}`);
    expect(patients.body.data.patients[0].stade).toBe(stade);
  });

  it.each([0, 5, 2.5, '2'])('should reject invalid oncology stage %s', async (stade) => {
    const res = await request(app)
      .patch('/api/patients/cccc-0001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ stade });

    expect(res.status).toBe(400);
  });

  it.each([1, 5])('should accept triage level %i', async (niveau_triage) => {
    const res = await request(app)
      .patch('/api/patients/bbbb-0001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ niveau_triage });

    expect(res.status).toBe(200);
    const patients = await request(app)
      .get('/api/patients?service=urgence')
      .set('Authorization', `Bearer ${validToken}`);
    expect(patients.body.data.patients[0].niveau_triage).toBe(niveau_triage);
  });

  it.each([0, 6, 2.5, '2'])('should reject invalid triage level %s', async (niveau_triage) => {
    const res = await request(app)
      .patch('/api/patients/bbbb-0001')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ niveau_triage });

    expect(res.status).toBe(400);
  });
});
