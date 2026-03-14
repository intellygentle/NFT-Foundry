import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} —`, error.message);

  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid format';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  } else if (error.message?.includes('SHELBY_PRIVATE_KEY')) {
    statusCode = 503;
    message = 'Shelby storage not configured — set SHELBY_PRIVATE_KEY in .env';
  } else if (error.message?.includes('Factory contract not deployed')) {
    statusCode = 503;
    message = error.message;
  }

  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
};