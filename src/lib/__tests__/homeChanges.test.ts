/**
 * Tests for the "What changed" feed.
 *
 * Not a snapshot. Each test names the decision it is protecting, in the style
 * of `homeQueueRank.test.ts` — the point is that somebody changing this file
 * in a year can see what they are about to break.
 */
import { describe, it, expect } from "vitest";

import {
  buildCertificateChanges,
  buildChangeFeed,
  buildDocumentChanges,
  buildMeetingChanges,
  buildMilestoneChanges,
  buildNoticeChanges,
  buildTaskChanges,
  buildVariationChanges,
  filterChangesByPermission,
  isComplianceRestrictedText,
  isFinanceRestrictedText,
  isOnTheShelf,
  rankChanges,
  SHELF_LIFE_DAYS,
  TASK_FOLD_MIN,
  TASK_STREAM_CAP,
  type ChangeItem,
} from "../homeChanges";
import { FINANCE_TAB, resolveFinanceAccess } from "../homeSignals";

const NOW = new Date("2026-08-17T09:00:00Z");

/** An ISO instant `daysAgo` days before NOW. */
const ago = (daysAgo: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

/** A bare YYYY-MM-DD `daysAgo` days before NOW. */
const dateAgo = (daysAgo: number) => ago(daysAgo).slice(0, 10);

const CERTIFICATES = `/finance?tab=${encodeURIComponent(FINANCE_TAB.certificates)}`;
const VARIATIONS = `/finance?tab=${encodeURIComponent(FINANCE_TAB.variations)}`;

const ALL = { canViewFinance: true, canViewCompliance: true, canViewProgramme: true, canViewDocuments: true };
// A contractor holds document.view (any project member can see documents),
// compliance.view and programme.view (they're executing the programme), but
// not finance.view — used throughout to isolate the finance-restricted-
// vocabulary guard from the (separate) base document.view/programme.view
// gates.
const CONTRACTOR = {
  canViewFinance: false,
  canViewCompliance: true,
  canViewDocuments: true,
  canViewProgramme: true,
};

// ── The event model ───────────────────────────────────────────────────────

describe("an event is an object at its current state", () => {
  it("gives a variation that moved four times in a day exactly one row", () => {
    // Draft → Submitted → Priced → Approved. The payload can only ever
    // describe where it ended up, which is the whole dedup rule.
    const { items } = buildVariationChanges(
      [{ id: 43, ref: "VO-004", status: "approved", update_at: ago(1) }],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].headline).toBe("VO-004 approved");
    expect(items[0].count).toBe(1);
  });

  it("keeps the same key when an object moves state, so a refetch never duplicates it", () => {
    const draft = buildCertificateChanges(
      [{ id: 6, pcNumber: "PC-006", workflowState: "draft", updatedAt: ago(2) }],
      NOW,
    ).items[0];
    const posted = buildCertificateChanges(
      [{ id: 6, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(0) }],
      NOW,
    ).items[0];
    expect(posted.key).toBe(draft.key);
    expect(posted.significance).toBe("decisive");
    expect(draft.significance).toBe("routine");
  });

  it("draws no certificate state that the queue beside it already draws", () => {
    // `buildCertificateQueue` renders submitted and approved;
    // `buildRejectedCertificateQueue` renders rejected. Both sit in the
    // left-hand column of the same screen, for the same `finance.view`
    // audience, and neither filters per user — so a row here would be the
    // second copy of a row the reader is already looking at. See §5.
    const { items } = buildCertificateChanges(
      [
        { id: 1, pcNumber: "PC-001", workflowState: "submitted", updatedAt: ago(1) },
        { id: 2, pcNumber: "PC-002", workflowState: "approved", updatedAt: ago(1) },
        { id: 3, pcNumber: "PC-003", workflowState: "rejected", updatedAt: ago(1) },
        { id: 4, pcNumber: "PC-004", workflowState: "posted", updatedAt: ago(1) },
        { id: 5, pcNumber: "PC-005", workflowState: "draft", updatedAt: ago(1) },
      ],
      NOW,
    );
    expect(items.map((i) => i.headline)).toEqual(["PC-004 posted", "PC-005 raised"]);
  });
});

// ── Recency × criticality ─────────────────────────────────────────────────

