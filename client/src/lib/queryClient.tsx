import { QueryClient } from '@tanstack/react-query';
import { 
  queryClient as mockQueryClient, 
  initializeMockData, 
  apiRequest as mockApiRequest 
} from './mockQueryClient';

// Determine if we're in the Replit environment
const isReplitEnv = window.location.hostname.includes('replit');

// Use the mock query client when in Replit, otherwise use a real one
export const queryClient = isReplitEnv
  ? mockQueryClient
  : new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 30000, // 30 seconds
          refetchOnWindowFocus: true,
        },
      },
    });

// For Replit, initialize the mock data
if (isReplitEnv) {
  initializeMockData();
}

// API request function that either uses the mock implementation or makes real requests
export async function apiRequest<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  // In Replit, use mock implementation
  if (isReplitEnv) {
    return mockApiRequest<T>(url, method, data);
  }
  
  // In real environments, make actual API requests
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    // Format error response
    const error = await response.json().catch(() => ({
      message: 'An unknown error occurred',
      status: response.status,
    }));
    
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}