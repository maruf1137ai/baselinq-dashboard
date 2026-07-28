/**
 * StatusBadge — one component for every status pill in the app.
 *
 * WHY THIS EXISTS
 * ---------------
 * An audit found roughly twelve parallel implementations of "status pill",
 * spread across TaskDetails, Compliance, AuditPage, ProjectHealth,
 * HealthBadge, ProjectStatusCard, RecentActivity, chatSammary, RiskOverView,
 * TimeBarsTab and MeetingStatusBadges. They disagreed on hue (green vs
 * emerald, amber vs orange vs yellow), on intensity (bg-*-50 vs -100 vs
 * -500 vs -600), and on whether a border was drawn at all — so the same
 * logical state rendered differently depending on which page you were on.
 *
 * `src/lib/statusColors.ts` already solved this and was imported by only two
 * files. This component makes that helper the path of least resistance
 * rather than the road less travelled.
 *
 * USAGE
 *   <StatusBadge status={task.status} />           // maps the string
 *   <StatusBadge status="Approved" tone="success" /> // force a tone
 */
import * as React from "react";

import { cn } from "@/lib/utils";
import { getStatusBadgeClasses } from "@/lib/statusColors";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/** Explicit tones, for cases where the label doesn't imply the state. */
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-primary/10 text-primary border border-primary/30",
  neutral: "bg-muted text-muted-foreground border border-border",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The status string as it comes from the API, e.g. "Under Review". */
  status?: string | null;
  /** Override the derived colour when the label alone isn't enough. */
  tone?: StatusTone;
  /** Render a leading dot instead of a filled pill. */
  dot?: boolean;
  /** Display text, if it should differ from `status`. */
  label?: string;
}

export function StatusBadge({
  status,
  tone,
  dot = false,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  const text = label ?? status ?? "";
  const classes = tone ? TONE_CLASSES[tone] : getStatusBadgeClasses(status ?? "");

  if (dot) {
    // Dot form for dense rows (sidebars, tables) where a full pill is heavy.
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)} {...props}>
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColour(classes))}
          aria-hidden="true"
        />
        <span className="text-muted-foreground">{text}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        // rounded-md to match the Badge primitive — see the note there on
        // why status chips are squared rather than pill-shaped.
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        classes,
        className
      )}
      {...props}
    >
      {text}
    </span>
  );
}

/**
 * Derive a solid dot colour from the pill classes, so the dot and pill forms
 * can never drift apart.
 */
function dotColour(classes: string): string {
  if (classes.includes("green")) return "bg-green-600";
  if (classes.includes("amber")) return "bg-amber-500";
  if (classes.includes("red")) return "bg-red-600";
  if (classes.includes("primary")) return "bg-primary";
  return "bg-muted-foreground";
}

export default StatusBadge;