describe("significance ranks, recency filters", () => {
  it("puts a three-week-old decisive change above an hour-old routine one", () => {
    const ranked = rankChanges([
      ...buildTaskChanges([{ id: "t1", code: "RFI-009", status: "open", createdAt: ago(0) }], NOW)
        .items,
      ...buildCertificateChanges(
        [{ id: 5, pcNumber: "PC-005", workflowState: "posted", updatedAt: ago(21) }],
        NOW,
      ).items,
    ]);
    expect(ranked.map((i) => i.headline)).toEqual(["PC-005 posted", "RFI-009 raised"]);
  });

  it("orders by recency only inside one tier", () => {
    const ranked = rankChanges(
      buildCertificateChanges(
        [
          { id: 1, pcNumber: "PC-001", workflowState: "posted", updatedAt: ago(9) },
          { id: 2, pcNumber: "PC-002", workflowState: "posted", updatedAt: ago(2) },
        ],
        NOW,
      ).items,
    );
    expect(ranked.map((i) => i.headline)).toEqual(["PC-002 posted", "PC-001 posted"]);
  });

  it("gives each tier its own shelf life rather than one window for everything", () => {
    expect(SHELF_LIFE_DAYS.decisive).toBeGreaterThan(SHELF_LIFE_DAYS.material);
    expect(SHELF_LIFE_DAYS.material).toBeGreaterThan(SHELF_LIFE_DAYS.routine);

    const at = (significance: ChangeItem["significance"], ageDays: number) =>
      isOnTheShelf({ significance, ageDays });

    // A 20-day-old decisive change is still shown; a 20-day-old routine one is
    // not. That is the "latest OR any critical" rule in one assertion.
    expect(at("decisive", 20)).toBe(true);
    expect(at("routine", 20)).toBe(false);
    // The boundary is inclusive on both sides of the comparison.
    expect(at("routine", SHELF_LIFE_DAYS.routine)).toBe(true);
    expect(at("routine", SHELF_LIFE_DAYS.routine + 1)).toBe(false);
  });

  it("drops what is past its shelf life and says how much it dropped", () => {
    const feed = buildChangeFeed(
      {
        certificates: [
          // Decisive, 40 days old — past even the longest window.
          { id: 1, pcNumber: "PC-001", workflowState: "posted", updatedAt: ago(40) },
          { id: 2, pcNumber: "PC-002", workflowState: "posted", updatedAt: ago(4) },
        ],
      },
      ALL,
      { now: NOW },
    );
    expect(feed.items.map((i) => i.headline)).toEqual(["PC-002 posted"]);
    expect(feed.aged).toBe(1);
    // Aged out is not the same as undated. Nothing here was unreadable.
    expect(feed.undated).toBe(0);
  });

  it("does not count rows cut by `limit` as aged — they are fresh, just not drawn", () => {
    const feed = buildChangeFeed(
      {
        certificates: [
          { id: 1, pcNumber: "PC-001", workflowState: "posted", updatedAt: ago(1) },
          { id: 2, pcNumber: "PC-002", workflowState: "posted", updatedAt: ago(2) },
        ],
      },
      ALL,
      { now: NOW, limit: 1 },
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.aged).toBe(0);
  });
});

// ── Volume ────────────────────────────────────────────────────────────────

describe("tasks cannot drown contractual events", () => {
  const flood = Array.from({ length: 40 }, (_, i) => ({
    id: `t${i}`,
    code: `RFI-${String(i).padStart(3, "0")}`,
    type: "RFI",
    status: "answered",
    updatedAt: ago(0),
  }));

  it("caps the whole task stream at no consequence above `material`", () => {
    const { items } = buildTaskChanges(flood, NOW);
    expect(items.every((i) => i.significance !== "decisive")).toBe(true);
  });

  it("leaves a two-week-old certificate posting first, under forty tasks answered today", () => {
    const feed = buildChangeFeed(
      {
        tasks: flood,
        certificates: [{ id: 9, pcNumber: "PC-009", workflowState: "posted", updatedAt: ago(14) }],
      },
      ALL,
      { now: NOW },
    );
    expect(feed.items[0].headline).toBe("PC-009 posted");
  });

  it("folds same-shape task events into one counted line", () => {
    const { items } = buildTaskChanges(flood, NOW);
    const folded = items.filter((i) => i.source === "task");
    expect(folded).toHaveLength(1);
    expect(folded[0].headline).toBe("40 RFIs answered");
    expect(folded[0].count).toBe(40);
    // A group cannot honestly name one of its members — the `riskGroupHref`
    // rule. It goes to the list that contains them all.
    expect(folded[0].href).toBe("/tasks");
  });

  it("does not fold a lone task, and links it to itself", () => {
    const { items } = buildTaskChanges(
      [{ id: "t1", code: "RFI-001", type: "RFI", status: "answered", updatedAt: ago(1) }],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].count).toBe(1);
    expect(items[0].href).toBe("/tasks/t1");
    expect(TASK_FOLD_MIN).toBe(2);
  });

  it("dates a folded group at its most recent member, never its oldest", () => {
    const { items } = buildTaskChanges(
      [
        { id: "a", code: "SI-001", type: "SI", status: "done", updatedAt: ago(6) },
        { id: "b", code: "SI-002", type: "SI", status: "done", updatedAt: ago(1) },
      ],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].ageDays).toBe(1);
  });

  it("caps the folded task stream and reports the overflow", () => {
    const many = ["RFI", "SI", "VO", "DC", "CPI", "GI"].flatMap((type) => [
      { id: `${type}1`, code: `${type}-001`, type, status: "done", updatedAt: ago(1) },
      { id: `${type}2`, code: `${type}-002`, type, status: "done", updatedAt: ago(1) },
    ]);
    const feed = buildChangeFeed({ tasks: many }, ALL, { now: NOW });
    expect(feed.items.filter((i) => i.source === "task")).toHaveLength(TASK_STREAM_CAP);
    expect(feed.taskOverflow).toBe(6 - TASK_STREAM_CAP);
  });
});

// ── Headlines ─────────────────────────────────────────────────────────────

