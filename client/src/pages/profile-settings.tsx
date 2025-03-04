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
import { Bell, Mail, Calendar, CheckCircle } from "lucide-react";
import { z } from "zod";
import { HelpTooltip } from "@/components/ui/help-tooltip";

// Define notification preferences schema
const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  emailFrequency: z.number(),
  meetingUpdates: z.boolean(),
  actionItems: z.boolean(),
});

type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export default function ProfileSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      displayName: user?.displayName || "",
      email: user?.email || "",
      bio: user?.bio || "",
      profilePicture: user?.profilePicture || "",
      theme: user?.theme || "system",
      language: user?.language || "en",
      timeZone: user?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const notificationForm = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      emailEnabled: true,
      emailFrequency: 1,
      meetingUpdates: true,
      actionItems: true,
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<InsertUser>) => {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: InsertUser) {
    updateProfile.mutate(data);
  }

  function onNotificationSubmit(data: NotificationPreferences) {
    console.log("Notification preferences:", data);
    toast({
      title: "Preferences Updated",
      description: "Your notification preferences have been saved.",
    });
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information and personal details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <HelpTooltip context="profile.displayName">
                            <FormLabel>Display Name</FormLabel>
                          </HelpTooltip>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <HelpTooltip context="profile.bio">
                            <FormLabel>Bio</FormLabel>
                          </HelpTooltip>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormDescription>
                            Write a short bio about yourself.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profilePicture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Picture URL</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" />
                          </FormControl>
                          <FormDescription>
                            Enter the URL of your profile picture.
                          </FormDescription>
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
                          Updating...
                        </>
                      ) : (
                        "Update Profile"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your application preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <HelpTooltip context="profile.theme">
                            <FormLabel>Theme</FormLabel>
                          </HelpTooltip>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a theme" />
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
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <HelpTooltip context="profile.language">
                            <FormLabel>Language</FormLabel>
                          </HelpTooltip>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
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
                        "Save Preferences"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10">
                                <Mail className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium">Email Notifications</h3>
                                <p className="text-sm text-muted-foreground">
                                  Receive meeting reminders via email
                                </p>
                              </div>
                            </div>
                            <FormControl>
                              <Switch 
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  setShowPreview(checked);
                                }}
                              />
                            </FormControl>
                          </div>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="emailFrequency"
                        render={({ field }) => (
                          <div className="pl-12">
                            <FormItem>
                              <FormLabel>Notification Frequency</FormLabel>
                              <FormControl>
                                <div className="pt-2">
                                  <Slider
                                    value={[field.value]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    max={3}
                                    step={1}
                                    className="w-[200px]"
                                  />
                                </div>
                              </FormControl>
                              <div className="flex justify-between w-[200px] text-sm text-muted-foreground mt-1">
                                <span>Daily</span>
                                <span>Weekly</span>
                                <span>Monthly</span>
                              </div>
                            </FormItem>
                          </div>
                        )}
                      />

                      {showPreview && (
                        <div className="pl-12 pt-4">
                          <Card className="bg-muted/50">
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <CardTitle className="text-sm">Meeting Reminder</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="text-sm">
                              <p>You have a meeting "Team Sync" tomorrow at 10:00 AM</p>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>

                    <FormField
                      control={notificationForm.control}
                      name="meetingUpdates"
                      render={({ field }) => (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">Meeting Updates</h3>
                              <p className="text-sm text-muted-foreground">
                                Get notified when meeting details change
                              </p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="actionItems"
                      render={({ field }) => (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-primary/10">
                              <CheckCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">Action Items</h3>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications about assigned action items
                              </p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                      )}
                    />

                    <Button type="submit" className="w-full">
                      Save Notification Preferences
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