import * as React from "react";
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AuthErrorProps {
  type?: "error" | "warning" | "info" | "success";
  title?: string;
  message: string;
  className?: string;
}

const icons = {
  error: XCircle,
  warning: AlertTriangle,
  info: AlertCircle,
  success: CheckCircle,
};

const styles = {
  error: "bg-destructive/15 text-destructive border-destructive/50",
  warning: "bg-warning/15 text-warning border-warning/50",
  info: "bg-primary/15 text-primary border-primary/50",
  success: "bg-success/15 text-success border-success/50",
};

export function AuthError({
  type = "error",
  title,
  message,
  className,
}: AuthErrorProps) {
  const Icon = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        styles[type],
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div className="grid gap-1">
        {title && <h5 className="font-medium leading-none tracking-tight">{title}</h5>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
    </motion.div>
  );
}