describe("a row is identifiable when truncated at 60 characters", () => {
  const TRUNCATE = 60;

  const everySource = (): ChangeItem[] => [
    ...buildCertificateChanges(
      [
        { id: 1, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) },
        { id: 2, pcNumber: "PC-007", workflowState: "submitted", updatedAt: ago(2) },
        { id: 3, pcNumber: "PC-005", workflowState: "rejected", updatedAt: ago(3) },
      ],
      NOW,
    ).items,
    ...buildVariationChanges(
      [
        { id: 41, ref: "VO-003", status: "approved", update_at: ago(2) },
        { id: 42, ref: "VO-004", status: "priced", update_at: ago(3) },
      ],
      NOW,
    ).items,
    ...buildNoticeChanges(
      [
        {
          id: 7,
          label: "Notice of delay / claim for revision of completion date",
          status: "open",
          deadline_date: dateAgo(2),
        },
      ],
      NOW,
    ).items,
    ...buildMilestoneChanges(
      [
        {
          _id: "m1",
          name: "Practical completion",
          endDate: "2026-11-30",
          baselineEnd: "2026-10-31",
          updatedAt: ago(4),
        },
      ],
      NOW,
    ).items,
    ...buildDocumentChanges(
      [
        {
          _id: "d1",
          name: "Ground floor plan",
          reference: "A-101",
          currentVersion: "C",
          createdAt: ago(30),
          updatedAt: ago(2),
        },
      ],
      NOW,
    ).items,
    ...buildMeetingChanges(
      [
        {
          id: 11,
          title: "Monday progress and coordination meeting",
          status: "held",
          scheduled_utc: ago(3),
          decisions: [{ id: 1, text: "x" }],
        },
      ],
      NOW,
    ).items,
    ...buildTaskChanges(
      [{ id: "t1", code: "RFI-012", type: "RFI", status: "answered", updatedAt: ago(1) }],
      NOW,
    ).items,
  ];

  it("puts no day count and no relative day word in any headline", () => {
    const items = everySource();
    // Every source that can produce a row today does. Certificates yield one
    // of three (§5 drops submitted and rejected as queue rows) and notices
    // yield none at all (§5 again — the open, passed deadline IS a queue row),
    // so the fixture is deliberately larger than the result.
    expect(items.length).toBeGreaterThan(5);
    for (const item of items) {
      expect(item.headline).not.toMatch(/\bdays?\b/i);
      expect(item.headline).not.toMatch(/\btoday\b|\btomorrow\b|\byesterday\b/i);
      expect(item.headline).not.toMatch(/\bago\b/i);
    }
  });

  it("keeps every row distinct in its first 60 characters", () => {
    const items = everySource();
    const heads = items.map((i) => i.headline.slice(0, TRUNCATE));
    expect(new Set(heads).size).toBe(items.length);
  });

  it("keeps two long-titled meetings on the same day apart", () => {
    const long = (n: string) => `${n} progress and coordination meeting, all consultants`;
    const { items } = buildMeetingChanges(
      [
        { id: 1, title: long("Monday"), status: "held", scheduled_utc: ago(3) },
        { id: 2, title: long("Thursday"), status: "held", scheduled_utc: ago(3) },
      ],
      NOW,
    );
    expect(new Set(items.map((i) => i.headline.slice(0, TRUNCATE))).size).toBe(2);
  });
});

// ── Permission ────────────────────────────────────────────────────────────

