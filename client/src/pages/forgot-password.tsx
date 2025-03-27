
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Loader2 } from "lucide-react";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AuthSkeleton } from "@/components/ui/auth-skeleton";
import { TooltipError } from "@/components/ui/tooltip-error";
import { ReCAPTCHA } from "@/components/ui/recaptcha";
import { AuthError } from "@/components/ui/auth-error";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData & { recaptchaToken: string }) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      return res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      setError(null);
    },
    onError: (error: Error) => {
      setError({
        title: "Reset Request Failed",
        message: error.message || "Please try again later",
      });
    },
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setError(null);

    if (!recaptchaToken) {
      setError({
        title: "Verification Required",
        message: "Please complete the security verification before proceeding",
      });
      return;
    }

    await resetMutation.mutateAsync({
      ...data,
      recaptchaToken,
    });
  };

  if (resetMutation.isPending) {
    return <AuthSkeleton />;
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <p className="text-muted-foreground">
              If an account exists with the email you provided, you will receive password reset instructions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <AuthError
              title={error.title}
              message={error.message}
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ReCAPTCHA onVerify={setRecaptchaToken} />

              <Button
                type="submit"
                className="w-full"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm"
                  onClick={() => setLocation("/login")}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
