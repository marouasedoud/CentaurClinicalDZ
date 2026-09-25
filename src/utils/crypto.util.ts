import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config';

/**
 * Hashes a plaintext password using bcrypt with configured salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.security.bcryptSaltRounds);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Produces a SHA-256 hash of a string (used to hash refresh tokens before storing in the database).
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