describe("a contractor sees no finance", () => {
  const feedFor = (held: { canViewFinance: boolean; canViewCompliance: boolean }) =>
    buildChangeFeed(
      {
        certificates: [
          { id: 1, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) },
          { id: 2, pcNumber: "PC-005", workflowState: "rejected", updatedAt: ago(3) },
        ],
        variations: [{ id: 43, ref: "VO-004", status: "approved", update_at: ago(2) }],
        notices: [
          {
            id: 7,
            label: "Notice of delay",
            status: "open",
            deadline_date: dateAgo(2),
          },
        ],
        milestones: [
          {
            _id: "m1",
            name: "Practical completion",
            endDate: "2026-11-30",
            baselineEnd: "2026-10-31",
            updatedAt: ago(4),
          },
        ],
        tasks: [{ id: "t1", code: "SI-002", type: "SI", status: "done", updatedAt: ago(1) }],
      },
      held,
      { now: NOW },
    );

  const FORBIDDEN = /\bcertif\w*|\bretention\b|\bvariation\w*|\brisk\w*/i;
  const RAND = /(\bZAR\b|R\s?\d)/i;

  it("shows a contractor no rand figure and none of the restricted words", () => {
    const feed = feedFor(CONTRACTOR);
    expect(feed.items.length).toBeGreaterThan(0);
    for (const item of feed.items) {
      const text = `${item.headline} ${item.detail ?? ""}`;
      expect(text).not.toMatch(FORBIDDEN);
      expect(text).not.toMatch(RAND);
      expect(item.href).not.toContain("finance");
    }
    // What is left is exactly the non-commercial position: the moved
    // milestone and the site instruction. The notice is not here because the
    // queue on the left of the same screen is already drawing it (§5), and
    // both certificates and the variation are behind `finance.view`.
    expect(feed.items.map((i) => i.key).sort()).toEqual(["milestone-m1", "task-t1"]);
  });

  it("shows the same project's finance rows to a QS", () => {
    const feed = feedFor(ALL);
    expect(feed.items.some((i) => i.href.startsWith(CERTIFICATES))).toBe(true);
    expect(feed.items.some((i) => i.href.startsWith(VARIATIONS))).toBe(true);
  });

  it("fails closed while the permission map is still in flight", () => {
    // `usePermissions` returns true for every flag while loading, which is the
    // right default for a route redirect and the wrong one for money.
    // `resolveFinanceAccess` is what corrects it and this feed inherits that.
    const loading = resolveFinanceAccess({
      canViewFinance: true,
      canApprovePayment: true,
      isLoading: true,
    });
    const feed = buildChangeFeed(
      { certificates: [{ id: 1, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) }] },
      { ...loading, canViewCompliance: true },
      { now: NOW },
    );
    expect(feed.items).toHaveLength(0);
  });

  it("treats an absent flag as false, never as 'assume yes'", () => {
    const items = buildCertificateChanges(
      [{ id: 1, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) }],
      NOW,
    ).items;
    expect(filterChangesByPermission(items, {})).toHaveLength(0);
  });

  it("withholds an open document whose own NAME carries the restricted vocabulary", () => {
    // The gate on a document row is not a class decision — it is decided by
    // the row's own text, because the name is free text off the payload.
    const { items } = buildDocumentChanges(
      [
        { _id: "d1", name: "Ground floor plan", reference: "A-101", createdAt: ago(2) },
        { _id: "d2", name: "Variation register", reference: "C-004", createdAt: ago(2) },
      ],
      NOW,
    );
    expect(items).toHaveLength(2);
    const visible = filterChangesByPermission(items, CONTRACTOR);
    expect(visible.map((i) => i.key)).toEqual(["document-d1"]);
    // And it is not merely hidden by wording — it declares the requirement.
    // (document.view is the base requirement every row from this builder
    // carries — see the base-requirement test below — on top of which the
    // vocabulary guard adds finance.view for d2's restricted wording.)
    expect(items.find((i) => i.key === "document-d2")!.requires).toEqual(["document.view", "finance.view"]);
  });

  it("catches the restricted vocabulary in every form the guard claims to", () => {
    expect(isFinanceRestrictedText("Certified value to date")).toBe(true);
    expect(isFinanceRestrictedText("retention release")).toBe(true);
    expect(isFinanceRestrictedText("VARIATIONS register")).toBe(true);
    // "Risk" is NOT a finance word. Risk is gated on `compliance.view`
    // everywhere else in this app, so it is gated on `compliance.view` here.
    expect(isFinanceRestrictedText("Risk workshop")).toBe(false);
    expect(isComplianceRestrictedText("Risk workshop")).toBe(true);
    expect(isComplianceRestrictedText("Ground floor plan")).toBe(false);
    expect(isFinanceRestrictedText("R 1 250 000 due")).toBe(true);
    expect(isFinanceRestrictedText("ZAR 400")).toBe(true);
    expect(isFinanceRestrictedText("Ground floor plan")).toBe(false);
    // Not a false positive on an ordinary word that merely starts with R.
    expect(isFinanceRestrictedText("Roof detail")).toBe(false);
    expect(isFinanceRestrictedText(null)).toBe(false);
  });
});

// ── Nothing invented ──────────────────────────────────────────────────────

describe("omits what it cannot read, and counts the omission", () => {
  it("counts a certificate with no timestamp instead of dating it from nothing", () => {
    const { items, undated } = buildCertificateChanges(
      [
        { id: 1, pcNumber: "PC-001", workflowState: "posted" },
        { id: 2, pcNumber: "PC-002", workflowState: "posted", updatedAt: "not a date" },
        { id: 3, pcNumber: "PC-003", workflowState: "posted", updatedAt: ago(1) },
      ],
      NOW,
    );
    expect(items.map((i) => i.headline)).toEqual(["PC-003 posted"]);
    expect(undated).toBe(2);
  });

  it("counts a served notice, because nothing on the payload says when it was served", () => {
    // `projects/{id}/time-bars/` carries no served-at, satisfied-at or
    // updated-at. Dating it from `awareness_date` would put a notice served
    // yesterday three weeks in the past.
    const { items, undated } = buildNoticeChanges(
      [{ id: 1, label: "Notice of delay", status: "served", deadline_date: dateAgo(3) }],
      NOW,
    );
    expect(items).toHaveLength(0);
    expect(undated).toBe(1);
  });

  it("does not date a variation from `dateInstructed` when its status has moved", () => {
    const { items, undated } = buildVariationChanges(
      [{ id: 43, ref: "VO-004", status: "approved" }],
      NOW,
    );
    expect(items).toHaveLength(0);
    expect(undated).toBe(1);
  });

  it("surfaces the omissions through the whole feed", () => {
    const feed = buildChangeFeed(
      {
        certificates: [{ id: 1, pcNumber: "PC-001", workflowState: "posted" }],
        notices: [{ id: 2, label: "Notice of delay", status: "served" }],
      },
      ALL,
      { now: NOW },
    );
    expect(feed.items).toHaveLength(0);
    expect(feed.undated).toBe(2);
    // Two changes are known to have happened, so this is NOT an empty project.
    expect(feed.empty).toBe(false);
  });

  it("tells an untouched project from a quiet one", () => {
    expect(buildChangeFeed({}, ALL, { now: NOW }).empty).toBe(true);
    const stale = buildChangeFeed(
      { certificates: [{ id: 1, pcNumber: "PC-001", workflowState: "posted", updatedAt: ago(90) }] },
      ALL,
      { now: NOW },
    );
    expect(stale.items).toHaveLength(0);
    expect(stale.empty).toBe(false);
    expect(stale.aged).toBe(1);
  });
});

