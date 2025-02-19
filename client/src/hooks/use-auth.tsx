import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { account, getCurrentUser, loginWithGoogle, logout } from "@/lib/appwrite";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Models } from 'appwrite';

type User = Models.User<Models.Preferences>;

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const success = await logout();
      if (!success) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
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

  // Handle OAuth redirects and errors
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const userId = urlParams.get('userId');

      if (error) {
        toast({
          title: "Authentication failed",
          description: "Failed to authenticate with Google",
          variant: "destructive",
        });
        setLocation('/login');
        return;
      }

      if (userId) {
        await refetch();
        // Remove query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleOAuthCallback();
  }, [refetch, setLocation, toast]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error: error ?? null,
        loginWithGoogle,
        logout: logoutMutation.mutateAsync,
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