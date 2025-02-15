import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface AdminRouteProps {
  component: React.ComponentType;
}

export function AdminRoute({ component: Component }: AdminRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !user.isAdmin) {
    setLocation("/");
    return null;
  }

  return <Component />;
}