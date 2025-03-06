import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { Bell, Mail, Calendar, CheckCircle, Calendar as CalendarIcon, MessageSquare, Trello } from "lucide-react";
import { z } from "zod";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { apiRequest } from "@/lib/queryClient";

// Define schemas for different sections
const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  emailFrequency: z.number(),
  meetingUpdates: z.boolean(),
  actionItems: z.boolean(),
});

const integrationSettingsSchema = z.object({
  googleCalendarEnabled: z.boolean(),
  outlookCalendarEnabled: z.boolean(),
  asanaEnabled: z.boolean(),
  jiraEnabled: z.boolean(),
  slackEnabled: z.boolean(),
  teamsEnabled: z.boolean(),
  asanaWorkspace: z.string().optional(),
  jiraProject: z.string().optional(),
  slackChannel: z.string().optional(),
  teamsChannel: z.string().optional(),
});

type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

export default function ProfileSettings() {
  const { user, getAuthHeader } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [showPreview, setShowPreview] = useState(false);

  // Query user's current integration settings
  const { data: currentIntegrationSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/users/integrations"],
    enabled: !!user, // Only run query if user is authenticated
  });

  // Add integrations form
  const integrationsForm = useForm<IntegrationSettings>({
    resolver: zodResolver(integrationSettingsSchema),
    defaultValues: {
      googleCalendarEnabled: currentIntegrationSettings?.googleCalendarEnabled || false,
      outlookCalendarEnabled: currentIntegrationSettings?.outlookCalendarEnabled || false,
      asanaEnabled: currentIntegrationSettings?.asanaEnabled || false,
      jiraEnabled: currentIntegrationSettings?.jiraEnabled || false,
      slackEnabled: currentIntegrationSettings?.slackEnabled || false,
      teamsEnabled: currentIntegrationSettings?.teamsEnabled || false,
      asanaWorkspace: currentIntegrationSettings?.asanaWorkspace || "",
      jiraProject: currentIntegrationSettings?.jiraProject || "",
      slackChannel: currentIntegrationSettings?.slackChannel || "",
      teamsChannel: currentIntegrationSettings?.teamsChannel || "",
    },
  });

  const updateIntegrations = useMutation({
    mutationFn: async (data: IntegrationSettings) => {
      const headers = await getAuthHeader();
      if (!headers.Authorization) {
        throw new Error("Authentication required");
      }
      return await apiRequest("PATCH", "/api/users/integrations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/integrations"] });
      toast({
        title: "Integration Settings Updated",
        description: "Your integration preferences have been saved.",
      });
    },
    onError: (error: any) => {
      console.error('Integration update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update integration settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onIntegrationsSubmit(data: IntegrationSettings) {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update integration settings.",
        variant: "destructive",
      });
      return;
    }
    updateIntegrations.mutate(data);
  }

  // Rest of the component implementation remains the same...
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Rest of the JSX implementation remains the same... */}
    </div>
  );
}
