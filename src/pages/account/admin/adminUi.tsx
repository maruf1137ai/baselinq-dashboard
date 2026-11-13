import React from "react";
import { format } from "date-fns";

import { PageHeader } from "@/components/ui/page-header";

/** Shared building blocks for the admin panel pages. */

/*
  px-3, not px-6.

  Measured on the Fees table at 1440px — the width of an ordinary laptop —
  with ten columns: the table wanted 1492px and had 1134px, and 480px of what
  it wanted was cell padding. A third of the table was gutter. Halving it
  returns 240px, which with the width cap gone is most of the difference
  between a table that fits and one that scrolls sideways and hides its date
  column.
*/
export const TH = "px-3 py-3 text-left text-xs font-normal text-muted-foreground tracking-wider whitespace-nowrap";
export const TD = "px-3 py-3 text-sm text-foreground whitespace-nowrap";

/*
  Numeric columns.

  Money was rendered with `tabular-nums` — so the glyphs were already
  fixed-width — and then left-aligned, which throws away the entire benefit:
  R 3 388 140,00 and R 96 300,00 start at the same x and end wherever they
  end, so nothing lines up and the only way to compare two magnitudes is to
  count digits. Right-aligned, the decimal commas form a column and the eye
  reads order of magnitude from the shape alone.

  This is the whole reason a finance table is right-aligned, and it was the
  most visible problem on the screen once the clipping was fixed.
*/
export const TH_NUM = `${TH} !text-right`;
export const TD_NUM = `${TD} text-right tabular-nums`;

export const formatDate = (value: string) => format(new Date(value), "d MMM yyyy");

export function AdminPage({ title, description, prose = false, children }: {
  title: string; description: string;
  /**
   * Cap the page at a comfortable reading width. For pages that are mostly
   * sentences — the billing guide — rather than a table. Default is full
   * width, because everything else here is a wide register.
   */
  prose?: boolean;
  children: React.ReactNode;
}) {
  return (
    // Full width by default. Every table in the admin panel is a wide,
    // many-column register — Fees alone carries date, project, source, base,
    // rate, fee, VAT, total and status, all `whitespace-nowrap`. Capping the
    // shell at max-w-6xl (1152px) made that table wider than its own
    // container, so SectionCard's `overflow-x-auto` engaged and clipped the
    // leading date column ("Nov 2026" rendered as "ov 2026") while most of
    // the viewport sat empty to the right. Finance, Programme and Documents
    // all run full width for the same reason; the admin panel was the only
    // page that did not.
    <div className={`p-6 space-y-6${prose ? " max-w-5xl" : ""}`}>
      <PageHeader title={title} description={description} />
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: {
  label: string; value: number; hint?: string; icon: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-card shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tracking-wider">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-normal text-foreground tabular-nums">{value.toLocaleString()}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/50">
        <h3 className="text-sm font-normal text-foreground tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function ErrorNotice({ error }: { error: unknown }) {
  return (
    <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded-xl p-4 text-sm">
      Couldn't load this: {(error as Error)?.message || "unknown error"}
    </div>
  );
}
