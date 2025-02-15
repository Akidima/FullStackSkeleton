import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

function calculateStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  // Length checks (max 30 points)
  if (password.length >= 8) score += 15;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 5;

  // Character variety checks (max 50 points)
  if (/[A-Z]/.test(password)) score += 10; // uppercase
  if (/[a-z]/.test(password)) score += 10; // lowercase
  if (/[0-9]/.test(password)) score += 10; // numbers
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20; // special chars

  // Additional security checks (max 20 points)
  if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters
  if (password.length >= 8 && /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/.test(password)) {
    score += 10; // Has all required character types
  }

  // Common patterns check (negative)
  const commonPatterns = [
    /^password/i,
    /^12345/,
    /^qwerty/i,
    /^admin/i,
    /(.)\1{2,}/ // repeated characters
  ];
  if (commonPatterns.some(pattern => pattern.test(password))) {
    score -= 30;
  }

  return Math.min(Math.max(score, 0), 100);
}

function getStrengthText(score: number): { text: string; color: string; details: string[] } {
  const details: string[] = [];

  if (score === 0) return { 
    text: "No password", 
    color: "bg-muted",
    details: ["Please enter a password"]
  };

  if (score < 30) return { 
    text: "Very weak", 
    color: "bg-destructive",
    details: [
      "Password is too weak",
      "Add uppercase letters",
      "Add numbers",
      "Add special characters (!@#$%^&*(),.?\":{}|<>)",
      "Avoid common patterns"
    ]
  };

  if (score < 50) return { 
    text: "Weak", 
    color: "bg-orange-500",
    details: [
      "Add more character types",
      "Make it longer",
      "Add special characters"
    ]
  };

  if (score < 80) return { 
    text: "Good", 
    color: "bg-yellow-500",
    details: [
      "Consider adding more length",
      "Mix in more special characters"
    ]
  };

  return { 
    text: "Strong", 
    color: "bg-green-500",
    details: ["Password meets all security requirements"]
  };
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthProps) {
  const strength = calculateStrength(password);
  const { text, color, details } = getStrengthText(strength);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-2 relative">
        <Progress 
          value={strength} 
          className={cn(
            "h-2 transition-all", 
            color
          )}
        />
      </div>
      <p className={cn(
        "text-xs font-medium",
        strength >= 80 ? "text-green-500" :
        strength >= 50 ? "text-yellow-500" :
        strength >= 30 ? "text-orange-500" :
        "text-destructive"
      )}>
        Password strength: {text}
      </p>
      <ul className="text-xs space-y-1 text-muted-foreground">
        {details.map((detail, index) => (
          <li key={index} className="flex items-center">
            <span className="mr-1">•</span>
            {detail}
          </li>
        ))}
      </ul>
    </div>
  );
}