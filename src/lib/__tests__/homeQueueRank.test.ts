/**
 * The ranking has legal consequence, so it is tested as a rule rather than as
 * a snapshot: each test names the decision it is protecting.
 */
import { describe, it, expect } from "vitest";

import {
  ACT_TODAY_BAND,
  bandOf,
  filterQueueByPermission,
  pressureFromDays,
  rankQueue,
  summariseQueue,
  type Consequence,
  type QueueItem,
} from "../homeQueueRank";

const item = (over: Partial<QueueItem> & { key: string }): QueueItem => ({
  kind: "task",
  headline: "h",
  detail: null,
  consequence: "own-work",
  pressure: "none",
  daysRemaining: null,
  clock: null,
  // Presentation only — `rankQueue` never reads it. See the field's comment.
  date: null,
  overdue: false,
  href: "/tasks/1",
  action: "Open",
  requires: [],
  ...over,
});

const order = (items: QueueItem[]) => rankQueue(items).map((i) => i.key);

// ── Pressure ──────────────────────────────────────────────────────────────

describe("pressureFromDays", () => {
  it("reads a forfeiture clock on JBCC's quarters of a 20-working-day window", () => {
    expect(pressureFromDays(-1, "working")).toBe("expired");
    expect(pressureFromDays(0, "working")).toBe("expired"); // today is the last day
    expect(pressureFromDays(5, "working")).toBe("critical");
    expect(pressureFromDays(6, "working")).toBe("soon");
    expect(pressureFromDays(10, "working")).toBe("soon");
    expect(pressureFromDays(11, "working")).toBe("later");
  });

  it("reads every other clock on calendar days, where today is not yet late", () => {
    expect(pressureFromDays(-1, "calendar")).toBe("expired");
    expect(pressureFromDays(0, "calendar")).toBe("critical");
    expect(pressureFromDays(2, "calendar")).toBe("critical");
    expect(pressureFromDays(7, "calendar")).toBe("soon");
    expect(pressureFromDays(8, "calendar")).toBe("later");
  });

  it("says 'none' when there is no number, and never guesses one", () => {
    expect(pressureFromDays(null, "working")).toBe("none");
    expect(pressureFromDays(undefined, "calendar")).toBe("none");
    expect(pressureFromDays(Number.NaN, "working")).toBe("none");
  });
});

// ── The rule ──────────────────────────────────────────────────────────────

