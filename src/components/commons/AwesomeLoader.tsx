import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * The app's loading primitive (~47 call sites).
 *
 * Design intent: Baselinq produces legally defensible contract records, so a
 * loading state should read as a record being written, not as a consumer app
 * booting up. The mark is three stacked rules drawing themselves left to
 * right — a ledger line filling in. It carries the motion, so the label
 * doesn't need a pulsing dot or a pill to look alive.
 *
 * The previous version was a 160px orbit ring with a magnifying-glass icon
 * (which reads as *search*, not *load*), a neon dot glow, and a morphing
 * 28-40px radius that fought the 6px radius token. It also reserved
 * min-h-[400px] to announce a table fetch.
 */

interface AwesomeLoaderProps {
  message?: string;
  /** Overlays the viewport. For route-level and blocking waits. */
  fullPage?: boolean;
  /** Inline, for waits inside an existing panel. Equivalent to size="sm". */
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Bar widths are fixed px rather than percentages so the mark keeps its
// proportions regardless of what it's dropped into.
const SIZES = {
  sm: { bar: "h-[3px]", widths: [28, 19, 24], gap: "gap-1", text: "text-xs" },
  md: { bar: "h-1", widths: [44, 29, 38], gap: "gap-1.5", text: "text-xs" },
  lg: { bar: "h-1.5", widths: [64, 42, 55], gap: "gap-2", text: "text-sm" },
} as const;

export const AwesomeLoader: React.FC<AwesomeLoaderProps> = ({
  message = "Loading",
  fullPage = false,
  compact = false,
  size,
  className,
}) => {
  const reduceMotion = useReducedMotion();
  const scale = size ?? (fullPage ? "lg" : compact ? "sm" : "md");
  const { bar, widths, gap, text } = SIZES[scale];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        fullPage
          ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          : compact
          ? "w-full py-6"
          : "w-full py-16",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("flex flex-col items-start", gap)}>
        {widths.map((width, i) => (
          <motion.div
            key={i}
            // origin-left so the rule draws outward from the margin, the way
            // a line of a record is written, rather than growing from centre.
            className={cn(
              "origin-left rounded-full",
              bar,
              i === 0 ? "bg-primary" : "bg-border"
            )}
            style={{ width }}
            initial={reduceMotion ? undefined : { scaleX: 0.25, opacity: 0.35 }}
            animate={
              reduceMotion
                ? { opacity: 0.6 }
                : { scaleX: [0.25, 1, 0.25], opacity: [0.35, 1, 0.35] }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.16,
                  }
            }
          />
        ))}
      </div>

      {message && (
        <span className={cn("mt-4 text-muted-foreground", text)}>{message}</span>
      )}
    </div>
  );
};
