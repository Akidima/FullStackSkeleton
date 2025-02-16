import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Eye, EyeOff } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useLocation, Link } from "wouter";
import { loginUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import type { z } from "zod";
import { AuthError } from "@/components/ui/auth-error";

type FormData = z.infer<typeof loginUserSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { loginMutation, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  // Handle URL error parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorType = params.get('error');
    if (errorType) {
      let errorMessage = "An error occurred during authentication";
      switch (errorType) {
        case 'google-auth-failed':
          errorMessage = "Google authentication failed. Please try again.";
          break;
        case 'no-user-found':
          errorMessage = "No user account found. Please sign up first.";
          break;
        case 'auth-failed':
          errorMessage = "Authentication failed. Please try again.";
          break;
      }
      setError(errorMessage);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await loginMutation.mutateAsync(data);
      setLocation("/");
    } catch (error: any) {
      if (error.status === 429) {
        setError("Too many login attempts. Please try again in 15 minutes.");
      } else {
        setError(error.message || "Failed to login. Please try again.");
      }
    }
  };

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold">MeetMate AI</CardTitle>
          <p className="text-muted-foreground">
            Sign in to manage your meetings and get AI assistance
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <AuthError
              title="Authentication Error"
              message={error}
              className="mb-4"
            />
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        className="bg-background"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          form.trigger("email");
                        }}
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="bg-background pr-10"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            form.trigger("password");
                          }}
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loginMutation.isPending || !form.formState.isValid}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <a href="/auth/google" className="block w-full">
            <Button
              className="w-full flex items-center gap-2 text-base hover:bg-accent/80"
              size="lg"
              variant="outline"
            >
              <SiGoogle className="h-5 w-5" />
              Sign in with Google
            </Button>
          </a>
          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}