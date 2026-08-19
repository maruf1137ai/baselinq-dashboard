/**
 * PageHeader — the standard page title block.
 *
 * THE PAGE-TOP RULE (one treatment, everywhere)
 * ---------------------------------------------
 * Every dashboard page is built exactly like this:
 *
 *   <DashboardLayout>                 // keeps the default p-6 — 24px inset
 *     <div className="space-y-6">     // 24px between every top-level band
 *       <PageHeader title="…" />      // ALWAYS the first child
 *       …tab strip, then content…
 *     </div>
 *   </DashboardLayout>
 *
 * Which fixes the page title's top edge at 24px from the top of the content
 * area and its left edge at 24px, on every page. A tab strip is the next
 * sibling (so it begins 24px under the title block) and the tab body is the
 * one after that (another 24px). Tab strips themselves are
 * `text-sm py-4 px-6 border-b-2 -mb-px` on a `border-b border-border` rail.
 *
 * Do not pass `padding` to DashboardLayout to get a different inset. The two
 * pages that legitimately need a full-bleed BODY — Communications and Linq,
 * both of which host a chat pane that must reach the viewport edges — pass
 * `padding="p-0"` and then re-apply `p-6` to their own header band, so their
 * title still lands on the same 24px baseline as everything else. A
 * full-bleed body is not a licence for a differently-positioned title.
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
 *   <PageHeader title="Documents" meta={<span>12 documents</span>} />
 */
import * as React from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /**
   * Usually a string. Widened to `ReactNode` for the one page whose title IS
   * its content — Home, whose h1 carries the verdict and links it. Nothing
   * about the layout, spacing or type scale changed to allow it: the node is
   * rendered inside the same `h1`, so a page that passes a string is byte-for-
   * byte what it was.
   *
   * A title node must stay a title: one short phrase, no block elements, no
   * controls other than a link around the phrase itself.
   */
  title: React.ReactNode;
  description?: string;
  /**
   * Small print that belongs ON the title line rather than under it — a live
   * count, a status word. Documents shows "12 documents" here. Kept as a slot
   * so pages that need it don't have to hand-roll the whole header back.
   */
  meta?: React.ReactNode;
  /** Right-aligned controls — buttons, filters, etc. */
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)} {...props}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-2xl font-normal tracking-tight text-foreground">
            {title}
          </h1>
          {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
