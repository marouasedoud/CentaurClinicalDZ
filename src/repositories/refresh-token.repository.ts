import { Knex } from 'knex';
import { db } from '../database/connection';
import { RefreshToken } from '../models/token.model';

export interface IRefreshTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeById(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}

export class RefreshTokenRepository implements IRefreshTokenRepository {
  private readonly tableName = 'refresh_tokens';

  constructor(private readonly knexClient: Knex = db) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const [tokenRecord] = await this.knexClient<RefreshToken>(this.tableName)
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked: false,
      })
      .returning('*');
    return tokenRecord;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const record = await this.knexClient<RefreshToken>(this.tableName)
      .where({ token_hash: tokenHash })
      .first();
    return record || null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.knexClient(this.tableName)
      .where({ token_hash: tokenHash })
      .update({ revoked: true });
  }

  async revokeById(id: string): Promise<void> {
    await this.knexClient(this.tableName)
      .where({ id })
      .update({ revoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.knexClient(this.tableName)
      .where({ user_id: userId })
      .update({ revoked: true });
  }

  async deleteExpired(): Promise<number> {
    return this.knexClient(this.tableName)
      .where('expires_at', '<', new Date())
      .del();
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
