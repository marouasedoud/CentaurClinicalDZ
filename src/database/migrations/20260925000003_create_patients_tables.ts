import { Knex } from 'knex';

export const SERVICE_VALUES = ['general', 'urgence', 'oncologie', 'cardiologie'] as const;

export async function up(knex: Knex): Promise<void> {
  // 1. patients table (common fields)
  await knex.schema.createTable('patients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('nom', 100).notNullable();
    table.string('prenom', 100).notNullable();
    table.date('date_hospitalisation').notNullable();
    table
      .enu('service', SERVICE_VALUES as unknown as string[], {
        useNative: true,
        enumName: 'patient_service',
      })
      .notNullable()
      .index();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // 2. urgence — service-specific detail table
  await knex.schema.createTable('urgence', (table) => {
    table
      .uuid('patient_id')
      .primary()
      .references('id')
      .inTable('patients')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.time('heure_arrivee').notNullable();
    table.integer('niveau_triage').notNullable().checkBetween([1, 5]);
    table.string('gravite_initiale', 100).notNullable();
  });

  // 3. oncologie — service-specific detail table
  await knex.schema.createTable('oncologie', (table) => {
    table
      .uuid('patient_id')
      .primary()
      .references('id')
      .inTable('patients')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('type_tumeur', 150).notNullable();
    table.string('stade', 20).notNullable(); // e.g. "I", "II", "III", "IV"
    table.string('traitement_en_cours', 255).notNullable();
  });

  // 4. cardiologie — service-specific detail table
  await knex.schema.createTable('cardiologie', (table) => {
    table
      .uuid('patient_id')
      .primary()
      .references('id')
      .inTable('patients')
      .onDelete('CASCADE')
      .onUpdate('CASCADE');
    table.string('resultats_ecg', 255).notNullable();
    table.integer('frequence_cardiaque_repos').notNullable(); // BPM
    table.string('tension_arterielle', 20).notNullable(); // e.g. "120/80"
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cardiologie');
  await knex.schema.dropTableIfExists('oncologie');
  await knex.schema.dropTableIfExists('urgence');
  await knex.schema.dropTableIfExists('patients');
  await knex.schema.raw('DROP TYPE IF EXISTS patient_service');
}
