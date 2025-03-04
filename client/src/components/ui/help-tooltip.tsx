import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  context: string;
  className?: string;
  children?: React.ReactNode;
}

export function HelpTooltip({ context, className, children }: HelpTooltipProps) {
  // This will be enhanced with AI suggestions later
  const getContextualHelp = (context: string) => {
    const helpText: Record<string, string> = {
      'profile.displayName': 'Choose a display name that will be visible to other users in meetings and communications.',
      'profile.bio': 'Add a brief description about yourself, your role, or your expertise.',
      'profile.theme': 'Select your preferred color theme. This affects how the application looks.',
      'profile.language': 'Choose your preferred language for the application interface.',
      'notifications.email': 'Configure how you receive email notifications for meetings and updates.',
      'notifications.frequency': 'Set how often you want to receive notification digests.',
      'meeting.title': 'Enter a clear and concise title that describes the purpose of the meeting.',
      'meeting.agenda': 'Outline the main topics to be discussed during the meeting.',
      'meeting.participants': 'Add team members who should attend this meeting.',
    };

    return helpText[context] || 'Click for more information about this field.';
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center", className)}>
            {children}
            <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground hover:text-primary cursor-help" />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-[300px] text-sm" 
          side="right"
          sideOffset={5}
        >
          {getContextualHelp(context)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}