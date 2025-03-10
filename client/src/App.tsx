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
import { WebSocketProvider } from "@/hooks/use-websocket";
import { Loader2 } from "lucide-react";

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Error fallback component
function ErrorFallback() {
  return (
    <div className="p-4 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />
      <Route 
        path="/dashboard" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <ErrorBoundary fallback={<ErrorFallback />}>
                <Dashboard />
              </ErrorBoundary>
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route path="/meetings" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <MeetingList />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings/new" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <MeetingForm />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings/:id" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <MeetingDetails />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/meetings/:id/edit" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <MeetingForm />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/calendar" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <CalendarView />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/analytics" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <AnalyticsDashboard />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route path="/profile/settings" component={() => (
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <ProfileSettings />
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
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