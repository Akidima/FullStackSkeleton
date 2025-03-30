import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { MockWebSocketProvider } from "@/hooks/mock-websocket-provider";
import App from "./App";
import "./index.css";

// Wrap the App with all needed providers - using MockWebSocketProvider for development
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <MockWebSocketProvider>
      <App />
      <Toaster />
    </MockWebSocketProvider>
  </QueryClientProvider>
);