describe("no fabricated actor names", () => {
  it("names the uploader on an upload", () => {
    const { items } = buildDocumentChanges(
      [
        {
          _id: "d1",
          name: "Ground floor plan",
          reference: "A-101",
          uploadedBy: { name: "T. Mokoena" },
          createdAt: ago(2),
        },
      ],
      NOW,
    );
    expect(items[0].detail).toBe("Uploaded by T. Mokoena");
  });

  it("names NOBODY on a revision — `uploadedBy` is the original uploader", () => {
    const { items } = buildDocumentChanges(
      [
        {
          _id: "d1",
          name: "Ground floor plan",
          reference: "A-101",
          currentVersion: "C",
          uploadedBy: { name: "T. Mokoena" },
          createdAt: ago(30),
          updatedAt: ago(2),
        },
      ],
      NOW,
    );
    expect(items[0].headline).toBe("A-101 — Ground floor plan revised to C");
    // Nothing at all, not even the original uploader: revision C may have been
    // posted by somebody else entirely and the version record that says who
    // lives behind `documents/{id}/versions/`, which the homepage never fetches.
    expect(items[0].detail).toBeNull();
  });

  it("names nobody at all when the payload carries no uploader", () => {
    const { items } = buildDocumentChanges(
      [{ _id: "d1", name: "Site plan", createdAt: ago(1) }],
      NOW,
    );
    expect(items[0].detail).toBeNull();
  });

  it("does not fall back to a made-up variation number", () => {
    // "VO-43" from a task id would be a DIFFERENT number from the "VO-004"
    // every other surface shows for the same variation.
    const { items } = buildVariationChanges(
      [{ id: 43, ref: null, status: "approved", update_at: ago(1) }],
      NOW,
    );
    expect(items[0].headline).toBe("Variation approved — it carries no number");
    expect(items[0].headline).not.toContain("VO-43");
  });
});

// ── Destinations ──────────────────────────────────────────────────────────

describe("every row links to the object it names", () => {
  it("builds every parameterised deep link from `ROUTE`", () => {
    expect(
      buildCertificateChanges(
        [{ id: 6, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) }],
        NOW,
      ).items[0].href,
    ).toBe(`${CERTIFICATES}&pc=6`);

    expect(
      buildVariationChanges([{ id: 43, ref: "VO-004", status: "approved", update_at: ago(1) }], NOW)
        .items[0].href,
    ).toBe(`${VARIATIONS}&vo=43`);

    expect(
      buildMilestoneChanges(
        [
          {
            _id: "12",
            name: "Practical completion",
            endDate: "2026-11-30",
            baselineEnd: "2026-10-31",
            updatedAt: ago(1),
          },
        ],
        NOW,
      ).items[0].href,
    ).toBe("/programme?milestone=12");
  });

  it("survives a STRING id, which the risk-signal resolver would have made NaN", () => {
    // `riskSignalHref` types `source_id` as a number because a risk signal's
    // source is a Django integer pk. Two of the objects in this feed are not
    // identified by one — `Milestone._id` is a string and `VariationRecord.id`
    // is `_id ?? id ?? taskId` — so routing them through it means
    // `Number("64f1a2…")`, which is `/programme?milestone=NaN`.
    const href = buildMilestoneChanges(
      [
        {
          _id: "64f1a2b3c4d5e6f708192a3b",
          name: "Practical completion",
          endDate: "2026-11-30",
          baselineEnd: "2026-10-31",
          updatedAt: ago(1),
        },
      ],
      NOW,
    ).items[0].href;
    expect(href).toBe("/programme?milestone=64f1a2b3c4d5e6f708192a3b");
    expect(href).not.toContain("NaN");
  });

  it("addresses a variation by its ID and never by its VO number", () => {
    // `finance.tsx` resolves the parameter with
    // `findByDeepLinkId(searchParams.get("vo"), variationOrders, (o) => [o.id, o.taskId])`.
    // "VO-004" matches neither, so a reference in that parameter opens
    // nothing at all — silently, which is the worst kind of dead link.
    const href = buildVariationChanges(
      [{ id: "vo-record-9", ref: "VO-004", status: "approved", update_at: ago(1) }],
      NOW,
    ).items[0].href;
    expect(href).toBe(`${VARIATIONS}&vo=vo-record-9`);
    expect(href).not.toContain("VO-004");
  });

  it("falls back to the variations list for a record carrying no id at all", () => {
    // `VariationRecord.id` is `_id ?? id ?? taskId` and the assignment-task
    // route can supply none of the three.
    expect(
      buildVariationChanges([{ ref: "VO-004", status: "approved", update_at: ago(1) }], NOW)
        .items[0].href,
    ).toBe(VARIATIONS);
  });

  it("uses the literal paths from App.tsx for the three with no query parameters", () => {
    expect(
      buildTaskChanges([{ id: "t9", code: "RFI-009", status: "open", createdAt: ago(1) }], NOW)
        .items[0].href,
    ).toBe("/tasks/t9");
    expect(
      buildMeetingChanges([{ id: 11, title: "Site", status: "held", date: dateAgo(1) }], NOW)
        .items[0].href,
    ).toBe("/meetings/11");
    expect(
      buildDocumentChanges([{ _id: "abc", name: "Site plan", createdAt: ago(1) }], NOW).items[0]
        .href,
    ).toBe("/documents/abc");
  });

  it("sends no row to a bare page", () => {
    const feed = buildChangeFeed(
      {
        certificates: [{ id: 6, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) }],
        documents: [{ _id: "d1", name: "Site plan", createdAt: ago(1) }],
        meetings: [{ id: 3, title: "Site", status: "held", date: dateAgo(1) }],
      },
      ALL,
      { now: NOW },
    );
    for (const item of feed.items) {
      expect(item.href).not.toBe("/finance");
      expect(item.href).not.toBe("/documents");
      expect(item.href).not.toBe("/meetings");
      expect(item.href).not.toBe("/project-health");
    }
  });
});

