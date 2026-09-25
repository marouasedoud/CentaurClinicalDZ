import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.util';
import { config } from '../config';

/**
 * Centralized application error handling middleware.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle AppError and known domain errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      statusCode: err.statusCode,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(config.env === 'development' ? { stack: err.stack } : {}),
    });
    return;
  }

  // Handle malformed JSON body errors from express.json()
  if ('type' in err && (err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Invalid JSON payload in request body',
    });
    return;
  }

  // Unhandled / unexpected internal errors
  if (config.env !== 'test') {
    console.error('Unhandled Server Error:', err);
  }

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: 'An unexpected internal server error occurred',
    ...(config.env === 'development' ? { stack: err.stack, originalError: err.message } : {}),
  });
}
