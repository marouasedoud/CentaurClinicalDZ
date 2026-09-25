import { Knex } from 'knex';
import { db } from '../database/connection';
import { User, CreateUserInput } from '../models/user.model';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
}

export class UserRepository implements IUserRepository {
  private readonly tableName = 'users';

  constructor(private readonly knexClient: Knex = db) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.knexClient<User>(this.tableName)
      .where({ id })
      .first();
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.knexClient<User>(this.tableName)
      .whereRaw('LOWER(username) = LOWER(?)', [username])
      .first();
    return user || null;
  }

  async create(data: CreateUserInput): Promise<User> {
    const [created] = await this.knexClient<User>(this.tableName)
      .insert({
        username: data.username,
        password_hash: data.password_hash,
      })
      .returning('*');
    return created;
  }
}

export const userRepository = new UserRepository();
