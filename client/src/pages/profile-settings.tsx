import { useState, useEffect as ReactuseEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { Bell, Mail, Calendar, CheckCircle, Calendar as CalendarIcon, MessageSquare, Trello } from "lucide-react";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// Define schemas for different sections
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phoneNumber: z.string().optional(),
  timezone: z.string(),
});

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  dashboardLayout: z.enum(["compact", "comfortable", "spacious"]),
  preferredDuration: z.number().min(15).max(120),
  defaultView: z.enum(["day", "week", "month"]),
});

const notificationSchema = z.object({
  emailEnabled: z.boolean(),
  emailFrequency: z.enum(["instant", "daily", "weekly"]),
  meetingReminders: z.boolean(),
  meetingUpdates: z.boolean(),
  taskReminders: z.boolean(),
  taskUpdates: z.boolean(),
});

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

type ProfileData = z.infer<typeof profileSchema>;
type PreferencesData = z.infer<typeof preferencesSchema>;
type NotificationData = z.infer<typeof notificationSchema>;
type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

export default function ProfileSettings() {
  const { user, getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  // Query current settings
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/users/settings"],
    enabled: !!user,
  });

  // Form setup for each section
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentSettings?.name || "",
      email: currentSettings?.email || "",
      phoneNumber: currentSettings?.phoneNumber || "",
      timezone: currentSettings?.timezone || "UTC",
    },
  });

  const preferencesForm = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      theme: currentSettings?.theme || "system",
      dashboardLayout: currentSettings?.dashboardLayout || "comfortable",
      preferredDuration: currentSettings?.preferredDuration || 30,
      defaultView: currentSettings?.defaultView || "week",
    },
  });

  const notificationForm = useForm<NotificationData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailEnabled: true,
      emailFrequency: "daily",
      meetingReminders: true,
      meetingUpdates: true,
      taskReminders: true,
      taskUpdates: true,
    },
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

  // Update forms when settings are loaded
  ReactuseEffect(() => {
    if (currentSettings) {
      profileForm.reset(currentSettings);
      preferencesForm.reset(currentSettings);
      notificationForm.reset(currentSettings);
      integrationsForm.reset(currentSettings);
    }
  }, [currentSettings]);

  // Mutation handlers
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileData) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication required");
      return await apiRequest("PATCH", "/api/users/profile", data, {
        Authorization: `Bearer ${token}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (data: PreferencesData) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication required");
      return await apiRequest("PATCH", "/api/users/preferences", data, {
        Authorization: `Bearer ${token}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  const updateNotifications = useMutation({
    mutationFn: async (data: NotificationData) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication required");
      return await apiRequest("PATCH", "/api/users/notifications", data, {
        Authorization: `Bearer ${token}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notification preferences",
        variant: "destructive",
      });
    },
  });

  const updateIntegrations = useMutation({
    mutationFn: async (data: IntegrationSettings) => {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      try {
        return await apiRequest("PATCH", "/api/users/integrations", data, headers);
      } catch (error: any) {
        if (error.status === 429) {
          throw new Error("Too many requests. Please wait a moment and try again.");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/integrations"] });
      toast({
        title: "Success",
        description: "Integration settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update integration settings",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onProfileSubmit = (data: ProfileData) => updateProfile.mutate(data);
  const onPreferencesSubmit = (data: PreferencesData) => updatePreferences.mutate(data);
  const onNotificationsSubmit = (data: NotificationData) => updateNotifications.mutate(data);
  const onIntegrationsSubmit = (data: IntegrationSettings) => updateIntegrations.mutate(data);

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
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and account settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="Your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="America/New_York">Eastern Time</SelectItem>
                              <SelectItem value="America/Chicago">Central Time</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="w-full"
                    >
                      {updateProfile.isPending ? (
                        <>
                          <LoadingSpinner size="small" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your experience and default settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...preferencesForm}>
                  <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-4">
                    <FormField
                      control={preferencesForm.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select theme" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preferencesForm.control}
                      name="dashboardLayout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dashboard Layout</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select layout" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="compact">Compact</SelectItem>
                              <SelectItem value="comfortable">Comfortable</SelectItem>
                              <SelectItem value="spacious">Spacious</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preferencesForm.control}
                      name="preferredDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Meeting Duration (minutes)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="45">45 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="90">1.5 hours</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={preferencesForm.control}
                      name="defaultView"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Calendar View</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select view" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="day">Day</SelectItem>
                              <SelectItem value="week">Week</SelectItem>
                              <SelectItem value="month">Month</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={updatePreferences.isPending}
                      className="w-full"
                    >
                      {updatePreferences.isPending ? (
                        <>
                          <LoadingSpinner size="small" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Preferences"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via email
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
                        control={notificationForm.control}
                        name="emailFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Frequency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="instant">Instant</SelectItem>
                                <SelectItem value="daily">Daily Digest</SelectItem>
                                <SelectItem value="weekly">Weekly Summary</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="meetingReminders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Meeting Reminders</FormLabel>
                              <FormDescription>
                                Get reminded about upcoming meetings
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
                        control={notificationForm.control}
                        name="meetingUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Meeting Updates</FormLabel>
                              <FormDescription>
                                Receive notifications about meeting changes
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
                        control={notificationForm.control}
                        name="taskReminders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Task Reminders</FormLabel>
                              <FormDescription>
                                Get reminded about upcoming tasks
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
                        control={notificationForm.control}
                        name="taskUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Task Updates</FormLabel>
                              <FormDescription>
                                Receive notifications about task changes
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

                    <Button
                      type="submit"
                      disabled={updateNotifications.isPending}
                      className="w-full"
                    >
                      {updateNotifications.isPending ? (
                        <>
                          <LoadingSpinner size="small" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Notification Settings"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>
                  Connect your favorite tools to streamline your workflow
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