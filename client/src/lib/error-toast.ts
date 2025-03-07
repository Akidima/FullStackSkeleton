import { toast } from "@/hooks/use-toast";

type ErrorType = 'validation' | 'network' | 'auth' | 'rateLimit' | 'server' | 'unknown';

interface ErrorDetails {
  type: ErrorType;
  title: string;
  description: string;
  duration?: number;
  retry?: () => void;
}

export function handleError(error: any): ErrorDetails {
  // Rate limiting errors
  if (error.status === 429 || error.message?.includes('Too many requests')) {
    return {
      type: 'rateLimit',
      title: 'Rate Limit Reached',
      description: 'Please wait a moment before trying this action again.',
      duration: 5000, // Show for longer duration
    };
  }

  // Network errors
  if (!navigator.onLine || error.message === 'Failed to fetch') {
    return {
      type: 'network',
      title: 'Connection Error',
      description: 'Please check your internet connection and try again.',
      duration: 4000,
    };
  }

  // Authentication errors
  if (error.status === 401 || error.status === 403) {
    return {
      type: 'auth',
      title: 'Authentication Error',
      description: 'Please log in again to continue.',
      duration: 4000,
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      type: 'server',
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
      duration: 4000,
    };
  }

  // Validation errors
  if (error.status === 400) {
    return {
      type: 'validation',
      title: 'Validation Error',
      description: error.message || 'Please check your input and try again.',
      duration: 4000,
    };
  }

  // Default error
  return {
    type: 'unknown',
    title: 'Error',
    description: error.message || 'An unexpected error occurred. Please try again.',
    duration: 3000,
  };
}

export function showErrorToast(error: any, retryFn?: () => void) {
  const errorDetails = handleError(error);

  toast({
    title: errorDetails.title,
    description: errorDetails.description,
    variant: errorDetails.type === 'rateLimit' ? 'warning' : 'destructive',
    duration: errorDetails.duration,
    action: retryFn && errorDetails.type !== 'rateLimit' ? {
      label: 'Retry',
      onClick: retryFn,
    } : undefined,
  });

  // Log error for debugging
  console.error(`[${errorDetails.type}] ${errorDetails.title}:`, error);
}

// Utility function for handling retries with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let retries = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;

      if (retries >= maxRetries || error.status !== 429) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, retries - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}