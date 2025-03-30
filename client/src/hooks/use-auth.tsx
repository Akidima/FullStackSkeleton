import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { auth, loginWithGoogle as firebaseLoginWithGoogle, logout as firebaseLogout } from "@/lib/firebase";
import { User as FirebaseUser } from "firebase/auth";

// Mock user for development without Firebase credentials
export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  id: string; // Added id property for compatibility with API
  getIdToken: () => Promise<string>;
}

export type User = FirebaseUser | MockUser;

const MOCK_USER: MockUser = {
  uid: "dev-user-123",
  email: "dev@meetmate.app",
  displayName: "Development User",
  photoURL: "https://ui-avatars.com/api/?name=Dev+User",
  id: "dev-user-123", // Same as uid for consistency
  getIdToken: async () => "mock-token-for-development"
};

// Use a mock user in development or when Firebase is not configured
const USE_MOCK_AUTH = true;

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  getUserId: () => string | null; // Helper to safely get user ID
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (USE_MOCK_AUTH) {
      console.log("Using mock authentication for development");
      // Set mock user with slight delay to simulate auth flow
      const timer = setTimeout(() => {
        setUser(MOCK_USER);
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          setUser(user);
          setIsLoading(false);
        },
        (error) => {
          setError(error);
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, []);

  const loginWithGoogle = async () => {
    try {
      if (USE_MOCK_AUTH) {
        setUser(MOCK_USER);
        toast({
          title: "Success",
          description: "Successfully signed in with development account",
        });
        setLocation("/dashboard");
      } else {
        await firebaseLoginWithGoogle();
        toast({
          title: "Success",
          description: "Successfully signed in with Google",
        });
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    try {
      if (USE_MOCK_AUTH) {
        setUser(null);
        toast({
          title: "Success",
          description: "Successfully logged out from development account",
        });
        setLocation("/login");
      } else {
        await firebaseLogout();
        toast({
          title: "Success",
          description: "Successfully logged out",
        });
        setLocation("/login");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAuthToken = async () => {
    try {
      if (!user) return null;
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };
  
  // Helper method to safely get user ID
  const getUserId = () => {
    if (!user) return null;
    
    // For Firebase user, use uid
    if ('uid' in user && !('id' in user)) {
      return user.uid;
    }
    
    // For MockUser or extended FirebaseUser, use id
    if ('id' in user) {
      return user.id;
    }
    
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginWithGoogle,
        logout,
        getAuthToken,
        getUserId,
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