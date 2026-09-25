import { IUserRepository, userRepository } from '../repositories/user.repository';
import { IRefreshTokenRepository, refreshTokenRepository } from '../repositories/refresh-token.repository';
import { SafeUser } from '../models/user.model';
import { AuthTokens, TokenPayload } from '../models/token.model';
import { hashPassword, comparePassword, hashToken } from '../utils/crypto.util';
import { generateAuthTokens, verifyRefreshToken } from '../utils/jwt.util';
import { ConflictError, UnauthorizedError } from '../utils/errors.util';
import { config } from '../config';

/**
 * Calculates expiration timestamp from duration string (e.g., '7d', '24h', '15m').
 */
function calculateExpirationDate(durationStr: string): Date {
  const match = durationStr.match(/^(\d+)([dhms])$/);
  const now = Date.now();
  if (!match) {
    return new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days fallback
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  let ms = 0;

  switch (unit) {
    case 'd':
      ms = value * 24 * 60 * 60 * 1000;
      break;
    case 'h':
      ms = value * 60 * 60 * 1000;
      break;
    case 'm':
      ms = value * 60 * 1000;
      break;
    case 's':
      ms = value * 1000;
      break;
  }

  return new Date(now + ms);
}

export interface AuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly tokenRepo: IRefreshTokenRepository = refreshTokenRepository
  ) {}

  /**
   * Registers a new user, hashes password, and returns user data + initial tokens.
   */
  async register(username: string, password: string): Promise<AuthResult> {
    const existingUser = await this.userRepo.findByUsername(username);
    if (existingUser) {
      throw new ConflictError('Username is already taken');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.userRepo.create({
      username,
      password_hash: passwordHash,
    });

    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
    };

    const tokens = generateAuthTokens(payload);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  /**
   * Authenticates user credentials and issues fresh tokens.
   */
  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
    };

    const tokens = generateAuthTokens(payload);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  /**
   * Rotates a refresh token: verifies current token, revokes it, and issues new token pair.
   */
  async refreshToken(rawRefreshToken: string): Promise<AuthResult> {
    // 1. Verify cryptographic JWT signature and expiration
    const payload = verifyRefreshToken(rawRefreshToken);

    // 2. Check persistence and revocation state in database via SHA-256 hash
    const tokenHashed = hashToken(rawRefreshToken);
    const storedToken = await this.tokenRepo.findByTokenHash(tokenHashed);

    if (!storedToken || storedToken.revoked) {
      throw new UnauthorizedError('Invalid or revoked refresh token');
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // 3. Token Rotation: revoke old refresh token
    await this.tokenRepo.revokeById(storedToken.id);

    // 4. Retrieve user record
    const user = await this.userRepo.findById(storedToken.user_id);
    if (!user) {
      throw new UnauthorizedError('User account no longer exists');
    }

    // 5. Issue brand new token pair
    const newPayload: TokenPayload = {
      sub: user.id,
      username: user.username,
    };
    const newTokens = generateAuthTokens(newPayload);
    await this.saveRefreshToken(user.id, newTokens.refreshToken);

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, tokens: newTokens };
  }

  /**
   * Revokes the provided refresh token so it cannot be used again.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHashed = hashToken(rawRefreshToken);
    await this.tokenRepo.revokeByTokenHash(tokenHashed);
  }

  /**
   * Hashes and persists a refresh token record.
   */
  private async saveRefreshToken(userId: string, rawToken: string): Promise<void> {
    const tokenHashed = hashToken(rawToken);
    const expiresAt = calculateExpirationDate(config.jwt.refreshExpiration);
    await this.tokenRepo.create(userId, tokenHashed, expiresAt);
  }
}

export const authService = new AuthService();
