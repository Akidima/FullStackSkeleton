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
import { useTheme } from "@/hooks/use-theme";
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
  notifications: z.enum(["all", "important", "minimal"]),
});

const notificationSchema = z.object({
  emailEnabled: z.boolean(),
  emailFrequency: z.enum(["instant", "daily", "weekly"]),
  meetingReminders: z.boolean(),
  meetingUpdates: z.boolean(),
  taskReminders: z.boolean(),
  taskUpdates: z.boolean(),
});

export default function ProfileSettings() {
  const { user, getAuthToken } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("preferences");

  // Query user's current settings
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/users/settings"],
    enabled: !!user,
  });

  // Form setup for preferences
  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      theme: theme,
      dashboardLayout: currentSettings?.dashboardLayout || "comfortable",
      preferredDuration: currentSettings?.preferredDuration || 30,
      notifications: currentSettings?.notifications || "all",
    },
  });

  // Update form when settings are loaded
  ReactuseEffect(() => {
    if (currentSettings) {
      preferencesForm.reset({
        ...currentSettings,
        theme: theme, // Always use the current theme from useTheme
      });
    }
  }, [currentSettings, theme]);

  const updatePreferences = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesSchema>) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication required");
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return await apiRequest("PATCH", "/api/users/preferences", data, headers);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
      // Update theme immediately when preferences are saved
      setTheme(data.theme);
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

  function onPreferencesSubmit(data: z.infer<typeof preferencesSchema>) {
    updatePreferences.mutate(data);
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
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <FormDescription>
                            Choose how the app should look
                          </FormDescription>
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
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
                      name="notifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notification Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select notification level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All Notifications</SelectItem>
                              <SelectItem value="important">Important Only</SelectItem>
                              <SelectItem value="minimal">Minimal</SelectItem>
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
        </Tabs>
      </div>
    </div>
  );
}