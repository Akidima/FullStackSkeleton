import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Meeting Assistant</CardTitle>
          <p className="text-muted-foreground">
            Sign in to manage your meetings and get AI assistance
          </p>
        </CardHeader>
        <CardContent>
          <a href="/auth/google" className="block w-full">
            <Button className="w-full flex items-center gap-2 text-base" size="lg">
              <SiGoogle className="h-5 w-5" />
              Sign in with Google
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
