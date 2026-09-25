import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { UnauthorizedError } from '../utils/errors.util';

export interface AuthenticatedUser {
  userId: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware that validates the Bearer JWT access token and attaches the authenticated user to the request.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new UnauthorizedError('Authorization header is missing'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new UnauthorizedError('Authorization format must be "Bearer <token>"'));
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.sub,
      username: payload.username,
    };
    next();
  } catch (error) {
    next(error);
  }
}
