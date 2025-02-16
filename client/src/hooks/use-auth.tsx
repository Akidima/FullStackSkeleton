import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, LoginUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setAuthToken, clearAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
};

function useLoginMutation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginUser) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      if (data.status !== 'success' || !data.data?.token) {
        throw new Error(data.message || 'Login failed');
      }
      setAuthToken(data.data.token);
      return data.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/me"], user);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function useLogoutMutation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      const data = await res.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Logout failed');
      }
      clearAuthToken();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/me"], null);
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      setLocation("/login");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

function useRegisterMutation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/signup", userData);
      const data = await res.json();
      if (data.status !== 'success' || !data.data?.token) {
        throw new Error(data.message || 'Registration failed');
      }
      setAuthToken(data.data.token);
      return data.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/me"], user);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Handle token from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setAuthToken(token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    }
  }, []);

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error ?? null,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const AuthContext = createContext<AuthContextType | null>(null);