import request from 'supertest';
import express, { Application } from 'express';
import { AuthController } from '../src/controllers/auth.controller';
import { UserController } from '../src/controllers/user.controller';
import { AuthService } from '../src/services/auth.service';
import { UserService } from '../src/services/user.service';
import { IUserRepository } from '../src/repositories/user.repository';
import { IRefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { User, CreateUserInput } from '../src/models/user.model';
import { RefreshToken } from '../src/models/token.model';
import { authenticate } from '../src/middleware/auth.middleware';
import {
  validateBody,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../src/middleware/validate.middleware';
import { errorHandler } from '../src/middleware/error.middleware';
import { notFoundHandler } from '../src/middleware/not-found.middleware';

// In-Memory Mocks for complete end-to-end HTTP testing
class InMemoryUserRepo implements IUserRepository {
  public users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (
      this.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null
    );
  }

  async create(data: CreateUserInput): Promise<User> {
    const user: User = {
      id: `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: data.username,
      password_hash: data.password_hash,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(user);
    return user;
  }
}

class InMemoryTokenRepo implements IRefreshTokenRepository {
  public tokens: RefreshToken[] = [];

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const token: RefreshToken = {
      id: `token-${Date.now()}`,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked: false,
      created_at: new Date(),
    };
    this.tokens.push(token);
    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.tokens.find((t) => t.token_hash === tokenHash) || null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    const found = this.tokens.find((t) => t.token_hash === tokenHash);
    if (found) found.revoked = true;
  }

  async revokeById(id: string): Promise<void> {
    const found = this.tokens.find((t) => t.id === id);
    if (found) found.revoked = true;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    this.tokens.filter((t) => t.user_id === userId).forEach((t) => (t.revoked = true));
  }

  async deleteExpired(): Promise<number> {
    const initial = this.tokens.length;
    this.tokens = this.tokens.filter((t) => new Date(t.expires_at) >= new Date());
    return initial - this.tokens.length;
  }
}

function createTestApp() {
  const userRepo = new InMemoryUserRepo();
  const tokenRepo = new InMemoryTokenRepo();

  const authService = new AuthService(userRepo, tokenRepo);
  const userService = new UserService(userRepo);

  const authController = new AuthController(authService);
  const userController = new UserController(userService);

  const app: Application = express();
  app.use(express.json());

  // Mount API endpoints
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/register', validateBody(registerSchema), authController.register);
  app.post('/api/auth/login', validateBody(loginSchema), authController.login);
  app.post('/api/auth/refresh', validateBody(refreshTokenSchema), authController.refresh);
  app.post('/api/auth/logout', validateBody(refreshTokenSchema), authController.logout);

  // Protected /me endpoint (both under /api/auth/me and /me)
  app.get('/api/auth/me', authenticate, userController.getMe);
  app.get('/me', authenticate, userController.getMe);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

describe('End-to-End Authentication API Endpoints', () => {
  let app: Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 when input validation fails (short password)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'validuser',
        password: '123', // Less than 8 chars
      });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Validation failed');
    });

    it('should register a new user and return status 201 with tokens', async () => {
      const res = await request(app).post('/api/auth/register').send({
        username: 'alice_smith',
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.username).toBe('alice_smith');
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 409 Conflict if username is already taken', async () => {
      await request(app).post('/api/auth/register').send({
        username: 'duplicate_user',
        password: 'SecurePassword123!',
      });

      const res = await request(app).post('/api/auth/register').send({
        username: 'duplicate_user',
        password: 'AnotherPassword456!',
      });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Username is already taken');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        username: 'login_tester',
        password: 'ValidPassword123!',
      });
    });

    it('should login successfully and return 200 with tokens', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'login_tester',
        password: 'ValidPassword123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 when password does not match', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'login_tester',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid username or password');
    });

    it('should return 401 when user does not exist', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'non_existent_user',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected /me Endpoint', () => {
    let accessToken: string;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send({
        username: 'me_tester',
        password: 'ValidPassword123!',
      });
      accessToken = reg.body.data.tokens.accessToken;
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authorization header is missing');
    });

    it('should return 401 when token format is invalid', async () => {
      const res = await request(app)
        .get('/me')
        .set('Authorization', 'InvalidFormatString');
      expect(res.status).toBe(401);
    });

    it('should return 200 and user profile with valid Bearer token on /me', async () => {
      const res = await request(app)
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.username).toBe('me_tester');
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should return 200 and user profile on /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.username).toBe('me_tester');
    });
  });

  describe('POST /api/auth/refresh (Token Rotation)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send({
        username: 'refresh_tester',
        password: 'ValidPassword123!',
      });
      refreshToken = reg.body.data.tokens.refreshToken;
    });

    it('should rotate refresh token and issue new token pair', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).not.toEqual(refreshToken);

      // Verify that old refresh token cannot be reused
      const replayRes = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });
      expect(replayRes.status).toBe(401);
      expect(replayRes.body.message).toContain('Invalid or revoked refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send({
        username: 'logout_tester',
        password: 'ValidPassword123!',
      });
      refreshToken = reg.body.data.tokens.refreshToken;
    });

    it('should invalidate refresh token and prevent subsequent refresh attempts', async () => {
      const logoutRes = await request(app).post('/api/auth/logout').send({
        refreshToken,
      });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe('Logged out successfully');

      // Attempting to refresh with the revoked token must return 401
      const refreshRes = await request(app).post('/api/auth/refresh').send({
        refreshToken,
      });
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('404 Fallback Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown/endpoint');
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Endpoint GET /api/unknown/endpoint not found');
    });
  });
});
