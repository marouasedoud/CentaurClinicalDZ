import { Request, Response, NextFunction } from 'express';
import { UserService, userService } from '../services/user.service';
import { UnauthorizedError } from '../utils/errors.util';

export class UserController {
  constructor(private readonly userSvc: UserService = userService) { }

  /**
   * GET or /auth/me
   * Returns current authenticated user profile.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new UnauthorizedError('User authentication context missing');
      }

      const user = await this.userSvc.getUserProfile(req.user.userId);

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();
