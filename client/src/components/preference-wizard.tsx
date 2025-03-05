import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Award, Clock, Layout, Bell, Palette } from "lucide-react";

interface PreferenceOption {
  key: string;
  value: string;
  points: number;
}

interface PreferenceCard {
  id: number;
  title: string;
  description: string;
  icon: JSX.Element;
  options: PreferenceOption[];
  completed: boolean;
}

export function PreferenceWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [preferences, setPreferences] = useState<Record<string, string>>({});

  const preferenceCards: PreferenceCard[] = [
    {
      id: 1,
      title: "Theme Customization",
      description: "Choose your preferred visual style",
      icon: <Palette className="h-6 w-6 text-primary" />,
      options: [
        { key: "theme", value: "light", points: 10 },
        { key: "theme", value: "dark", points: 10 },
        { key: "theme", value: "system", points: 15 }
      ],
      completed: false
    },
    {
      id: 2,
      title: "Dashboard Layout",
      description: "Set up your perfect workspace",
      icon: <Layout className="h-6 w-6 text-primary" />,
      options: [
        { key: "dashboardLayout", value: "compact", points: 10 },
        { key: "dashboardLayout", value: "comfortable", points: 10 },
        { key: "dashboardLayout", value: "spacious", points: 10 }
      ],
      completed: false
    },
    {
      id: 3,
      title: "Meeting Preferences",
      description: "Configure your ideal meeting settings",
      icon: <Clock className="h-6 w-6 text-primary" />,
      options: [
        { key: "preferredDuration", value: "30", points: 15 },
        { key: "preferredDuration", value: "45", points: 15 },
        { key: "preferredDuration", value: "60", points: 15 }
      ],
      completed: false
    },
    {
      id: 4,
      title: "Notification Settings",
      description: "Stay updated your way",
      icon: <Bell className="h-6 w-6 text-primary" />,
      options: [
        { key: "notifications", value: "all", points: 20 },
        { key: "notifications", value: "important", points: 15 },
        { key: "notifications", value: "minimal", points: 10 }
      ],
      completed: false
    }
  ];

  const handlePreferenceSelect = (key: string, value: string, points: number) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setScore(prev => prev + points);
    
    // Show achievement toast
    toast({
      title: "Achievement Unlocked! 🎉",
      description: `You earned ${points} points for customizing your experience!`,
    });
  };

  const progress = ((currentStep + 1) / preferenceCards.length) * 100;

  const handleNext = () => {
    if (currentStep < preferenceCards.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    try {
      const response = await fetch('/api/users/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        toast({
          title: "Setup Complete! 🎮",
          description: `Congratulations! You've earned ${score} points setting up your perfect workspace!`,
        });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Customize Your Experience</h2>
        <div className="flex items-center gap-2 justify-center mb-4">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-semibold">Score: {score}</span>
        </div>
        <Progress value={progress} className="w-full h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                {preferenceCards[currentStep].icon}
                <CardTitle>{preferenceCards[currentStep].title}</CardTitle>
              </div>
              <p className="text-muted-foreground">
                {preferenceCards[currentStep].description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {preferenceCards[currentStep].options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handlePreferenceSelect(option.key, option.value, option.points)}
                  >
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={preferences[option.key] === option.value}
                        onCheckedChange={() => handlePreferenceSelect(option.key, option.value, option.points)}
                      />
                      <span className="font-medium">{option.value}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">{option.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              {currentStep === preferenceCards.length - 1 ? (
                <Button onClick={handleFinish}>Complete Setup</Button>
              ) : (
                <Button onClick={handleNext}>Next</Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
