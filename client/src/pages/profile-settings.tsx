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
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { LoadingSpinner } from "@/components/ui/loading-skeleton";

export default function ProfileSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

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

  return (
    <div className="min-h-screen relative">
      <div 
        className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient bg-[length:200%_200%] z-0"
        style={{
          animation: 'gradient 15s ease infinite',
        }}
      />

      <div className="relative z-10 min-h-screen p-6 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-white">Profile Settings</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/10">
              <TabsTrigger value="profile" className="data-[state=active]:bg-white/20">Profile</TabsTrigger>
              <TabsTrigger value="preferences" className="data-[state=active]:bg-white/20">Preferences</TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-white/20">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                  <CardDescription className="text-white/80">
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
                            <FormLabel>Display Name</FormLabel>
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
                            <FormLabel>Bio</FormLabel>
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
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Preferences</CardTitle>
                  <CardDescription className="text-white/80">
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
                            <FormLabel>Theme</FormLabel>
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
                            <FormLabel>Language</FormLabel>
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
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Notification Settings</CardTitle>
                  <CardDescription className="text-white/80">
                    Configure how you want to receive notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-medium text-white">Email Notifications</h3>
                      <p className="text-sm text-muted-foreground text-white/80">
                        Receive meeting reminders via email
                      </p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-medium text-white">Meeting Updates</h3>
                      <p className="text-sm text-muted-foreground text-white/80">
                        Get notified when meeting details change
                      </p>
                    </div>
                    <Switch checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-medium text-white">Action Items</h3>
                      <p className="text-sm text-muted-foreground text-white/80">
                        Receive notifications about assigned action items
                      </p>
                    </div>
                    <Switch checked={true} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}