// ── Source-specific judgements ────────────────────────────────────────────

describe("notices", () => {
  const OPEN_AND_PASSED = {
    id: 1,
    label: "Notice of delay",
    status: "open",
    deadline_date: dateAgo(2),
    clause_ref: "23.1",
    clause_verified: true,
    contract_form: "JBCC",
  };

  it("draws no row for an open deadline, passed or not — the queue draws it", () => {
    // `buildTimeBarQueue` takes EVERY bar with `status === "open"`, passed ones
    // included, and renders it with an overdue chip in "What needs you" on the
    // left of the same screen. Drawing the most consequential row on the page
    // twice does not make it more visible; it makes the panel repeating it
    // stop being read. §5.
    const { items, undated } = buildNoticeChanges(
      [OPEN_AND_PASSED, { ...OPEN_AND_PASSED, id: 2, deadline_date: dateAgo(-9) }],
      NOW,
    );
    expect(items).toEqual([]);
    expect(undated).toBe(0);
  });

  it("counts a served notice, because nothing on the payload says when it was served", () => {
    // `projects/{id}/time-bars/` carries no served-at, satisfied-at or
    // updated-at. Dating it from `awareness_date` would put a notice served
    // yesterday three weeks in the past, so it is omitted and disclosed.
    const { items, undated } = buildNoticeChanges(
      [
        { ...OPEN_AND_PASSED, id: 3, status: "served" },
        { ...OPEN_AND_PASSED, id: 4, status: "satisfied" },
        { ...OPEN_AND_PASSED, id: 5, status: "lapsed" },
      ],
      NOW,
    );
    expect(items).toEqual([]);
    expect(undated).toBe(3);
  });

  it("says nothing at all about a bar in a status it does not recognise", () => {
    const { items, undated } = buildNoticeChanges(
      [{ ...OPEN_AND_PASSED, id: 6, status: "draft" }],
      NOW,
    );
    expect(items).toEqual([]);
    expect(undated).toBe(0);
  });
});

describe("milestones", () => {
  it("says which way a milestone moved, and against what", () => {
    const { items } = buildMilestoneChanges(
      [
        {
          _id: "m1",
          name: "Practical completion",
          endDate: "2026-11-30",
          baselineEnd: "2026-10-31",
          updatedAt: ago(2),
        },
        {
          _id: "m2",
          name: "Roof watertight",
          endDate: "2026-09-01",
          baselineEnd: "2026-09-20",
          updatedAt: ago(2),
        },
      ],
      NOW,
    );
    expect(items[0].headline).toBe("Practical completion moved out to 30 Nov 2026");
    expect(items[0].detail).toBe("Baseline was 31 Oct 2026");
    expect(items[1].headline).toBe("Roof watertight pulled forward to 1 Sep 2026");
  });

  it("says nothing about a milestone with no accepted baseline", () => {
    const { items, undated } = buildMilestoneChanges(
      [{ _id: "m1", name: "Roof watertight", endDate: "2026-09-01", baselineEnd: null, updatedAt: ago(1) }],
      NOW,
    );
    expect(items).toHaveLength(0);
    // Not an omission the feed should disclose: nothing has been agreed for
    // this milestone to have moved against, so no change happened.
    expect(undated).toBe(0);
  });

  it("is not gated on finance.view — dates are not money", () => {
    // But it IS gated on programme.view, since every row links to
    // /programme — see the next test.
    const { items } = buildMilestoneChanges(
      [
        {
          _id: "m1",
          name: "Practical completion",
          endDate: "2026-11-30",
          baselineEnd: "2026-10-31",
          updatedAt: ago(2),
        },
      ],
      NOW,
    );
    expect(items[0].requires).not.toContain("finance.view");
  });

  it("is gated on programme.view — every row links to /programme", () => {
    const { items } = buildMilestoneChanges(
      [
        {
          _id: "m1",
          name: "Practical completion",
          endDate: "2026-11-30",
          baselineEnd: "2026-10-31",
          updatedAt: ago(2),
        },
      ],
      NOW,
    );
    expect(items[0].requires).toEqual(["programme.view"]);
    expect(filterChangesByPermission(items, { canViewProgramme: false })).toHaveLength(0);
    expect(filterChangesByPermission(items, { canViewProgramme: true })).toHaveLength(1);
  });
});

