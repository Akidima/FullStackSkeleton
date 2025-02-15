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
  
  // Length check
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  
  // Character variety checks
  if (/[A-Z]/.test(password)) score += 20; // uppercase
  if (/[a-z]/.test(password)) score += 20; // lowercase
  if (/[0-9]/.test(password)) score += 20; // numbers
  if (/[^A-Za-z0-9]/.test(password)) score += 20; // special chars
  
  // Common patterns check (negative)
  const commonPatterns = [
    /^password/i,
    /^12345/,
    /^qwerty/i,
    /^admin/i
  ];
  if (commonPatterns.some(pattern => pattern.test(password))) {
    score -= 20;
  }
  
  return Math.min(Math.max(score, 0), 100);
}

function getStrengthText(score: number): { text: string; color: string } {
  if (score === 0) return { text: "No password", color: "bg-muted" };
  if (score < 30) return { text: "Very weak", color: "bg-destructive" };
  if (score < 50) return { text: "Weak", color: "bg-orange-500" };
  if (score < 80) return { text: "Good", color: "bg-yellow-500" };
  return { text: "Strong", color: "bg-green-500" };
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthProps) {
  const strength = calculateStrength(password);
  const { text, color } = getStrengthText(strength);
  
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
        "text-xs",
        strength >= 80 ? "text-green-500" :
        strength >= 50 ? "text-yellow-500" :
        strength >= 30 ? "text-orange-500" :
        "text-destructive"
      )}>
        Password strength: {text}
      </p>
    </div>
  );
}
