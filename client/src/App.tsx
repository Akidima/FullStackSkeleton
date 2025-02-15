import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import MeetingList from "@/pages/meeting-list";
import MeetingForm from "@/pages/meeting-form";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MeetingList} />
      <Route path="/meetings/new" component={MeetingForm} />
      <Route path="/meetings/:id/edit" component={MeetingForm} />
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