describe("documents", () => {
  it("treats a contract document landing as material, and an ordinary upload as routine", () => {
    const { items } = buildDocumentChanges(
      [
        { _id: "d1", name: "Principal building agreement", folderTab: "contracts", createdAt: ago(1) },
        { _id: "d2", name: "Site photograph", folderTab: "documents", createdAt: ago(1) },
      ],
      NOW,
    );
    expect(items[0].significance).toBe("material");
    expect(items[0].headline).toBe("Principal building agreement added to the contract documents");
    expect(items[1].significance).toBe("routine");
  });

  it("prints the current revision label and never compares two of them", () => {
    // `currentVersion` is free text — "2", "C", "Rev B" — with no ordering
    // this file can rely on, so it is shown and not reasoned about.
    const { items } = buildDocumentChanges(
      [
        {
          _id: "d1",
          name: "Ground floor plan",
          reference: "A-101",
          currentVersion: "Rev B",
          createdAt: ago(20),
          updatedAt: ago(1),
        },
      ],
      NOW,
    );
    expect(items[0].headline).toBe("A-101 — Ground floor plan revised to Rev B");
  });

  it("is gated on document.view — every row links to /documents/<id>", () => {
    const { items } = buildDocumentChanges(
      [{ _id: "d1", name: "Ground floor plan", createdAt: ago(1) }],
      NOW,
    );
    expect(items[0].requires).toContain("document.view");
    // Dropped without it even though finance/compliance are both granted —
    // the base requirement is independent of the vocabulary guard.
    expect(
      filterChangesByPermission(items, { canViewFinance: true, canViewCompliance: true, canViewDocuments: false }),
    ).toHaveLength(0);
    expect(
      filterChangesByPermission(items, { canViewFinance: false, canViewCompliance: false, canViewDocuments: true }),
    ).toHaveLength(1);
  });
});

describe("meetings", () => {
  it("gives one row per meeting, however many decisions it recorded", () => {
    const { items } = buildMeetingChanges(
      [
        {
          id: 11,
          title: "Site meeting 07",
          status: "held",
          scheduled_utc: ago(2),
          decisions: [
            { id: 1, text: "a" },
            { id: 2, text: "b" },
            { id: 3, text: "c" },
          ],
          action_items: [{ id: 4, text: "d" }],
        },
      ],
      NOW,
    );
    expect(items).toHaveLength(1);
    expect(items[0].headline).toBe("Site meeting 07 — 3 decisions recorded");
    expect(items[0].detail).toBe("and 1 action raised");
    expect(items[0].significance).toBe("material");
  });

  it("reads `held` and not the statuses the backend does not define", () => {
    // CLAUDE.md: the meeting statuses are scheduled | held | cancelled.
    // `completed` and `occurred` do not exist on this model.
    const meetings = [
      { id: 1, title: "A", status: "held", date: dateAgo(1) },
      { id: 2, title: "B", status: "completed", date: dateAgo(1) },
      { id: 3, title: "C", status: "scheduled", date: dateAgo(1) },
    ];
    expect(buildMeetingChanges(meetings, NOW).items.map((i) => i.key)).toEqual(["meeting-1"]);
  });

  it("drops to routine when a meeting was held but recorded nothing", () => {
    const { items } = buildMeetingChanges(
      [{ id: 1, title: "Site meeting 08", status: "held", date: dateAgo(1) }],
      NOW,
    );
    expect(items[0].headline).toBe("Site meeting 08 — held");
    expect(items[0].significance).toBe("routine");
  });
});

describe("tasks and RFIs", () => {
  it("dates a raise from creation and an answer from the update", () => {
    const { items } = buildTaskChanges(
      [
        { id: "a", code: "RFI-001", type: "RFI", status: "open", createdAt: ago(3), updatedAt: ago(1) },
        { id: "b", code: "SI-001", type: "SI", status: "answered", createdAt: ago(9), updatedAt: ago(2) },
      ],
      NOW,
    );
    expect(items.find((i) => i.key === "task-a")!.ageDays).toBe(3);
    expect(items.find((i) => i.key === "task-b")!.ageDays).toBe(2);
  });

  it("makes an answer material and a raise or a completion routine", () => {
    const of = (status: string) =>
      buildTaskChanges([{ id: "x", code: "RFI-001", type: "RFI", status, updatedAt: ago(1), createdAt: ago(1) }], NOW)
        .items[0].significance;
    expect(of("answered")).toBe("material");
    expect(of("open")).toBe("routine");
    expect(of("done")).toBe("routine");
  });

  it("does not invent a task type where the payload carries none", () => {
    // The board falls back to a round-robin demo type when `taskType` is
    // absent. Importing that fallback would put a made-up "RFI" on a real row.
    const { items } = buildTaskChanges(
      [{ id: "x", title: "Confirm the setting-out", status: "open", createdAt: ago(1) }],
      NOW,
    );
    expect(items[0].headline).toBe("Confirm the setting-out raised");
    expect(items[0].headline).not.toMatch(/RFI|VO|SI|DC|CPI/);
  });

  it("ignores a status the backend does not define rather than guessing a verb", () => {
    const { items, undated } = buildTaskChanges(
      [{ id: "x", code: "RFI-001", type: "RFI", status: "escalated", updatedAt: ago(1) }],
      NOW,
    );
    expect(items).toHaveLength(0);
    expect(undated).toBe(0);
  });
});

