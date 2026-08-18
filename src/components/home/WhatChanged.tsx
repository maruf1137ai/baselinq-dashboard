/**
 * "What changed" — the right-hand column's second panel.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 *
 * The queue on the left answers "what must I do". This answers the other
 * question a person opening a project asks, which the page had no answer to at
 * all: **what has moved since I last looked.**
 *
 * The two are deliberately disjoint. Nothing appears here that is also a queue
 * row, because a thing that needs doing belongs in the list of things that
 * need doing, and printing it twice makes the queue look longer than it is:
 *
 *   an OPEN notice deadline    → queue. Only a SERVED or LAPSED one is news.
 *   an OPEN task or RFI        → queue. Only a CLOSED one is news.
 *   a certificate to certify   → queue. Its CERTIFICATION is news.
 *
 * ── Role-tailoring ───────────────────────────────────────────────────────
 *
 * Every event declares the permissions its source endpoint requires, and
 * `buildChangeFeed` drops anything the viewer does not hold — the same rule as
 * `filterQueueByPermission`, failing closed on an absent flag. A contractor
 * without `finance.view` is not shown a greyed-out "PC-006 was certified": the
 * row is not in their list, and the panel is shorter.
 *
 * ── Its honest limit ─────────────────────────────────────────────────────
 *
 * There is no activity endpoint on the backend and no generic audit model. The
 * two append-only histories that would serve this properly —
 * `PaymentCertificateAudit` and `MilestoneDateChange` — exist with the right
 * ordering indexes and have no HTTP surface at all. So the feed is assembled
 * from the payloads the page already fetched, ordered by workflow timestamps
 * where they exist and by `updated_at` where they do not.
 *
 * That difference is carried in the WORDING, not hidden: "PC-006 was
 * certified" where `posted_at` says so, "VO-014 was updated" where only
 * `updated_at` is available. The panel never claims to know which field moved.
 */
import { Link } from "react-router-dom";

import { Panel } from "./blocks";
import { relativeDays, daysUntil } from "@/lib/homeSignals";
import type { ChangeEvent, ChangeFeed } from "@/lib/homeVisuals";

/**
 * "today" / "3 days ago" — the same vocabulary the queue uses for its clocks,
 * so two panels side by side do not date things two different ways.
 */
function whenOf(at: string): string | null {
  const d = daysUntil(at);
  if (d === null) return null;
  // `relativeDays` words a past date as "N days ago" and today as "today".
  return relativeDays(d);
}

function EventRow({ event }: { event: ChangeEvent }) {
  const when = whenOf(event.at);
  return (
    <Link
      to={event.href}
      className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-ring-offset-1"
    >
      <div className="min-w-0">
        <p className="text-sm text-foreground truncate">{event.headline}</p>
        {event.detail && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{event.detail}</p>
        )}
      </div>
      {/* Rank is carried by position — newest first — so the date is reference
          rather than emphasis, and no row carries a severity chip. Nothing in
          this panel is a breach; it is a record of movement. */}
      {when && (
        <p className="text-xs text-muted-foreground tabular-nums shrink-0">{when}</p>
      )}
    </Link>
  );
}

export function WhatChangedBlock({ feed }: { feed: ChangeFeed }) {
  if (feed.events.length === 0) {
    return (
      <Panel
        title="What changed"
        hint="Nothing has moved on this project recently."
      />
    );
  }

  return (
    <Panel
      title="What changed"
      lead={`${feed.events.length} recent`}
      // The disclosure, in the one place a reader will see it before drawing a
      // conclusion from a short list.
      hint={
        feed.undatedCount > 0
          ? `${feed.undatedCount} further records carry no date and cannot be placed in this order.`
          : undefined
      }
    >
      {feed.events.map((e) => (
        <EventRow key={e.key} event={e} />
      ))}
    </Panel>
  );
}
