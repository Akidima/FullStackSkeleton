import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';

interface ErrorResponse {
  status: string;
  message: string;
  type?: string;
  details?: any;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    details: (err as any).details
  });

  const response: ErrorResponse = {
    status: 'error',
    message: err.message || 'Internal server error'
  };

  // Handle AppError and its subclasses
  if (err instanceof AppError) {
    response.status = 'error';
    response.message = err.message;
    response.type = err.type;
    if (err.details) {
      response.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    response.status = 'error';
    response.type = 'ValidationError';
    response.message = 'Validation failed';
    response.details = err.errors;
    return res.status(400).json(response);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    response.status = 'error';
    response.type = 'AuthenticationError';
    response.message = 'Invalid token';
    return res.status(401).json(response);
  }

  if (err.name === 'TokenExpiredError') {
    response.status = 'error';
    response.type = 'AuthenticationError';
    response.message = 'Token expired';
    return res.status(401).json(response);
  }

  // In development, send the stack trace
  if (process.env.NODE_ENV === 'development') {
    response.details = err.stack;
  }

  // Send generic error for unhandled cases
  res.status(500).json(response);
}

// Async handler wrapper to avoid try-catch blocks in routes
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};