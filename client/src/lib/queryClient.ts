import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || res.statusText;
    } catch {
      errorMessage = await res.text() || res.statusText;
    }
    throw new Error(`${res.status}: ${errorMessage}`);
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
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log("Adding auth token to request headers");
  } else {
    console.log("No auth token available for request");
  }

  console.log(`Making ${method} request to ${url}`);
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'same-origin'
  });

  if (res.status === 401) {
    console.log("Received 401 unauthorized response");
    clearAuthToken(); // Clear invalid token
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
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
      credentials: 'same-origin'
    });

    if (res.status === 401) {
      console.log("Received 401 unauthorized response in query");
      clearAuthToken(); // Clear invalid token
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
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