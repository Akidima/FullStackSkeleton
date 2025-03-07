import { useState, useEffect as ReactuseEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  dashboardLayout: z.enum(["compact", "comfortable", "spacious"]),
  preferredDuration: z.number().min(15).max(120),
  notifications: z.enum(["all", "important", "minimal"]),
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
      theme: theme as "light" | "dark" | "system",
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
        theme: theme as "light" | "dark" | "system",
      });
    }
  }, [currentSettings, theme]);

  const updatePreferences = useMutation({
    mutationFn: async (data: z.infer<typeof preferencesSchema>) => {
      const token = await getAuthToken();
      if (!token) throw new Error("Authentication required");

      // Update theme immediately for a smooth experience
      setTheme(data.theme);

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      return await apiRequest("PATCH", "/api/users/preferences", data, headers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
      toast({
        title: "Success",
        description: "Your preferences have been saved.",
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