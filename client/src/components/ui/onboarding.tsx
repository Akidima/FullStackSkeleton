import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, Plus, Search, Settings } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  targetId: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Create Meetings",
    description: "Click here to schedule a new meeting and invite participants.",
    icon: <Plus className="h-4 w-4" />,
    targetId: "new-meeting-button",
  },
  {
    title: "View Calendar",
    description: "See all your upcoming meetings in calendar view.",
    icon: <Calendar className="h-4 w-4" />,
    targetId: "calendar-view",
  },
  {
    title: "Search Meetings",
    description: "Quickly find past or upcoming meetings.",
    icon: <Search className="h-4 w-4" />,
    targetId: "search-meetings",
  },
  {
    title: "Settings",
    description: "Customize your preferences and notifications.",
    icon: <Settings className="h-4 w-4" />,
    targetId: "settings-button",
  },
];

export const OnboardingContext = React.createContext<{
  startTutorial: () => void;
  skipTutorial: () => void;
  currentStep: number;
  isOpen: boolean;
}>({
  startTutorial: () => {},
  skipTutorial: () => {},
  currentStep: 0,
  isOpen: false,
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const { toast } = useToast();
  const [hasCompletedTutorial, setHasCompletedTutorial] = React.useState(() => {
    return localStorage.getItem("onboardingCompleted") === "true";
  });

  React.useEffect(() => {
    // Show onboarding for new users
    if (!hasCompletedTutorial) {
      setIsOpen(true);
    }
  }, [hasCompletedTutorial]);

  const startTutorial = React.useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const skipTutorial = React.useCallback(() => {
    setIsOpen(false);
    localStorage.setItem("onboardingCompleted", "true");
    setHasCompletedTutorial(true);
    toast({
      title: "Tutorial skipped",
      description: "You can restart the tutorial anytime from the help menu.",
    });
  }, [toast]);

  const completeTutorial = React.useCallback(() => {
    setIsOpen(false);
    localStorage.setItem("onboardingCompleted", "true");
    setHasCompletedTutorial(true);
    toast({
      title: "Welcome aboard! 🎉",
      description: "You're all set to start managing your meetings efficiently.",
    });
  }, [toast]);

  const nextStep = React.useCallback(() => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeTutorial();
    }
  }, [currentStep, completeTutorial]);

  return (
    <OnboardingContext.Provider
      value={{
        startTutorial,
        skipTutorial,
        currentStep,
        isOpen,
      }}
    >
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome to Meeting Manager!</DialogTitle>
            <DialogDescription>
              Let's take a quick tour of the key features to help you get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              {onboardingSteps[currentStep].icon}
              <div className="space-y-1">
                <h4 className="text-sm font-medium leading-none">
                  {onboardingSteps[currentStep].title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {onboardingSteps[currentStep].description}
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-1">
              {onboardingSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 w-8 rounded-full ${
                    index === currentStep
                      ? "bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={skipTutorial}>
              Skip Tutorial
            </Button>
            <Button onClick={nextStep}>
              {currentStep === onboardingSteps.length - 1
                ? "Finish"
                : "Next Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}

export function OnboardingTooltip({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { isOpen, currentStep } = React.useContext(OnboardingContext);
  const currentOnboardingStep = onboardingSteps[currentStep];

  if (!isOpen || currentOnboardingStep.targetId !== id) {
    return children;
  }

  return (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p>{currentOnboardingStep.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function useOnboarding() {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
