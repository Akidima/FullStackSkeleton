import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MeetingList from "@/pages/meeting-list";
import MeetingForm from "@/pages/meeting-form";
import MeetingDetails from "@/pages/meeting-details";
import Login from "@/pages/login";
import SignUp from "@/pages/signup";
import CalendarEvents from "@/pages/calendar-events";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />
      <Route path="/" component={() => <ProtectedRoute component={MeetingList} />} />
      <Route path="/meetings/new" component={() => <ProtectedRoute component={MeetingForm} />} />
      <Route path="/meetings/:id" component={() => <ProtectedRoute component={MeetingDetails} />} />
      <Route path="/meetings/:id/edit" component={() => <ProtectedRoute component={MeetingForm} />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarEvents} />} />
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