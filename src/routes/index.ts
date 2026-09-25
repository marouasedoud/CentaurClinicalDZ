import { Router } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Patient management routes
router.use('/patients', patientRoutes);

export default router;
