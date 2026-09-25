import { AuthService } from '../src/services/auth.service';
import { IUserRepository } from '../src/repositories/user.repository';
import { IRefreshTokenRepository } from '../src/repositories/refresh-token.repository';
import { User, CreateUserInput } from '../src/models/user.model';
import { RefreshToken } from '../src/models/token.model';
import { ConflictError, UnauthorizedError } from '../src/utils/errors.util';
import { hashPassword } from '../src/utils/crypto.util';

// In-Memory User Repository Mock
class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (
      this.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null
    );
  }

  async create(data: CreateUserInput): Promise<User> {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: data.username,
      password_hash: data.password_hash,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }
}

// In-Memory Refresh Token Repository Mock
class MockRefreshTokenRepository implements IRefreshTokenRepository {
  private tokens: RefreshToken[] = [];

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const newToken: RefreshToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked: false,
      created_at: new Date(),
    };
    this.tokens.push(newToken);
    return newToken;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.tokens.find((t) => t.token_hash === tokenHash) || null;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    const token = this.tokens.find((t) => t.token_hash === tokenHash);
    if (token) token.revoked = true;
  }

  async revokeById(id: string): Promise<void> {
    const token = this.tokens.find((t) => t.id === id);
    if (token) token.revoked = true;
  }

  async revokeAllForUser(userId: string): Promise<void> {
    this.tokens.filter((t) => t.user_id === userId).forEach((t) => (t.revoked = true));
  }

  async deleteExpired(): Promise<number> {
    const initialCount = this.tokens.length;
    this.tokens = this.tokens.filter((t) => new Date(t.expires_at) >= new Date());
    return initialCount - this.tokens.length;
  }
}

describe('AuthService Business Logic', () => {
  let authService: AuthService;
  let userRepo: MockUserRepository;
  let tokenRepo: MockRefreshTokenRepository;

  beforeEach(() => {
    userRepo = new MockUserRepository();
    tokenRepo = new MockRefreshTokenRepository();
    authService = new AuthService(userRepo, tokenRepo);
  });

  describe('User Registration', () => {
    it('should register a new user successfully and issue tokens', async () => {
      const result = await authService.register('testuser', 'Password123!');

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect((result.user as any).password_hash).toBeUndefined(); // Never leak password hash
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw ConflictError if username is already registered', async () => {
      await authService.register('duplicateuser', 'Password123!');

      await expect(
        authService.register('duplicateuser', 'DifferentPassword123!')
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      const passwordHash = await hashPassword('correctPassword');
      await userRepo.create({
        username: 'existinguser',
        password_hash: passwordHash,
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login('existinguser', 'correctPassword');

      expect(result.user.username).toBe('existinguser');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError with invalid password', async () => {
      await expect(
        authService.login('existinguser', 'wrongPassword')
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when user does not exist', async () => {
      await expect(
        authService.login('nonexistent', 'password123')
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Token Refresh & Rotation', () => {
    it('should rotate tokens and revoke previous refresh token', async () => {
      const { tokens: initialTokens } = await authService.register(
        'rotatetest',
        'Password123!'
      );

      // Refreshing with valid token
      const refreshed = await authService.refreshToken(initialTokens.refreshToken);

      expect(refreshed.tokens.accessToken).toBeDefined();
      expect(refreshed.tokens.refreshToken).toBeDefined();
      expect(refreshed.tokens.refreshToken).not.toEqual(initialTokens.refreshToken);

      // Attempting to reuse the old refresh token must fail (Token Reuse Prevention)
      await expect(
        authService.refreshToken(initialTokens.refreshToken)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('User Logout', () => {
    it('should invalidate refresh token upon logout', async () => {
      const { tokens } = await authService.register('logoutuser', 'Password123!');

      // User logs out
      await authService.logout(tokens.refreshToken);

      // Subsequent refresh must fail
      await expect(authService.refreshToken(tokens.refreshToken)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });
});
