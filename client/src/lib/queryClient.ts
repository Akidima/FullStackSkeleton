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
  const token = localStorage.getItem('authToken');
  console.log("Retrieved auth token:", token ? "Present" : "Not found");
  return token;
}

export function setAuthToken(token: string) {
  console.log("Setting auth token");
  localStorage.setItem('authToken', token);
}

export function clearAuthToken() {
  console.log("Clearing auth token");
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
    console.log("Adding auth token to request headers");
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
      console.log("Received 401 unauthorized response");
      clearAuthToken();
    }

    if (!response.ok) {
      await throwIfResNotOk(response);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Expected JSON response from server");
    }

    const text = await response.text();
    if (!text) {
      return new Response('{}', {
        status: response.status,
        headers: { 'content-type': 'application/json' }
      });
    }

    try {
      JSON.parse(text);
      return new Response(text, {
        status: response.status,
        headers: { 'content-type': 'application/json' }
      });
    } catch (e) {
      console.error("Invalid JSON response:", text);
      throw new Error("Invalid JSON response from server");
    }
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
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
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }

      if (!res.ok) {
        await throwIfResNotOk(res);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Expected JSON response from server");
      }

      const text = await res.text();
      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON response:", text);
        throw new Error("Invalid JSON response from server");
      }
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
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