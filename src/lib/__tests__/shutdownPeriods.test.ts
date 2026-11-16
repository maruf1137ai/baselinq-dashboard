/**
 * The builders' break as the project payload describes it, and the slips the
 * settings form catches before a save. The server's checks are final.
 */
import { describe, expect, it } from "vitest";
import { periodDays, periodProblems, readShutdownPeriods } from "@/lib/shutdownPeriods";

const BREAK = { start: "2026-12-15", end: "2027-01-08", label: "Builders' break 2026/27" };

describe("readShutdownPeriods", () => {
  it("reads the effective periods, where they came from, and the platform default", () => {
    const info = readShutdownPeriods({
      shutdownPeriods: { effective: [BREAK], source: "platform", platformDefault: [BREAK] },
    });
    expect(info).toEqual({ effective: [BREAK], source: "platform", platformDefault: [BREAK] });
  });

  it("is null for a payload from a server that does not send them", () => {
    expect(readShutdownPeriods({ name: "x" })).toBeNull();
    expect(readShutdownPeriods(undefined)).toBeNull();
  });

  it("keeps an explicit empty list as the project's own: no shutdown, not 'not set'", () => {
    const info = readShutdownPeriods({ shutdownPeriods: { effective: [], source: "project", platformDefault: [BREAK] } });
    expect(info?.source).toBe("project");
    expect(info?.effective).toEqual([]);
  });
});

describe("periodProblems", () => {
  it("accepts the 2026/27 break, 25 days with both ends counted", () => {
    expect(periodDays(BREAK)).toBe(25);
    expect(periodProblems([BREAK])).toEqual([]);
  });

  it.each([
    [{ ...BREAK, label: " " }, "needs a label"],
    [{ ...BREAK, end: "" }, "needs a start and an end date"],
    [{ ...BREAK, start: "2027-01-09" }, "ends before it starts"],
    [{ ...BREAK, start: "2026-11-01" }, "at most 45 days"],
  ])("refuses %o (%s)", (period, phrase) => {
    expect(periodProblems([period]).join(" ")).toContain(phrase);
  });

  it("refuses overlapping periods", () => {
    const later = { start: "2027-01-08", end: "2027-01-12", label: "Extra" };
    expect(periodProblems([later, BREAK]).join(" ")).toContain("overlap");
  });
});
