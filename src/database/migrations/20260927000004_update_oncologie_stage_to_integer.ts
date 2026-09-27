import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
    ALTER TABLE oncologie
    ALTER COLUMN stade TYPE integer
    USING CASE upper(stade)
      WHEN 'I' THEN 1
      WHEN 'II' THEN 2
      WHEN 'III' THEN 3
      WHEN 'IV' THEN 4
      ELSE stade::integer
    END
  `);
    await knex.raw(
        'ALTER TABLE oncologie ADD CONSTRAINT oncologie_stade_check CHECK (stade BETWEEN 1 AND 4)'
    );
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw('ALTER TABLE oncologie DROP CONSTRAINT oncologie_stade_check');
    await knex.raw(`
    ALTER TABLE oncologie
    ALTER COLUMN stade TYPE varchar(20)
    USING CASE stade
      WHEN 1 THEN 'I'
      WHEN 2 THEN 'II'
      WHEN 3 THEN 'III'
      WHEN 4 THEN 'IV'
    END
  `);
}