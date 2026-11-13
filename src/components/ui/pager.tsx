import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The one pager under every paged table: "26–50 of 112", then
 * previous / page numbers / next. Renders nothing when everything fits on one page.
 */
export function Pager({
  page,
  pageSize,
  count,
  totalPages,
  onPage,
  loading = false,
  compact = false,
  className,
}: {
  page: number;
  pageSize: number;
  count: number;
  totalPages: number;
  onPage: (page: number) => void;
  loading?: boolean;
  /** "1–5 of 27  ‹ ›" only, right-aligned — the Finance pages' small boxes. */
  compact?: boolean;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(count, page * pageSize);

  if (compact) {
    const arrow =
      "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent";
    return (
      <nav
        aria-label="Pagination"
        className={cn("flex items-center justify-end gap-1 border-t border-border px-4 py-2 text-xs text-muted-foreground", className)}
      >
        <span className="mr-1 tabular-nums">
          {from}–{to} of {count}
        </span>
        <button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)} className={arrow}>
          <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label="Next page" disabled={page >= totalPages || loading} onClick={() => onPage(page + 1)} className={arrow}>
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </button>
      </nav>
    );
  }

  // First, last, and two either side of the current page; gaps become "…".
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "gap") pages.push("gap");
  }

  const btn =
    "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3 border-t border-border px-4 py-2.5", className)}
    >
      <span className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} of {count}
      </span>
      <div className={cn("flex items-center gap-1", loading && "opacity-60")}>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
          className={cn(btn, "text-muted-foreground hover:bg-muted hover:text-foreground")}
        >
          <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
        </button>
        {pages.map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              disabled={loading}
              onClick={() => onPage(p)}
              className={cn(
                btn,
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages || loading}
          onClick={() => onPage(page + 1)}
          className={cn(btn, "text-muted-foreground hover:bg-muted hover:text-foreground")}
        >
          <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}

/** Client-side paging for a list already in memory (one payload, e.g. Financial Position). */
export function pageOf<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    rows: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
    count: items.length,
    pageSize,
  };
}
