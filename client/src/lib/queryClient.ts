import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    const contentType = res.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || res.statusText;
      } else {
        errorMessage = await res.text();
      }
    } catch (e) {
      errorMessage = res.statusText;
    }

    const error = new Error(errorMessage);
    (error as any).status = res.status;
    throw error;
  }
}

function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function setAuthToken(token: string) {
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  localStorage.removeItem('authToken');
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include'
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 15000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return apiRequest(method, url, data);
    }

    // Handle authentication errors
    if (response.status === 401) {
      clearAuthToken();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || 'Request failed');
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw error;
  }
}

export const getQueryFn: QueryFunction = async ({ queryKey, signal }) => {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(queryKey[0] as string, {
    headers,
    credentials: 'include',
    signal
  });

  if (res.status === 401) {
    clearAuthToken();
    return null;
  }

  if (!res.ok) {
    await throwIfResNotOk(res);
  }

  const data = await res.json();
  return data;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn,
      retry: (failureCount, error: any) => {
        // Don't retry on 401 or 404
        if (error.status === 401 || error.status === 404) return false;
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error.status === 401 || error.status === 404) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});