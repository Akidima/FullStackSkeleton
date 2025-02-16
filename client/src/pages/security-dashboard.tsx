import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Bell, ChartBar } from "lucide-react";

export default function SecurityDashboard() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.displayName}! Monitor and manage your security settings.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Security Score</CardTitle>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">85%</div>
            <p className="text-muted-foreground">Your account security is good, but there's room for improvement.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Active Sessions</CardTitle>
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">2</div>
            <p className="text-muted-foreground">Currently active login sessions across your devices.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Security Alerts</CardTitle>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">0</div>
            <p className="text-muted-foreground">No security alerts detected in the last 30 days.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Security Recommendations</CardTitle>
              <ChartBar className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Enable Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Lock className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">Strong Password</h3>
                  <p className="text-sm text-muted-foreground">Your password meets our security requirements.</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
