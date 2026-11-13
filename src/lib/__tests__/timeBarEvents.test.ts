/**
 * Notice deadlines grouped by event, the JBCC time-and-money pair, and the
 * half-served warning the tab shows where service is recorded.
 */
import { describe, expect, it } from "vitest";
import {
  findHalfServed, formatDay, groupTimeBars, parseDay, serverMessage, serviceSummary,
  type TimeBar, type TimeBarService,
} from "@/lib/timeBarEvents";

let nextId = 1;
const bar = (over: Partial<TimeBar> = {}): TimeBar => ({
  id: nextId++,
  label: "Notice of delay",
  clock_type: "delay_notice",
  contract_form: "JBCC",
  clause_ref: "",
  clause_verified: false,
  awareness_date: "2026-11-02",
  duration: 20,
  unit: "working",
  deadline_date: "2026-11-30",
  days_remaining: 12,
  days_remaining_unit: "working",
  days_remaining_label: "12 working days remaining",
  status: "open",
  event_key: "e1",
  event_description: "Late site access",
  pair_role: null,
  ...over,
});

const pairFor = (key: string, over: { time?: Partial<TimeBar>; money?: Partial<TimeBar> } = {}) => [
  bar({ event_key: key, clock_type: "delay_notice", pair_role: "time", ...over.time }),
  bar({ event_key: key, clock_type: "expense_and_loss_notice", label: "Notice of claim for expense and loss (money)",
        pair_role: "money", ...over.money }),
  bar({ event_key: key, clock_type: "delay_particulars", label: "Delay particulars", deadline_date: "2027-01-20" }),
];

describe("grouping by event", () => {
  it("puts each event's clocks together, the pair first as time then money", () => {
    const [time, money, particulars] = pairFor("e1");
    // Delivered out of order, as the server's deadline ordering may.
    const groups = groupTimeBars([particulars, money, time, ...pairFor("e2", {
      time: { event_description: "Late drawings" }, money: { event_description: "Late drawings" },
    })]);

    expect(groups).toHaveLength(2);
    const first = groups.find((g) => g.key === "e1")!;
    expect(first.pair.map((b) => b.pair_role)).toEqual(["time", "money"]);
    expect(first.others.map((b) => b.clock_type)).toEqual(["delay_particulars"]);
    expect(first.description).toBe("Late site access");
  });

  it("two events on the same day stay two events", () => {
    const groups = groupTimeBars([...pairFor("a"), ...pairFor("b")]);
    expect(groups.map((g) => g.key).sort()).toEqual(["a", "b"]);
  });

  it("falls back to the awareness date for a server that sends no event key", () => {
    const groups = groupTimeBars([
      bar({ event_key: undefined, pair_role: "time" }),
      bar({ event_key: undefined, pair_role: "money" }),
      bar({ event_key: undefined, awareness_date: "2026-11-05" }),
    ]);
    expect(groups.map((g) => g.key).sort()).toEqual(["aware:2026-11-02", "aware:2026-11-05"]);
  });

  it("names a sourced event by its record when nobody typed a description", () => {
    const [g] = groupTimeBars([
      bar({ event_description: "", source: { type: "delayclaim", id: 4, ref: "DC-004", title: "Rain" } }),
    ]);
    expect(g.description).toBe("DC-004: Rain");
  });

  it("orders live events by their nearest live deadline, and closed events after", () => {
    const groups = groupTimeBars([
      bar({ event_key: "closed", status: "served", deadline_date: "2026-11-01" }),
      bar({ event_key: "later", deadline_date: "2026-12-20" }),
      bar({ event_key: "sooner", deadline_date: "2026-11-20" }),
      // a served clock with an early date must not pull its event up
      bar({ event_key: "later", status: "served", deadline_date: "2026-11-03" }),
      bar({ event_key: "lapsed", status: "lapsed", deadline_date: "2026-11-06" }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["lapsed", "sooner", "later", "closed"]);
    expect(groups.map((g) => g.live)).toEqual([true, true, true, false]);
  });
});

describe("half a pair served", () => {
  it("time served, money still open: says money is missing", () => {
    const [time, money] = pairFor("e1", { time: { status: "served" } });
    expect(findHalfServed([time, money])).toEqual({ served: "time", missing: "money", open: money });
  });

  it("the reverse names time", () => {
    const [time, money] = pairFor("e1", { money: { status: "served" } });
    expect(findHalfServed([time, money])?.missing).toBe("time");
  });

  it("a partner whose deadline has passed is still flagged", () => {
    const [time, money] = pairFor("e1", { time: { status: "served" }, money: { status: "lapsed" } });
    expect(findHalfServed([time, money])?.open).toBe(money);
  });

  it("a partner cancelled with a reason is a decision, not an omission", () => {
    const [time, money] = pairFor("e1", { time: { status: "served" }, money: { status: "cancelled" } });
    expect(findHalfServed([time, money])).toBeNull();
  });

  it("both served, or neither, is quiet", () => {
    expect(findHalfServed(pairFor("e1", { time: { status: "served" }, money: { status: "served" } }))).toBeNull();
    expect(findHalfServed(pairFor("e1"))).toBeNull();
  });

  it("is carried on the group", () => {
    const [g] = groupTimeBars(pairFor("e1", { time: { status: "served" } }));
    expect(g.halfServed?.missing).toBe("money");
  });

  it("is never raised for a form with no pair", () => {
    expect(findHalfServed([bar({ status: "served" }), bar()])).toBeNull();
  });
});

describe("the service line", () => {
  const service = (over: Partial<TimeBarService> = {}): TimeBarService => ({
    served_on: "2026-11-12",
    method: "email",
    method_label: "Email",
    served_to: "Principal agent",
    reference: "",
    document: null,
    recorded_at: "2026-11-13T09:00:00Z",
    recorded_by: "Thandi",
    timing: { on_time: true, days: 2, unit: "working", label: "On time (2 working days to spare)" },
    ...over,
  });

  it("states when, how and on whom", () => {
    expect(serviceSummary(service())).toBe("Served on 12 Nov 2026 by email to Principal agent.");
    expect(serviceSummary(service({ method: "registered_post" }))).toBe(
      "Served on 12 Nov 2026 by registered post to Principal agent.",
    );
    expect(serviceSummary(service({ method: "platform" }))).toBe(
      "Served on 12 Nov 2026 via the platform to Principal agent.",
    );
  });

  it("does not pass the recording date off as the date of service", () => {
    const text = serviceSummary(service({ served_on: null, method: null, timing: null }));
    expect(text).toBe("Recorded as served on 13 Nov 2026. The date of service was not recorded.");
  });

  it("a legal date does not move with the viewer's timezone", () => {
    expect(parseDay("2026-11-12")?.getDate()).toBe(12);
    expect(formatDay("2026-11-12")).toBe("12 Nov 2026");
    expect(formatDay(null)).toBe("");
  });
});

describe("serverMessage", () => {
  it("prefers the server's error, then its first field message", () => {
    expect(serverMessage({ response: { data: { error: "Already served." } } }, "x")).toBe("Already served.");
    expect(serverMessage({ response: { data: { served_on: "In the future." } } }, "x")).toBe("In the future.");
    expect(serverMessage({ response: { data: { method: ["Choose one."] } } }, "x")).toBe("Choose one.");
    expect(serverMessage(new Error("network"), "fallback")).toBe("fallback");
  });
});