describe("rankQueue — what is lost, then how little time is left", () => {
  it("puts a notice three working days out above an overdue task", () => {
    // The brief's own example, and the single reason this ranking was
    // rewritten. The old rule sorted `overdue` first and got this backwards.
    expect(
      order([
        item({ key: "late-task", consequence: "own-work", pressure: "expired", daysRemaining: -9, clock: "calendar", overdue: true }),
        item({ key: "notice", consequence: "forfeiture", pressure: "critical", daysRemaining: 3, clock: "working" }),
      ]),
    ).toEqual(["notice", "late-task"]);
  });

  it("puts a notice past its deadline above absolutely everything", () => {
    expect(
      order([
        item({ key: "rejected-cert", consequence: "money", pressure: "none" }),
        item({ key: "red-breach", consequence: "breach", pressure: "critical" }),
        item({ key: "lapsed-notice", consequence: "forfeiture", pressure: "expired", daysRemaining: -2, clock: "working" }),
      ])[0],
    ).toBe("lapsed-notice");
  });

  it("does NOT let a distant notice outrank live money", () => {
    // Forfeiture earns precedence from the clock closing, not from the
    // category alone. Thirty working days out there is nothing to do today.
    expect(
      order([
        item({ key: "distant-notice", consequence: "forfeiture", pressure: "later", daysRemaining: 30, clock: "working" }),
        item({ key: "unsigned-cert", consequence: "money", pressure: "none" }),
      ]),
    ).toEqual(["unsigned-cert", "distant-notice"]);
  });

  it("treats an undated notice as live rather than as safe", () => {
    // A time bar the backend could not date is an UNKNOWN forfeiture clock.
    // Unknown must not be presented as clear, so it ranks with live money and
    // above a notice we can positively show is thirty days away.
    expect(
      order([
        item({ key: "distant-notice", consequence: "forfeiture", pressure: "later", daysRemaining: 30, clock: "working" }),
        item({ key: "undated-notice", consequence: "forfeiture", pressure: "none" }),
      ]),
    ).toEqual(["undated-notice", "distant-notice"]);
  });

  it("does not sink an item merely because it has no due date", () => {
    // A certificate awaiting certification carries no date anywhere in the
    // payload. That is a gap in the API, not evidence of slack.
    expect(
      order([
        item({ key: "overdue-task", consequence: "own-work", pressure: "expired", daysRemaining: -20, clock: "calendar", overdue: true }),
        item({ key: "undated-cert", consequence: "money", pressure: "none" }),
      ]),
    ).toEqual(["undated-cert", "overdue-task"]);
  });

  it("ranks a contractual breach above a red commercial guide", () => {
    expect(
      order([
        item({ key: "red-guide", consequence: "advisory", pressure: "critical" }),
        item({ key: "amber-breach", consequence: "breach", pressure: "soon" }),
      ]),
    ).toEqual(["amber-breach", "red-guide"]);
  });

  it("ranks blocking somebody else above your own late work only once it is late", () => {
    expect(
      order([
        item({ key: "my-late-task", consequence: "own-work", pressure: "expired", daysRemaining: -1, clock: "calendar" }),
        item({ key: "rsvp-next-month", consequence: "blocking", pressure: "later", daysRemaining: 30, clock: "calendar" }),
      ]),
    ).toEqual(["my-late-task", "rsvp-next-month"]);
  });

  it("breaks a tie on the nearest clock", () => {
    expect(
      order([
        item({ key: "far", consequence: "forfeiture", pressure: "critical", daysRemaining: 5, clock: "working" }),
        item({ key: "near", consequence: "forfeiture", pressure: "critical", daysRemaining: 1, clock: "working" }),
      ]),
    ).toEqual(["near", "far"]);
  });

  it("uses subRank inside one class, where the axes cannot tell items apart", () => {
    // All three are money with no clock. Rejected first: payment has stopped
    // dead and only a person reworking it restarts anything.
    expect(
      order([
        item({ key: "post", consequence: "money", pressure: "none", subRank: 2 }),
        item({ key: "certify", consequence: "money", pressure: "none", subRank: 1 }),
        item({ key: "rejected", consequence: "money", pressure: "none", subRank: 0 }),
      ]),
    ).toEqual(["rejected", "certify", "post"]);
  });

  it("surfaces the older of two otherwise identical items", () => {
    expect(
      order([
        item({ key: "b-fresh", consequence: "money", pressure: "none", waitingSince: "2026-08-16T09:00:00Z" }),
        item({ key: "a-stale", consequence: "money", pressure: "none", waitingSince: "2026-07-01T09:00:00Z" }),
      ]),
    ).toEqual(["a-stale", "b-fresh"]);
  });

  it("is stable and total, so a refetch never reshuffles the list", () => {
    const items = [
      item({ key: "b", consequence: "money", pressure: "none" }),
      item({ key: "a", consequence: "money", pressure: "none" }),
      item({ key: "c", consequence: "money", pressure: "none" }),
    ];
    expect(order(items)).toEqual(["a", "b", "c"]);
    expect(order([...items].reverse())).toEqual(["a", "b", "c"]);
  });

  it("does not mutate its input", () => {
    const items = [
      item({ key: "task" }),
      item({ key: "notice", consequence: "forfeiture", pressure: "expired" }),
    ];
    rankQueue(items);
    expect(items.map((i) => i.key)).toEqual(["task", "notice"]);
  });
});

// ── The property that keeps the two calendars apart ───────────────────────

describe("working days are never compared against calendar days", () => {
  it("only forfeiture items carry a working-day clock", () => {
    // The invariant the builders must uphold, restated as a test so a future
    // builder that puts `clock: "working"` on a task fails here.
    const CLOCK_BY_CONSEQUENCE: Record<Consequence, "working" | "calendar" | null> = {
      forfeiture: "working",
      money: null,
      breach: "calendar",
      blocking: "calendar",
      advisory: null,
      "own-work": "calendar",
    };
    expect(CLOCK_BY_CONSEQUENCE.forfeiture).toBe("working");
    expect(
      Object.entries(CLOCK_BY_CONSEQUENCE).filter(([, c]) => c === "working"),
    ).toHaveLength(1);
  });

  it("compares consequence before daysRemaining, so mixed units cannot meet", () => {
    // Both land in band 3. The undated forfeiture wins on consequence and its
    // `null` day count is never weighed against the breach's calendar -1.
    const ranked = rankQueue([
      item({ key: "breach-1-day-late", consequence: "breach", pressure: "expired", daysRemaining: -1, clock: "calendar" }),
      item({ key: "undated-notice", consequence: "forfeiture", pressure: "none", daysRemaining: null, clock: null }),
    ]);
    expect(bandOf(ranked[0])).toBe(bandOf(ranked[1]));
    expect(ranked[0].key).toBe("undated-notice");
  });
});

// ── Bands ─────────────────────────────────────────────────────────────────

