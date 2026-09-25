import { Knex } from 'knex';
import { hashPassword } from '../../utils/crypto.util';

/**
 * Seed: demo user account.
 *
 * Creates a single ready-to-use account for testing / demo purposes.
 * The password is hashed with bcrypt using the same `hashPassword` utility
 * that the AuthService uses during normal registration — no difference.
 *
 * Credentials:
 *   username : maroua
 *   password : TestTest01
 *
 * Safe to run multiple times: upserts the password hash so these credentials
 * remain usable even if the account already exists.
 */
export async function seed(knex: Knex): Promise<void> {
  const username = 'maroua';
  const plainPassword = 'TestTest01';

  // Use the same hashing function as AuthService.register()
  const passwordHash = await hashPassword(plainPassword);

  await knex('users')
    .insert({
      username,
      password_hash: passwordHash,
    })
    .onConflict('username')
    .merge({
      password_hash: passwordHash,
      updated_at: knex.fn.now(),
    });
}