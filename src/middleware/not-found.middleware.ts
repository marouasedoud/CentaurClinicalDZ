import { Request, Response } from 'express';

/**
 * 404 handler for routes that do not match any defined endpoint.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
}
