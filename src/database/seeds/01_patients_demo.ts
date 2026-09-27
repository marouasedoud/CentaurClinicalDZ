import { Knex } from 'knex';

/**
 * Seed script that inserts demo patients across all four services.
 * Safe to run multiple times: clears existing patients data before inserting.
 */
export async function seed(knex: Knex): Promise<void> {
  // Delete detail tables first (FK constraints), then parent
  await knex('cardiologie').del();
  await knex('oncologie').del();
  await knex('urgence').del();
  await knex('patients').del();

  // ── General service patients ──────────────────────────────────────────────
  const [generalA] = await knex('patients')
    .insert({
      nom: 'Benali',
      prenom: 'Amina',
      date_hospitalisation: '2026-09-10',
      service: 'general',
    })
    .returning('id');

  const [generalB] = await knex('patients')
    .insert({
      nom: 'Kaci',
      prenom: 'Youcef',
      date_hospitalisation: '2026-09-15',
      service: 'general',
    })
    .returning('id');

  // ── Urgence patients ──────────────────────────────────────────────────────
  const [urgenceA] = await knex('patients')
    .insert({
      nom: 'Hamidi',
      prenom: 'Sonia',
      date_hospitalisation: '2026-09-20',
      service: 'urgence',
    })
    .returning('id');

  const [urgenceB] = await knex('patients')
    .insert({
      nom: 'Messaoud',
      prenom: 'Rachid',
      date_hospitalisation: '2026-09-22',
      service: 'urgence',
    })
    .returning('id');

  await knex('urgence').insert([
    {
      patient_id: urgenceA.id,
      heure_arrivee: '08:45:00',
      niveau_triage: 2,
      gravite_initiale: 'Douleur thoracique aiguë',
    },
    {
      patient_id: urgenceB.id,
      heure_arrivee: '14:30:00',
      niveau_triage: 4,
      gravite_initiale: 'Lacération mineure au bras',
    },
  ]);

  // ── Oncologie patients ────────────────────────────────────────────────────
  const [oncoA] = await knex('patients')
    .insert({
      nom: 'Touati',
      prenom: 'Leila',
      date_hospitalisation: '2026-08-01',
      service: 'oncologie',
    })
    .returning('id');

  const [oncoB] = await knex('patients')
    .insert({
      nom: 'Aissaoui',
      prenom: 'Karim',
      date_hospitalisation: '2026-08-15',
      service: 'oncologie',
    })
    .returning('id');

  await knex('oncologie').insert([
    {
      patient_id: oncoA.id,
      type_tumeur: 'Carcinome mammaire',
      stade: 2,
      traitement_en_cours: 'Chimiothérapie - Cycle 3',
    },
    {
      patient_id: oncoB.id,
      type_tumeur: 'Lymphome hodgkinien',
      stade: 3,
      traitement_en_cours: 'Radiothérapie combinée',
    },
  ]);

  // ── Cardiologie patients ──────────────────────────────────────────────────
  const [cardioA] = await knex('patients')
    .insert({
      nom: 'Zerrouk',
      prenom: 'Omar',
      date_hospitalisation: '2026-09-05',
      service: 'cardiologie',
    })
    .returning('id');

  const [cardioB] = await knex('patients')
    .insert({
      nom: 'Boudiaf',
      prenom: 'Fatima',
      date_hospitalisation: '2026-09-18',
      service: 'cardiologie',
    })
    .returning('id');

  await knex('cardiologie').insert([
    {
      patient_id: cardioA.id,
      resultats_ecg: 'Fibrillation auriculaire',
      frequence_cardiaque_repos: 92,
      tension_arterielle: '145/95',
    },
    {
      patient_id: cardioB.id,
      resultats_ecg: 'Rythme sinusal normal',
      frequence_cardiaque_repos: 68,
      tension_arterielle: '118/76',
    },
  ]);

  // Suppress unused variable warnings — IDs are used only for FK insertion
  void generalA;
  void generalB;
}
