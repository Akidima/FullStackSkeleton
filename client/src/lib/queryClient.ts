import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    const contentType = res.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        errorMessage = errorData.message || res.statusText;
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
    credentials: 'include'
  });

  if (res.status === 401) {
    console.log("Received 401 unauthorized response");
    clearAuthToken(); // Clear invalid token
  }

  await throwIfResNotOk(res);

  // Check if response is empty
  const text = await res.text();
  if (!text) {
    return new Response('{}', {
      status: res.status,
      headers: { 'content-type': 'application/json' }
    });
  }

  // Parse JSON response
  try {
    JSON.parse(text);
    return new Response(text, {
      status: res.status,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    console.error("Invalid JSON response:", text);
    throw new Error("Invalid JSON response from server");
  }
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
      credentials: 'include'
    });

    if (res.status === 401) {
      console.log("Received 401 unauthorized response in query");
      clearAuthToken(); // Clear invalid token
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);

    // Check if response is empty
    const text = await res.text();
    if (!text) {
      return null;
    }

    // Parse JSON response
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Invalid JSON response:", text);
      throw new Error("Invalid JSON response from server");
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