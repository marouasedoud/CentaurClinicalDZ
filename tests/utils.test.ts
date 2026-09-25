import { hashPassword, comparePassword, hashToken } from '../src/utils/crypto.util';
import {
  generateAuthTokens,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/utils/jwt.util';
import { UnauthorizedError } from '../src/utils/errors.util';

describe('Crypto & JWT Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('wrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Token Hashing (SHA-256)', () => {
    it('should produce consistent sha256 hash', () => {
      const token = 'sample-refresh-token-string';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toEqual(hash2);
      expect(hash1).toHaveLength(64); // 256 bits = 64 hex characters
    });
  });

  describe('JWT Operations', () => {
    const payload = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      username: 'john_doe',
    };

    it('should sign and verify access token', () => {
      const accessToken = signAccessToken(payload);
      expect(typeof accessToken).toBe('string');

      const verified = verifyAccessToken(accessToken);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.username).toBe(payload.username);
    });

    it('should sign and verify refresh token', () => {
      const refreshToken = signRefreshToken(payload);
      expect(typeof refreshToken).toBe('string');

      const verified = verifyRefreshToken(refreshToken);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.username).toBe(payload.username);
    });

    it('should generate both access and refresh tokens', () => {
      const tokens = generateAuthTokens(payload);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError when verifying corrupted token', () => {
      expect(() => verifyAccessToken('invalid.jwt.token')).toThrow(UnauthorizedError);
      expect(() => verifyRefreshToken('invalid.jwt.token')).toThrow(UnauthorizedError);
    });
  });
});
