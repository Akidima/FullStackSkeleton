import { useState, useEffect as ReactuseEffect } from "react";
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

const integrationSettingsSchema = z.object({
  asanaEnabled: z.boolean(),
  jiraEnabled: z.boolean(),
  teamsEnabled: z.boolean(),
  slackEnabled: z.boolean(),
  googleCalendarEnabled: z.boolean(),
  outlookCalendarEnabled: z.boolean(),
  asanaWorkspace: z.string().optional(),
  jiraProject: z.string().optional(),
  slackChannel: z.string().optional(),
  teamsChannel: z.string().optional(),
});

type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

export default function ProfileSettings() {
  const { user, getAuthHeader } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("integrations");

  // Query user's current integration settings
  const { data: currentIntegrationSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/users/integrations"],
    enabled: !!user,
  });

  const integrationsForm = useForm<IntegrationSettings>({
    resolver: zodResolver(integrationSettingsSchema),
    defaultValues: {
      asanaEnabled: false,
      jiraEnabled: false,
      teamsEnabled: false,
      slackEnabled: false,
      googleCalendarEnabled: false,
      outlookCalendarEnabled: false,
      asanaWorkspace: "",
      jiraProject: "",
      slackChannel: "",
      teamsChannel: "",
    },
  });

  // Update form when settings are loaded
  ReactuseEffect(() => {
    if (currentIntegrationSettings) {
      integrationsForm.reset(currentIntegrationSettings);
    }
  }, [currentIntegrationSettings, integrationsForm]);

  const updateIntegrations = useMutation({
    mutationFn: async (data: IntegrationSettings) => {
      const headers = await getAuthHeader();
      return await apiRequest("PATCH", "/api/users/integrations", data, headers);
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

  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and integrations.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>
                  Connect your favorite tools to streamline your workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...integrationsForm}>
                  <form onSubmit={integrationsForm.handleSubmit(onIntegrationsSubmit)} className="space-y-6">
                    {/* Calendar Integrations */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Calendar Services</h3>
                      <div className="space-y-4">
                        <FormField
                          control={integrationsForm.control}
                          name="googleCalendarEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Google Calendar</FormLabel>
                                <FormDescription>
                                  Sync your meetings with Google Calendar
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={integrationsForm.control}
                          name="outlookCalendarEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Outlook Calendar</FormLabel>
                                <FormDescription>
                                  Sync your meetings with Outlook Calendar
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Task Management Integrations */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Task Management</h3>
                      <div className="space-y-4">
                        <FormField
                          control={integrationsForm.control}
                          name="asanaEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Asana</FormLabel>
                                <FormDescription>
                                  Sync tasks with Asana
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={integrationsForm.control}
                          name="jiraEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Jira</FormLabel>
                                <FormDescription>
                                  Sync tasks with Jira
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Communication Integrations */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Communication</h3>
                      <div className="space-y-4">
                        <FormField
                          control={integrationsForm.control}
                          name="slackEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Slack</FormLabel>
                                <FormDescription>
                                  Send notifications to Slack
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={integrationsForm.control}
                          name="teamsEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Microsoft Teams</FormLabel>
                                <FormDescription>
                                  Send notifications to Teams
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={updateIntegrations.isPending}
                      className="w-full"
                    >
                      {updateIntegrations.isPending ? (
                        <>
                          <LoadingSpinner size="small" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Integration Settings"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}