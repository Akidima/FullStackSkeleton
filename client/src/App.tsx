import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MeetingList from "@/pages/meeting-list";
import MeetingForm from "@/pages/meeting-form";
import MeetingDetails from "@/pages/meeting-details";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import SignUp from "@/pages/signup";
import CalendarEvents from "@/pages/calendar-events";
import ProfileSettings from "@/pages/profile-settings";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Layout } from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />
      <Route 
        path="/" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route 
        path="/meetings" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <MeetingList />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route 
        path="/meetings/new" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <MeetingForm />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route 
        path="/meetings/:id" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <MeetingDetails />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route 
        path="/meetings/:id/edit" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <MeetingForm />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route 
        path="/calendar" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <CalendarEvents />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route 
        path="/profile/settings" 
        component={() => (
          <ProtectedRoute>
            <Layout>
              <ProfileSettings />
            </Layout>
          </ProtectedRoute>
        )} 
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;