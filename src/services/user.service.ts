import { IUserRepository, userRepository } from '../repositories/user.repository';
import { SafeUser } from '../models/user.model';
import { NotFoundError } from '../utils/errors.util';

export class UserService {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  /**
   * Retrieves user profile by ID, omitting sensitive password hash.
   */
  async getUserProfile(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}

export const userService = new UserService();
