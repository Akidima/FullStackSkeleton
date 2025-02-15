import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  show?: boolean;
}

export function TooltipError({
  message,
  show = true,
  className,
  ...props
}: TooltipErrorProps) {
  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute -top-2 left-0 z-50 transform -translate-y-full",
            "px-3 py-1 rounded-md bg-destructive text-destructive-foreground",
            "text-sm font-medium shadow-lg",
            "before:content-[''] before:absolute before:left-4 before:top-full",
            "before:border-4 before:border-transparent",
            "before:border-t-destructive",
            className
          )}
          {...props}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
