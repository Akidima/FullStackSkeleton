import { useEffect } from "react";
import { PreferenceWizard } from "@/components/preference-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function Welcome() {
  const [, navigate] = useLocation();

  // Check if user has completed preferences
  const { data: preferences, isError } = useQuery({
    queryKey: ['/api/users/meeting-preferences'],
    retry: false,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    // If preferences are already set, redirect to dashboard
    if (preferences && Object.keys(preferences).length > 0) {
      navigate('/dashboard');
    }
  }, [preferences, navigate]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Welcome to Smart Meeting Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              Let's personalize your experience and earn some points along the way!
            </p>
          </CardContent>
        </Card>

        <PreferenceWizard />
      </div>
    </div>
  );
}