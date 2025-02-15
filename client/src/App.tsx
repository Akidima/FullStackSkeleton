import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MeetingList from "@/pages/meeting-list";
import MeetingForm from "@/pages/meeting-form";
import Login from "@/pages/login";

// Protected route wrapper component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0]);
      if (res.status === 401) {
        setLocation("/login");
        return null;
      }
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={MeetingList} />} />
      <Route path="/meetings/new" component={() => <ProtectedRoute component={MeetingForm} />} />
      <Route path="/meetings/:id/edit" component={() => <ProtectedRoute component={MeetingForm} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;