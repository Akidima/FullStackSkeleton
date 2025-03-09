import { useEffect } from "react";
import { PreferenceWizard } from "@/components/preference-wizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, Sparkles } from "lucide-react";

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
      <motion.div 
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="mb-6 overflow-hidden relative">
          <motion.div
            className="absolute top-0 right-0 p-4"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
          >
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
          </motion.div>

          <CardHeader>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-primary" aria-hidden="true" />
                <span>Welcome to Smart Meeting Assistant</span>
                <Star className="h-6 w-6 text-primary" aria-hidden="true" />
              </CardTitle>
            </motion.div>
          </CardHeader>

          <CardContent>
            <motion.p 
              className="text-center text-muted-foreground mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Let's personalize your experience and earn some points along the way!
            </motion.p>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-6"
        >
          <PreferenceWizard />
        </motion.div>
      </motion.div>
    </div>
  );
}