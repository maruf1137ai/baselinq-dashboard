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

const fetchMock = vi.fn();
const mockUsePermissions = vi.fn();

vi.mock("@/hooks/useFetch", () => ({ default: (url: string) => fetchMock(url) }));
const postMock = vi.fn(async () => ({}));
vi.mock("@/hooks/usePost", () => ({ usePost: () => ({ mutateAsync: postMock }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => mockUsePermissions() }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

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
  fetchMock.mockReset();
  postMock.mockClear();
  Object.values(toastMock).forEach((f) => f.mockReset());
  // Default: a PM/Principal-Agent-equivalent viewer, so every existing test
  // above (none of which is about permission gating) keeps seeing the real
  // "Record service…"/"Cancel deadline…" buttons.
  mockUsePermissions.mockReturnValue({ canManageTimeBars: true, canRecordTimeBarService: true });
});

// ── 1. The unit ────────────────────────────────────────────────────────────

describe("the countdown badge", () => {
  it("prints the backend's finished label, unit and all", () => {
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar()] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("12 working days remaining")).toBeInTheDocument();
  });

  it("never prints a bare day count", () => {
    fetchMock.mockReturnValue(state({
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

  it("reports a closed bar by what happened to it, in words, not the raw enum", () => {
    // No service timing on the payload (a clock marked served before the date
    // of service was kept): "Served", and never claimed to be on time.
    expect(describeCountdown({
      days_remaining: 12, days_remaining_unit: "working",
      days_remaining_label: "12 working days remaining", status: "served",
    })).toEqual({ text: "Served", tone: "served_undated" });
  });
});

// ── 4. The null guard ──────────────────────────────────────────────────────

describe("an uncounted deadline", () => {
  it("never renders 'nulld left'", () => {
    fetchMock.mockReturnValue(state({
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
    fetchMock.mockReturnValue(state({
      data: { time_bars: [bar({ days_remaining: null, days_remaining_label: null })] },
    }));
    render(<TimeBarsTab projectId="1" />);
    // Formatted like every other date in the product, never raw ISO.
    expect(screen.getByText("31 Aug 2026")).toBeInTheDocument();
    expect(screen.queryByText("2026-08-31")).not.toBeInTheDocument();
  });
});

// ── 3. The outage ──────────────────────────────────────────────────────────

describe("when the deadlines cannot be loaded", () => {
  it("says so instead of showing the empty state", () => {
    fetchMock.mockReturnValue(state({ isError: true, error: new Error("500") }));
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
    fetchMock.mockReturnValue(state({ isError: true, refetch }));
    render(<TimeBarsTab projectId="1" />);

    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it("shows neither the empty state nor rows while loading", () => {
    fetchMock.mockReturnValue(state({ isLoading: true }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.queryByText("No deadlines tracked")).not.toBeInTheDocument();
    expect(screen.getByText("Loading notice deadlines")).toBeInTheDocument();
  });

  it("still shows the empty state when the fetch genuinely returned none", () => {
    fetchMock.mockReturnValue(state({ data: { time_bars: [] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("No deadlines tracked")).toBeInTheDocument();
  });
});

// ── 5. Who may act ───────────────────────────────────────────────────────
//
// Under JBCC the contractor serves notices for time and money on the
// principal agent, so recording service (risk.timebar.serve) is the
// contractor's act as well as the PM's / PA's. Cancelling stays with the PM /
// PA (risk.timebar.manage). A viewer must never see a button that will 403.

describe("acting on a deadline", () => {
  it("shows Record service / Cancel deadline to a viewer who holds both", () => {
    mockUsePermissions.mockReturnValue({ canManageTimeBars: true, canRecordTimeBarService: true });
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar()] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByRole("button", { name: "Record service…" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deadline…" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark served" })).not.toBeInTheDocument();
  });

  it("lets the contractor record service, but not cancel", () => {
    mockUsePermissions.mockReturnValue({ canManageTimeBars: false, canRecordTimeBarService: true });
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar()] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByRole("button", { name: "Record service…" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel deadline…" })).not.toBeInTheDocument();
  });

  it("tells a viewer with neither who serves on whom — never 'awaiting the PA'", () => {
    mockUsePermissions.mockReturnValue({ canManageTimeBars: false, canRecordTimeBarService: false });
    fetchMock.mockReturnValue(state({
      data: {
        time_bars: [bar()],
        contract_form: { form: "JBCC", notice_recipient: "Principal agent", error: null },
      },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.queryByRole("button", { name: "Record service…" })).not.toBeInTheDocument();
    expect(screen.getByText("The contractor serves this notice on the principal agent")).toBeInTheDocument();
    expect(screen.queryByText(/Awaiting PM/i)).not.toBeInTheDocument();
  });

  it("offers recording on a deadline that has passed with nothing recorded", () => {
    fetchMock.mockReturnValue(state({
      data: { time_bars: [bar({ status: "lapsed", days_remaining: -2, days_remaining_label: "2 working days overdue" })] },
    }));
    render(<TimeBarsTab projectId="1" />);
    expect(screen.getByRole("button", { name: "Record service…" })).toBeInTheDocument();
  });

  it("offers neither serve nor cancel once a notice is served, only the undo", () => {
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar({ status: "served" })] } }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.queryByRole("button", { name: "Record service…" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel deadline…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo service record…" })).toBeInTheDocument();
  });
});

describe("cancelling a deadline", () => {
  it("asks why, says what cancelling does, and sends the reason", async () => {
    const { fireEvent, screen, waitFor } = await import("@testing-library/react");
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar({ clock_type: "expense_and_loss_notice" })] } }));
    render(<TimeBarsTab projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel deadline…" }));
    expect(screen.getByText(/cannot be reopened/)).toBeInTheDocument();
    expect(screen.getByText(/sends no more reminders/)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Cancel deadline" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "No money claim" } });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith({ url: "time-bars/1/cancel/", data: { reason: "No money claim" } }),
    );
  });

  it("shows the server's reason when it refuses", async () => {
    const { fireEvent, screen, waitFor } = await import("@testing-library/react");
    postMock.mockRejectedValueOnce({ response: { data: { error: "This deadline is already cancelled." } } });
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar()] } }));
    render(<TimeBarsTab projectId="1" />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel deadline…" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Duplicate" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel deadline" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("This deadline is already cancelled."));
  });
});

// ── 6. Urgency is coloured one way ─────────────────────────────────────────
//
// The tab used to grey "2 working days remaining" into the served style and
// colour "40 working days remaining" green.

describe("the urgency colours on the page", () => {
  const badge = (text: string) => screen.getByText(text);

  it("three days or fewer is red, approaching amber, comfortable neutral", () => {
    fetchMock.mockReturnValue(state({
      data: {
        time_bars: [
          bar({ id: 1, event_key: "a", days_remaining: 2, days_remaining_label: "2 working days remaining" }),
          bar({ id: 2, event_key: "b", days_remaining: 8, days_remaining_label: "8 working days remaining" }),
          bar({ id: 3, event_key: "c", days_remaining: 40, days_remaining_label: "40 working days remaining" }),
          bar({ id: 4, event_key: "d", days_remaining: -1, days_remaining_label: "1 working day overdue" }),
        ],
      },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(badge("2 working days remaining").className).toMatch(/bg-red-50/);
    expect(badge("1 working day overdue").className).toMatch(/bg-red-50/);
    expect(badge("8 working days remaining").className).toMatch(/bg-amber-50/);
    expect(badge("40 working days remaining").className).toMatch(/bg-muted/);
    expect(badge("40 working days remaining").className).not.toMatch(/emerald|green/);
  });

  it("served on time is green and set apart from live deadlines; cancelled is neutral", () => {
    fetchMock.mockReturnValue(state({
      data: {
        time_bars: [
          bar({ id: 1, event_key: "live" }),
          bar({
            id: 2, event_key: "done", status: "served",
            service: {
              served_on: "2026-08-27", method: "email", method_label: "Email", served_to: "Principal agent",
              reference: "", document: null, recorded_at: "2026-08-27T10:00:00Z", recorded_by: "Thandi",
              timing: { on_time: true, days: 2, unit: "working", label: "On time (2 working days to spare)" },
            },
          }),
          bar({ id: 3, event_key: "gone", status: "cancelled", cancellation_reason: "No money claim" }),
        ],
      },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("Served").className).toMatch(/bg-green-50/);
    expect(screen.getByText("Cancelled").className).toMatch(/bg-muted/);
    expect(screen.getByText("Live (1)")).toBeInTheDocument();
    expect(screen.getByText("Served or cancelled (2)")).toBeInTheDocument();
    expect(screen.queryByText("served")).not.toBeInTheDocument();
    expect(screen.queryByText("cancelled")).not.toBeInTheDocument();
  });
});

// ── 7. What service records, and whether it was in time ───────────────────

describe("a served notice", () => {
  const served = (timing: unknown, over: Record<string, unknown> = {}) => bar({
    status: "served",
    service: {
      served_on: "2026-11-12", method: "email", method_label: "Email", served_to: "Principal agent",
      reference: "", document: null, recorded_at: "2026-11-12T10:00:00Z", recorded_by: "Thandi Nkosi",
      timing, ...over,
    },
  });

  it("says when, how, on whom, and the server's on-time verdict", () => {
    fetchMock.mockReturnValue(state({
      data: { time_bars: [served({ on_time: true, days: 2, unit: "working", label: "On time (2 working days to spare)" })] },
    }));
    render(<TimeBarsTab projectId="1" />);

    const line = screen.getByTestId("service-line");
    expect(line.textContent).toContain("Served on 12 Nov 2026 by email to Principal agent.");
    expect(line.textContent).toContain("On time (2 working days to spare).");
    expect(line.textContent).toContain("Recorded by Thandi Nkosi.");
  });

  it("says served late, in red, when the server says so", () => {
    fetchMock.mockReturnValue(state({
      data: { time_bars: [served({ on_time: false, days: 1, unit: "working", label: "Served late (1 working day after the deadline)" })] },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText("Served late").className).toMatch(/bg-red-50/);
    expect(screen.getByText("Served late (1 working day after the deadline).").className).toMatch(/text-red-700/);
  });

  it("does not pretend to know the date of service when it was never recorded", () => {
    fetchMock.mockReturnValue(state({
      data: { time_bars: [served(null, { served_on: null, method: null })] },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByTestId("service-line").textContent).toContain("The date of service was not recorded.");
    expect(screen.queryByText(/On time/)).not.toBeInTheDocument();
  });

  it("can undo a mistaken record, with a reason", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    fetchMock.mockReturnValue(state({
      data: { time_bars: [served({ on_time: true, days: 0, unit: "working", label: "On time (served on the last day)" })] },
    }));
    render(<TimeBarsTab projectId="1" />);

    fireEvent.click(screen.getByRole("button", { name: "Undo service record…" }));
    const confirm = screen.getByRole("button", { name: "Withdraw record" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Why is it being withdrawn?"), { target: { value: "Wrong event" } });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith({ url: "time-bars/1/unserve/", data: { reason: "Wrong event" } }),
    );
  });

  it("keeps a withdrawn record visible on the reopened deadline", () => {
    fetchMock.mockReturnValue(state({
      data: {
        time_bars: [bar({
          last_withdrawal: { at: "2026-11-13T08:00:00Z", by: "Thandi Nkosi", reason: "Wrong event", served_on: "2026-11-12" },
        })],
      },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText(/A service record \(served 12 Nov 2026\) was withdrawn on 13 Nov 2026 by Thandi Nkosi: Wrong event/))
      .toBeInTheDocument();
  });

  it("opens the record-service dialog from a live deadline", async () => {
    const { fireEvent } = await import("@testing-library/react");
    fetchMock.mockReturnValue(state({ data: { time_bars: [bar()] } }));
    render(<TimeBarsTab projectId="1" />);

    fireEvent.click(screen.getByRole("button", { name: "Record service…" }));
    expect(screen.getByRole("dialog", { name: "Record service" })).toBeInTheDocument();
  });
});

// ── 8. One event, one pair ────────────────────────────────────────────────

describe("the JBCC notice for time and notice for money", () => {
  const pair = (timeOver: Record<string, unknown> = {}, moneyOver: Record<string, unknown> = {}) => [
    bar({ id: 11, event_key: "evt", event_description: "Late site access", pair_role: "time", ...timeOver }),
    bar({
      id: 12, event_key: "evt", event_description: "Late site access", pair_role: "money",
      clock_type: "expense_and_loss_notice", label: "Notice of claim for expense and loss (money)",
      days_remaining: 3, days_remaining_label: "3 working days remaining", ...moneyOver,
    }),
  ];

  it("are shown as one event, side by side, under what happened", () => {
    fetchMock.mockReturnValue(state({ data: { time_bars: pair() } }));
    render(<TimeBarsTab projectId="1" />);

    const group = screen.getByRole("region", { name: "Late site access" });
    expect(group).toContainElement(screen.getByTestId("time-bar-11"));
    expect(group).toContainElement(screen.getByTestId("time-bar-12"));
    expect(screen.getByText("Notice for time")).toBeInTheDocument();
    expect(screen.getByText("Notice for money")).toBeInTheDocument();
    expect(screen.getAllByText("Late site access")).toHaveLength(1);
  });

  it("warn in the group when only one of the two is served", () => {
    fetchMock.mockReturnValue(state({ data: { time_bars: pair({ status: "served" }) } }));
    render(<TimeBarsTab projectId="1" />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Served for time, not for money.");
    expect(alert.textContent).toContain("is due by 31 Aug 2026 (3 working days remaining)");
    expect(alert.textContent).toContain("Each notice forfeits on its own.");
    expect(screen.getByRole("region", { name: "Late site access" })).toContainElement(alert);
  });

  it("do not warn when the partner was cancelled with a reason", () => {
    fetchMock.mockReturnValue(state({
      data: { time_bars: pair({ status: "served" }, { status: "cancelled", cancellation_reason: "No money claim" }) },
    }));
    render(<TimeBarsTab projectId="1" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tell a viewer who cannot cancel who can", () => {
    mockUsePermissions.mockReturnValue({ canManageTimeBars: false, canRecordTimeBarService: true });
    fetchMock.mockReturnValue(state({ data: { time_bars: pair({}, { status: "served" }) } }));
    render(<TimeBarsTab projectId="1" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Served for money, not for time.");
    expect(alert.textContent).toContain("the PM or principal agent can cancel");
  });
});

// ── 9. Tracking a deadline ────────────────────────────────────────────────

describe("tracking a deadline", () => {
  const withForm = (contract_form: unknown) =>
    fetchMock.mockReturnValue(state({ data: { time_bars: [], contract_form } }));

  it("says which contract the deadlines are counted under, and asks what happened", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    postMock.mockResolvedValueOnce({ created: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] } as never);
    withForm({ form: "JBCC", notice_recipient: "Principal agent", error: null });
    render(<TimeBarsTab projectId="9" />);

    fireEvent.click(screen.getByRole("button", { name: /Track deadline/ }));
    expect(screen.getByText("Counted under JBCC, the project's contract form.")).toBeInTheDocument();
    // No contract-form picker: the server counts under the project's own form.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Track deadlines" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("What happened"), { target: { value: "Late site access" } });
    fireEvent.change(screen.getByLabelText("Date of awareness"), { target: { value: "2026-11-02" } });
    fireEvent.click(submit);

    await waitFor(() => expect(postMock).toHaveBeenCalledWith({
      url: "projects/9/time-bars/",
      data: { awareness_date: "2026-11-02", event_description: "Late site access" },
    }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("4 deadlines now tracked"));
  });

  it("warns rather than celebrating when nothing was created", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    postMock.mockResolvedValueOnce({ created: [] } as never);
    withForm({ form: "JBCC", notice_recipient: "Principal agent", error: null });
    render(<TimeBarsTab projectId="9" />);

    fireEvent.click(screen.getByRole("button", { name: /Track deadline/ }));
    fireEvent.change(screen.getByLabelText("What happened"), { target: { value: "Late site access" } });
    fireEvent.change(screen.getByLabelText("Date of awareness"), { target: { value: "2026-11-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Track deadlines" }));

    await waitFor(() => expect(toastMock.warning).toHaveBeenCalled());
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("is sent once, however often it is clicked", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    let resolve: (v: unknown) => void = () => {};
    postMock.mockReturnValueOnce(new Promise((r) => { resolve = r; }) as never);
    withForm({ form: "JBCC", notice_recipient: "Principal agent", error: null });
    render(<TimeBarsTab projectId="9" />);

    fireEvent.click(screen.getByRole("button", { name: /Track deadline/ }));
    fireEvent.change(screen.getByLabelText("What happened"), { target: { value: "Late site access" } });
    fireEvent.change(screen.getByLabelText("Date of awareness"), { target: { value: "2026-11-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Track deadlines" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Tracking…" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Tracking…" }));
    expect(postMock).toHaveBeenCalledTimes(1);
    resolve({ created: [{ id: 1 }] });
  });

  it("cannot be tracked on a project with no contract form, and says why", async () => {
    const { fireEvent } = await import("@testing-library/react");
    withForm({
      form: null, notice_recipient: null,
      error: "This project has no contract type set, so notice periods cannot be determined.",
    });
    render(<TimeBarsTab projectId="9" />);

    fireEvent.click(screen.getByRole("button", { name: /Track deadline/ }));
    expect(screen.getByText(/no contract type set/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("What happened"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Date of awareness"), { target: { value: "2026-11-02" } });
    expect(screen.getByRole("button", { name: "Track deadlines" })).toBeDisabled();
  });

  it("refuses an awareness date in the future", async () => {
    const { fireEvent } = await import("@testing-library/react");
    withForm({ form: "JBCC", notice_recipient: "Principal agent", error: null });
    render(<TimeBarsTab projectId="9" />);

    fireEvent.click(screen.getByRole("button", { name: /Track deadline/ }));
    fireEvent.change(screen.getByLabelText("What happened"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Date of awareness"), { target: { value: "2999-01-01" } });
    expect(screen.getByText("The date of awareness cannot be in the future.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Track deadlines" })).toBeDisabled();
  });
});

// ── 10. Only the steps that can forfeit are shown as forfeiting ───────────

describe("the 40-working-day detailed claim", () => {
  it("says it carries no forfeiture, and is amber rather than red when near", () => {
    fetchMock.mockReturnValue(state({
      data: {
        time_bars: [bar({
          clock_type: "expense_and_loss", label: "Claim for expense and loss", duration: 40,
          days_remaining: 2, days_remaining_label: "2 working days remaining", forfeits: false,
        })],
      },
    }));
    render(<TimeBarsTab projectId="1" />);

    expect(screen.getByText(/No forfeiture of its own on this step/)).toBeInTheDocument();
    expect(screen.getByText("2 working days remaining").className).toMatch(/bg-amber-50/);
  });
});
