import { Request, Response, NextFunction } from 'express';
import { AuthService, authService } from '../services/auth.service';

export class AuthController {
  constructor(private readonly authSvc: AuthService = authService) {}

  /**
   * POST /auth/register
   * Registers a new user with username and password.
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const result = await this.authSvc.register(username, password);

      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/login
   * Authenticates user credentials and returns token pair.
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const result = await this.authSvc.login(username, password);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/refresh
   * Rotates refresh token and returns a fresh token pair.
   */
  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authSvc.refreshToken(refreshToken);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Tokens refreshed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/logout
   * Invalidates the provided refresh token.
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await this.authSvc.logout(refreshToken);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
