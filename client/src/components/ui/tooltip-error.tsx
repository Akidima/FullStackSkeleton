import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipErrorProps {
  message?: string;
  show?: boolean;
  className?: string;
}

export function TooltipError({
  message,
  show = true,
  className,
}: TooltipErrorProps) {
  const motionProps: HTMLMotionProps<"div"> = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2 },
  };

  return (
    <>
      {show && message && (
        <motion.div
          {...motionProps}
          className={cn(
            "absolute -top-2 left-0 z-50 transform -translate-y-full",
            "px-3 py-1 rounded-md bg-destructive text-destructive-foreground",
            "text-sm font-medium shadow-lg",
            "before:content-[''] before:absolute before:left-4 before:top-full",
            "before:border-4 before:border-transparent",
            "before:border-t-destructive",
            className
          )}
        >
          {message}
        </motion.div>
      )}
    </>
  );
}