import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateBody,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../middleware/validate.middleware';

const router = Router();

// Public routes
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/logout', validateBody(refreshTokenSchema), authController.logout);

// Protected route
router.get('/me', authenticate, userController.getMe);

export default router;
