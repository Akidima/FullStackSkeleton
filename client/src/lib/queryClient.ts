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

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 15000;
      throw new Error(`Too many requests. Please wait ${Math.ceil(waitTime/1000)} seconds before trying again.`);
    }

    // Handle authentication errors
    if (response.status === 401) {
      clearAuthToken();
    }

    if (!response.ok) {
      await throwIfResNotOk(response);
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw error;
  }
}

export const getQueryFn: QueryFunction = async ({ queryKey }) => {
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
    credentials: 'include'
  });

  if (res.status === 401) {
    clearAuthToken();
    return null;
  }

  if (!res.ok) {
    await throwIfResNotOk(res);
  }

  const data = await res.json();
  return data.data;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});