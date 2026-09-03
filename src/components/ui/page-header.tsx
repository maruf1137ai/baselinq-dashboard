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
 * PAGES UNDER A p-0 HOST — use <PageBody>
 * ---------------------------------------
 * `Settings` is a `padding="p-0"` shell around an `<Outlet />`, so each of its
 * twelve children had to supply its own inset — and twelve pages supplying
 * their own inset produced six different answers:
 *
 *   p-6 space-y-6      audit, billing, dataManagement, integrations,
 *                      notifications, security, teamManagement
 *   max-w-5xl p-6      projectDetails            (no band rhythm)
 *   max-w-5xl p-6 pb-32  Organization            (128px of dead bottom)
 *   max-w-5xl p-6 pb-20  AssociatedCompanies     (80px of dead bottom)
 *   p-6                Site                      (and a hand-rolled <h2>)
 *   space-y-4 pb-24    permissions               (NO inset — title flush
 *                                                 against the page edge)
 *
 * `PageBody` is that inset expressed once. It is for any page whose HOST
 * supplies no padding; a page inside a default DashboardLayout already has
 * `p-6` from the layout and keeps a plain `space-y-6` wrapper instead.
 *
 * The bottom inset is deliberately the same 24px as the top. The `pb-32` and
 * `pb-20` this replaces were not clearing a sticky action bar — neither page
 * has one — so they were 128px and 80px of arbitrary dead space at the foot
 * of two sibling pages in the same section.
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
 *   <PageHeader title="Documents" reference={<Link>Document reference</Link>} actions={<Button/>} />
 *
 * `reference` and `actions` both render on the title row, right-aligned, and
 * wrap to a second row only when they genuinely cannot fit.
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
  /** Page controls — buttons, filters, search. Right-aligned on the title row. */
  actions?: React.ReactNode;
  /** Right-aligned on the title row — the "? X reference" help link. */
  reference?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  reference,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn(className)} {...props}>
      {/*
        ── Actions ride the title row ──────────────────────────────────────

        They used to render in a row of their own below the title, on
        `mt-3`. Measured at 1440px that row cost 44px — 12px of margin and a
        32px control — on every page that has one, and what it held was one
        or two small buttons with a title row half empty beside them:

          Documents        "Ask AI" / "Upload"
          Compliance       "Analyse with AI" / "Track obligation"
          Project Health   "Refresh"            (a single button, 44px)
          Meetings         "Schedule"

        Four pages, 44px each, for controls that fit next to the title. So
        the header is one row: identity on the left, controls on the right.
        `flex-wrap` means a page that genuinely cannot fit both still gets
        its second row rather than a crushed one — it is a fallback now
        instead of the default.

        Actions sit outermost because a primary action belongs at the end of
        the row; `reference` — the quiet "? X reference" link — sits inside
        them, where it stays out of the way of the thing people click.
      */}
      <div className="flex items-start justify-between gap-x-4 gap-y-2 flex-wrap">
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
        {(reference || actions) && (
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            {reference}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;

/**
 * The standard page body for a page whose HOST supplies no padding.
 *
 * `p-6 space-y-6` — the same 24px inset and the same 24px band rhythm a page
 * inside a default `DashboardLayout` gets from the layout itself. Use it under
 * any `padding="p-0"` host; do NOT use it inside a default `DashboardLayout`,
 * which would double the inset to 48px.
 *
 * `width="prose"` caps the column at `max-w-5xl` for the long settings forms
 * that read badly full-bleed. It is the same cap those forms already used —
 * this only stops each of them re-declaring it.
 */
export function PageBody({
  width = "full",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: "full" | "prose" }) {
  return (
    <div
      className={cn("p-6 space-y-6", width === "prose" && "max-w-5xl", className)}
      {...props}
    >
      {children}
    </div>
  );
}
