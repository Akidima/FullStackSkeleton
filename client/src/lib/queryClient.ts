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
        errorMessage = await res.text() || res.statusText;
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
  } else {
    console.log("No auth token available for request");
  }

  console.log(`Making ${method} request to ${url}`);
  let response: Response;

  try {
    response = await fetch(url, {
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

    await throwIfResNotOk(response);

    // Check if response is empty
    const text = await response.text();
    if (!text) {
      return new Response('{}', {
        status: response.status,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Parse JSON response
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
        console.log("Adding auth token to query request");
      } else {
        console.log("No auth token available for query");
      }

      console.log(`Making query request to ${queryKey[0]}`);
      const res = await fetch(queryKey[0] as string, {
        headers,
        credentials: 'include'
      });

      // Handle rate limiting
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 15000;
        throw new Error(`Too many requests. Please wait ${Math.ceil(waitTime/1000)} seconds before trying again.`);
      }

      if (res.status === 401) {
        console.log("Received 401 unauthorized response in query");
        clearAuthToken();
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }

      await throwIfResNotOk(res);

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