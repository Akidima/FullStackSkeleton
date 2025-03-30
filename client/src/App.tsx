import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import MeetingList from "@/pages/meeting-list";
import MeetingForm from "@/pages/meeting-form";
import MeetingDetails from "@/pages/meeting-details";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import SignUp from "@/pages/signup";
import CalendarView from "@/pages/calendar-view";
import ProfileSettings from "@/pages/profile-settings";
import AnalyticsDashboard from "@/pages/analytics-dashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";
import { WebSocketProvider } from "@/hooks/use-websocket-simple";


// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />
      <Route path="/dashboard" component={() => (
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings" component={() => (
        <ProtectedRoute>
          <Layout>
            <MeetingList />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings/new" component={() => (
        <ProtectedRoute>
          <Layout>
            <MeetingForm />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings/:id" component={() => (
        <ProtectedRoute>
          <Layout>
            <MeetingDetails />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings/:id/edit" component={() => (
        <ProtectedRoute>
          <Layout>
            <MeetingForm />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/calendar" component={() => (
        <ProtectedRoute>
          <Layout>
            <CalendarView />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/analytics" component={() => (
        <ProtectedRoute>
          <Layout>
            <AnalyticsDashboard />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/profile/settings" component={() => (
        <ProtectedRoute>
          <Layout>
            <ProfileSettings />
          </Layout>
        </ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate an async operation to fetch data or check authentication
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            <Router />
            <Toaster />
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;