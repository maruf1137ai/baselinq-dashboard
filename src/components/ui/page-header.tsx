/**
 * PageHeader — the standard page title block.
 *
 * WHY THIS EXISTS
 * ---------------
 * Most dashboard pages already agree on the title treatment:
 *
 *   <h1 className="text-2xl font-normal tracking-tight text-foreground">
 *
 * ...but the class string is retyped on every page, so drift is inevitable
 * and had already happened — some pages reached text-3xl, one used
 * text-xl font-medium, one used a non-existent `font-regular` class, and the
 * dashboard home had no page title at all. Encoding the convention once
 * means it can't drift again, and changing it later is one file.
 *
 * USAGE
 *   <PageHeader title="Documents" />
 *   <PageHeader title="Finance" description="…" actions={<Button/>} />
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  /** Right-aligned controls — buttons, filters, etc. */
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
      <div className="min-w-0">
        <h1 className="text-2xl font-normal tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
