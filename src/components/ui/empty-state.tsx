/**
 * EmptyState — the "there's nothing here yet" block.
 *
 * WHY THIS EXISTS
 * ---------------
 * There were five-plus hand-rolled empty states across the app using four
 * different vertical paddings (py-12 / 14 / 16 / 24), three different border
 * treatments (dashed, solid, none) and two text colours — plus three
 * near-duplicate local components all called some variant of "EmptyState".
 *
 * An empty screen is where a user decides whether a product feels finished.
 * Worth having exactly one of.
 *
 * USAGE
 *   <EmptyState
 *     icon={FileArchive}
 *     title="No evidence packs yet"
 *     description="Compile one when a claim is notified."
 *     action={<Button size="sm">Compile pack</Button>}
 *   />
 */
import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** `bordered` (default) sits in a dashed well; `plain` for inside cards. */
  variant?: "bordered" | "plain";
  /** `sm` for panels and drawers, `md` (default) for full pages. */
  size?: "sm" | "md";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "bordered",
  size = "md",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "py-10 gap-2" : "py-16 gap-3",
        variant === "bordered" && "rounded-xl border border-dashed border-border",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn("text-muted-foreground", size === "sm" ? "h-6 w-6" : "h-8 w-8")}
          aria-hidden="true"
        />
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