// ── The wired call shape ──────────────────────────────────────────────────

describe("the groups form, which is what the homepage actually calls", () => {
  it("takes pre-built groups and carries each one's undated count through", () => {
    // `useHomeData` holds its seven payloads in seven separate `useMemo`s and
    // passes an array of built groups, so one source re-rendering does not
    // rebuild the other six. The disclosure counts have to survive that.
    const feed = buildChangeFeed(
      [
        buildCertificateChanges(
          [
            { id: 6, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(1) },
            // No timestamp at all: omitted and counted, never dated from now.
            { id: 7, pcNumber: "PC-007", workflowState: "posted" },
          ],
          NOW,
        ),
        buildNoticeChanges([{ id: 1, label: "Notice of delay", status: "served" }], NOW),
      ],
      ALL,
      { now: NOW },
    );
    expect(feed.items.map((i) => i.key)).toEqual(["certificate-6"]);
    expect(feed.undated).toBe(2);
    expect(feed.empty).toBe(false);
  });

  it("caps the task stream by `source`, however the groups were assembled", () => {
    const tasks = Array.from({ length: TASK_STREAM_CAP + 3 }, (_, n) => ({
      id: `t${n}`,
      code: `RFI-${n}`,
      // Distinct types so nothing folds and the cap is what does the cutting.
      type: `T${n}`,
      status: "answered",
      updatedAt: ago(1),
    }));
    const feed = buildChangeFeed([buildTaskChanges(tasks, NOW)], ALL, { now: NOW });
    expect(feed.items).toHaveLength(TASK_STREAM_CAP);
    expect(feed.taskOverflow).toBe(3);
  });

  it("reads an empty array of groups as an untracked project, not a quiet one", () => {
    expect(buildChangeFeed([], ALL, { now: NOW }).empty).toBe(true);
  });
});

// ── The rest of the merge's decisions ─────────────────────────────────────

describe("nothing that the queue beside it already draws", () => {
  it("drops a task the queue is holding, and keeps one it is not", () => {
    // `buildTaskQueue` filters on exactly this flag. Unlike the certificate
    // exclusion this one is per VIEWER: an RFI raised by somebody else and
    // assigned to somebody else is in nobody's queue and is genuinely news.
    const { items } = buildTaskChanges(
      [
        { id: "mine", code: "RFI-001", type: "RFI", status: "open", createdAt: ago(1), needsAction: true },
        { id: "theirs", code: "RFI-002", type: "RFI", status: "open", createdAt: ago(1) },
      ],
      NOW,
    );
    expect(items.map((i) => i.key)).toEqual(["task-theirs"]);
  });
});

describe("dating a variation", () => {
  it("dates an approval from `approvedAt`, which names the transition", () => {
    // `VariationOrder.approved_at`, carried onto `VariationRecord` by
    // `toVariationRecord`. `updated_at` says only that something on the row
    // moved, which could be a comment three weeks later.
    const [item] = buildVariationChanges(
      [{ id: 43, ref: "VO-004", status: "approved", approvedAt: ago(9), update_at: ago(1) }],
      NOW,
    ).items;
    expect(item.at).toBe(ago(9));
    expect(item.ageDays).toBe(9);
  });

  it("does NOT reach for `approvedAt` on a status that is not an approval", () => {
    // An approval that was later rejected must be dated at the rejection.
    const [item] = buildVariationChanges(
      [{ id: 44, ref: "VO-005", status: "rejected", approvedAt: ago(9), update_at: ago(1) }],
      NOW,
    ).items;
    expect(item.at).toBe(ago(1));
  });
});

describe("a milestone's live finish", () => {
  it("prefers `actualEnd` over `endDate`, as the drift summary above it does", () => {
    // `summariseMilestoneDrift` is drawn in the visual band directly above
    // this feed and uses `actual_end ?? end_date`. Two panels on one screen
    // must not measure the same slip two different ways.
    const [item] = buildMilestoneChanges(
      [
        {
          _id: "m1",
          name: "Frame",
          baselineEnd: "2026-10-31",
          endDate: "2026-11-30",
          actualEnd: "2026-12-15",
          updatedAt: ago(1),
        },
      ],
      NOW,
    ).items;
    expect(item.headline).toBe("Frame moved out to 15 Dec 2026");
    expect(item.detail).toBe("Baseline was 31 Oct 2026");
  });
});

describe("the compliance half of the vocabulary guard", () => {
  it("puts a document named for risk behind `compliance.view`, not `finance.view`", () => {
    const [item] = buildDocumentChanges(
      [{ _id: "d3", name: "Risk register rev B", createdAt: ago(2) }],
      NOW,
    ).items;
    expect(item.requires).toEqual(["document.view", "compliance.view"]);
    // A QS holding finance and documents but not compliance must not see it.
    expect(
      filterChangesByPermission([item], { canViewFinance: true, canViewCompliance: false, canViewDocuments: true }),
    ).toHaveLength(0);
    expect(filterChangesByPermission([item], CONTRACTOR)).toHaveLength(1);
  });
});
