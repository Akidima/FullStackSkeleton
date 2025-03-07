import { toast } from "@/hooks/use-toast";

type ErrorType = 'validation' | 'network' | 'auth' | 'server' | 'unknown';

interface ErrorDetails {
  type?: ErrorType;
  title?: string;
  description: string;
}

export function handleError(error: any): ErrorDetails {
  // Network errors
  if (!navigator.onLine || error.message === 'Failed to fetch') {
    return {
      type: 'network',
      title: 'Connection Error',
      description: 'Please check your internet connection and try again.'
    };
  }

  // Authentication errors
  if (error.status === 401 || error.status === 403) {
    return {
      type: 'auth',
      title: 'Authentication Error',
      description: 'Please log in again to continue.'
    };
  }

  // Rate limiting errors
  if (error.status === 429) {
    return {
      type: 'server',
      title: 'Too Many Requests',
      description: 'Please wait a moment before trying again.'
    };
  }

  // Server errors
  if (error.status >= 500) {
    return {
      type: 'server',
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.'
    };
  }

  // Validation errors
  if (error.status === 400) {
    return {
      type: 'validation',
      title: 'Validation Error',
      description: error.message || 'Please check your input and try again.'
    };
  }

  // Default error
  return {
    type: 'unknown',
    title: 'Error',
    description: error.message || 'An unexpected error occurred. Please try again.'
  };
}

export function showErrorToast(error: any) {
  const errorDetails = handleError(error);
  
  toast({
    title: errorDetails.title,
    description: errorDetails.description,
    variant: errorDetails.type === 'validation' ? 'destructive' : 'default',
    duration: errorDetails.type === 'network' ? 5000 : 3000,
  });
}
