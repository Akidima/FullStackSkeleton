import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const { user, loginWithGoogle } = useAuth();

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <p className="text-muted-foreground">
            Sign up to start managing your meetings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full flex items-center gap-2 text-base"
            size="lg"
            onClick={loginWithGoogle}
          >
            <SiGoogle className="h-5 w-5" />
            Sign up with Google
          </Button>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Button
              variant="link"
              className="text-primary hover:underline"
              onClick={() => setLocation("/login")}
            >
              Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}