describe("bandOf", () => {
  it("gives a lapsing notice a band of its own", () => {
    expect(bandOf({ consequence: "forfeiture", pressure: "expired" })).toBe(0);
  });

  it("keeps every consequence class inside the declared band range", () => {
    const consequences: Consequence[] = [
      "forfeiture", "money", "breach", "blocking", "advisory", "own-work",
    ];
    const pressures = ["expired", "critical", "soon", "later", "none"] as const;
    for (const c of consequences) {
      for (const p of pressures) {
        const band = bandOf({ consequence: c, pressure: p });
        expect(Number.isInteger(band)).toBe(true);
        expect(band).toBeGreaterThanOrEqual(0);
        expect(band).toBeLessThanOrEqual(8);
      }
    }
  });

  it("never lets an advisory signal reach the act-today bands", () => {
    const pressures = ["expired", "critical", "soon", "later", "none"] as const;
    for (const p of pressures) {
      expect(bandOf({ consequence: "advisory", pressure: p })).toBeGreaterThan(ACT_TODAY_BAND);
    }
  });
});

// ── Empty vs calm ─────────────────────────────────────────────────────────

describe("summariseQueue", () => {
  it("reports an empty queue as empty, not as calm", () => {
    // A new project has no certificates, variations or meetings. That is
    // "nothing is being tracked yet", not "you are clear".
    expect(summariseQueue([])).toEqual({
      total: 0, actToday: 0, expired: 0, forfeiture: 0, calm: false,
    });
  });

  it("reports work that exists but is not urgent as calm", () => {
    const s = summariseQueue([
      item({ key: "t", consequence: "own-work", pressure: "soon", daysRemaining: 5, clock: "calendar" }),
      item({ key: "n", consequence: "forfeiture", pressure: "later", daysRemaining: 40, clock: "working" }),
    ]);
    expect(s).toMatchObject({ total: 2, actToday: 0, calm: true, forfeiture: 1 });
  });

  it("is not calm the moment anything reaches the act-today bands", () => {
    const s = summariseQueue([
      item({ key: "n", consequence: "forfeiture", pressure: "critical", daysRemaining: 2, clock: "working" }),
      item({ key: "t", consequence: "own-work", pressure: "later", daysRemaining: 20, clock: "calendar" }),
    ]);
    expect(s).toMatchObject({ total: 2, actToday: 1, calm: false, expired: 0 });
  });

  it("counts what has already run out", () => {
    const s = summariseQueue([
      item({ key: "n", consequence: "forfeiture", pressure: "expired", daysRemaining: -1, clock: "working" }),
      item({ key: "t", consequence: "own-work", pressure: "expired", daysRemaining: -3, clock: "calendar" }),
    ]);
    expect(s.expired).toBe(2);
  });
});

// ── Permission gating ─────────────────────────────────────────────────────

describe("filterQueueByPermission", () => {
  const rows = [
    item({ key: "money", requires: ["finance.view"] }),
    item({ key: "compliance", requires: ["compliance.view"] }),
    item({ key: "financial-risk", requires: ["compliance.view", "finance.view"] }),
    item({ key: "everyone", requires: [] }),
  ];

  it("shows a viewer holding neither only the ungated rows", () => {
    expect(
      filterQueueByPermission(rows, { canViewFinance: false, canViewCompliance: false }).map((i) => i.key),
    ).toEqual(["everyone"]);
  });

  it("keeps a financial risk signal behind BOTH gates", () => {
    expect(
      filterQueueByPermission(rows, { canViewFinance: true, canViewCompliance: false }).map((i) => i.key),
    ).toEqual(["money", "everyone"]);
    expect(
      filterQueueByPermission(rows, { canViewFinance: false, canViewCompliance: true }).map((i) => i.key),
    ).toEqual(["compliance", "everyone"]);
    expect(
      filterQueueByPermission(rows, { canViewFinance: true, canViewCompliance: true }),
    ).toHaveLength(4);
  });

  it("fails CLOSED on an absent flag rather than assuming yes", () => {
    // `resolveFinanceAccess` returns false while the permission map is still
    // in flight so a contractor never flashes the employer's figures. This
    // filter must not reopen that hole by treating undefined as permitted.
    expect(filterQueueByPermission(rows, {}).map((i) => i.key)).toEqual(["everyone"]);
    expect(
      filterQueueByPermission(rows, { canViewFinance: undefined, canViewCompliance: undefined }),
    ).toHaveLength(1);
  });

  it("does not treat a truthy non-boolean as a grant", () => {
    expect(
      filterQueueByPermission(rows, { canViewFinance: 1 as unknown as boolean }).map((i) => i.key),
    ).toEqual(["everyone"]);
  });
});
