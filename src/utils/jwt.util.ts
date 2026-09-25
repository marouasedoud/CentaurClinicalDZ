import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { TokenPayload, AuthTokens } from '../models/token.model';
import { UnauthorizedError } from './errors.util';

/**
 * Signs a short-lived access token.
 */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiration as SignOptions['expiresIn'],
    subject: payload.sub,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign({ username: payload.username }, config.jwt.accessSecret, options);
}

/**
 * Signs a long-lived refresh token.
 */
export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiration as SignOptions['expiresIn'],
    subject: payload.sub,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign({ username: payload.username }, config.jwt.refreshSecret, options);
}

/**
 * Generates both access and refresh tokens for a user.
 */
export function generateAuthTokens(payload: TokenPayload): AuthTokens {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * Verifies and decodes an access token.
 */
export function verifyAccessToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    if (!decoded.sub || !decoded.username) {
      throw new UnauthorizedError('Invalid access token payload');
    }
    return {
      sub: decoded.sub as string,
      username: decoded.username as string,
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}

/**
 * Verifies and decodes a refresh token.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    if (!decoded.sub || !decoded.username) {
      throw new UnauthorizedError('Invalid refresh token payload');
    }
    return {
      sub: decoded.sub as string,
      username: decoded.username as string,
    };
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token has expired');
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
}
