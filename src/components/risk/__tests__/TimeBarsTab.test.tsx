/**
 * Notice deadlines — the countdown badge, the outage state and the null guard.
 *
 * This tab is what an insurer reads to judge whether notice was served in
 * time, so each of these three has a legal consequence when it is wrong:
 *
 *  • the badge used to print `${days}d left` for a WORKING-day count, which a
 *    reader converts to a wall-clock date about a third too far out;
 *  • a failed fetch rendered the "no deadlines tracked" empty state, so an
 *    outage was indistinguishable from a clean bill of health;
 *  • a null countdown rendered as the literal "nulld left", coloured green.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useFetchMock = vi.fn();

vi.mock("@/hooks/useFetch", () => ({ default: (url: string) => useFetchMock(url) }));
vi.mock("@/hooks/usePost", () => ({ usePost: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TimeBarsTab from "../TimeBarsTab";
import { describeCountdown } from "@/lib/timeBarCountdown";

const bar = (over: Record<string, unknown> = {}) => ({
  id: 1,
  label: "Notice of delay",
  clock_type: "delay_notice",
  contract_form: "JBCC",
  clause_ref: "23.1",
  clause_verified: true,
  awareness_date: "2026-08-03",
  duration: 20,
  unit: "working",
  deadline_date: "2026-08-31",
  days_remaining: 12,
  days_remaining_unit: "working",
  days_remaining_label: "12 working days remaining",
  status: "open",
  notes: "",
  ...over,
});

const state = (over: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  isPending: false,
  refetch: vi.fn(),
  ...over,
});

beforeEach(() => {
  useFetchMock.mockReset();
});

// ── 1. The unit ────────────────────────────────────────────────────────────

describe("the countdown badge", () => {
  it("prints the backend's finished label, unit and all", () => {
    useFetchMock.mockReturnValue(state({ data: { time_bars: [bar()] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("12 working days remaining")).toBeInTheDocument();
  });

  it("never prints a bare day count", () => {
    useFetchMock.mockReturnValue(state({
      data: { time_bars: [bar(), bar({ id: 2, days_remaining: -3, days_remaining_label: "3 working days overdue" })] },
    }));
    const { container } = render(<TimeBarsTab projectId="1" />);

    expect(container.textContent).not.toMatch(/\d\s*d left/);
    expect(container.textContent).not.toMatch(/\d\s*d overdue/);
    expect(screen.getByText("3 working days overdue")).toBeInTheDocument();
  });

  it("does not rebuild the sentence when the backend did not send one", () => {
    const c = describeCountdown({
      days_remaining: 12,
      days_remaining_unit: "working",
      days_remaining_label: null,
      status: "open",
    });
    expect(c.text).toBe("countdown unavailable");
    expect(c.text).not.toMatch(/12/);
    expect(c.tone).toBe("unknown");
  });

  it("colours by the working-day window, not a flat 14", () => {
    // 12 working days is roughly 17 calendar days — comfortably outside the
    // amber window a flat 14 would have put it inside.
    expect(describeCountdown({
      days_remaining: 12, days_remaining_unit: "working",
      days_remaining_label: "12 working days remaining", status: "open",
    }).tone).toBe("safe");
    expect(describeCountdown({
      days_remaining: 12, days_remaining_unit: "calendar",
      days_remaining_label: "12 calendar days remaining", status: "open",
    }).tone).toBe("soon");
  });

  it("reports a closed bar by its status", () => {
    expect(describeCountdown({
      days_remaining: 12, days_remaining_unit: "working",
      days_remaining_label: "12 working days remaining", status: "served",
    })).toEqual({ text: "served", tone: "closed" });
  });
});

// ── 4. The null guard ──────────────────────────────────────────────────────

describe("an uncounted deadline", () => {
  it("never renders 'nulld left'", () => {
    useFetchMock.mockReturnValue(state({
      data: { time_bars: [bar({ days_remaining: null, days_remaining_label: null })] },
    }));
    const { container } = render(<TimeBarsTab projectId="1" />);

    expect(container.textContent).not.toMatch(/null/);
    expect(container.textContent).not.toMatch(/NaN|undefined/);
    expect(screen.getByText("countdown unavailable")).toBeInTheDocument();
  });

  it("reads as unknown, never as safe", () => {
    for (const days of [null, undefined, Number.NaN]) {
      const c = describeCountdown({
        days_remaining: days as number | null,
        days_remaining_unit: "working",
        days_remaining_label: "due today",
        status: "open",
      });
      expect(c.tone).toBe("unknown");
      expect(c.tone).not.toBe("safe");
    }
  });

  it("still shows the deadline date, so the hard fact survives", () => {
    useFetchMock.mockReturnValue(state({
      data: { time_bars: [bar({ days_remaining: null, days_remaining_label: null })] },
    }));
    render(<TimeBarsTab projectId="1" />);
    expect(screen.getByText("2026-08-31")).toBeInTheDocument();
  });
});

// ── 3. The outage ──────────────────────────────────────────────────────────

describe("when the deadlines cannot be loaded", () => {
  it("says so instead of showing the empty state", () => {
    useFetchMock.mockReturnValue(state({ isError: true, error: new Error("500") }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("Notice deadlines could not be loaded")).toBeInTheDocument();
    /*
      The copy was shortened — "This is not a statement that there are none —
      nothing below has been checked" became "Nothing below has been checked"
      — so the literal phrase this matched is gone. What the assertion is FOR
      is unchanged and still the point of the test: an outage must not read as
      an all-clear, so the block has to say the list was never checked rather
      than that it is empty.
    */
    expect(screen.getByText(/nothing below has been checked/i)).toBeInTheDocument();
    expect(screen.queryByText(/no notice deadlines (yet|recorded)/i)).not.toBeInTheDocument();
    expect(screen.queryByText("No deadlines tracked")).not.toBeInTheDocument();
  });

  it("offers a retry that refetches", async () => {
    const refetch = vi.fn();
    useFetchMock.mockReturnValue(state({ isError: true, refetch }));
    render(<TimeBarsTab projectId="1" />);

    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("shows neither the empty state nor rows while loading", () => {
    useFetchMock.mockReturnValue(state({ isLoading: true }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.queryByText("No deadlines tracked")).not.toBeInTheDocument();
    expect(screen.getByText("Loading notice deadlines")).toBeInTheDocument();
  });

  it("still shows the empty state when the fetch genuinely returned none", () => {
    useFetchMock.mockReturnValue(state({ data: { time_bars: [] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("No deadlines tracked")).toBeInTheDocument();
  });
});
