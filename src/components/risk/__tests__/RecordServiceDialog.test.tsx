/**
 * Recording service of a notice. Replaces a one-click "Mark served" that
 * posted `{}`: no date, no method, no recipient, no evidence.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
const postMock = vi.fn();
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));

vi.mock("@/hooks/useFetch", () => ({ default: (url: string) => fetchMock(url) }));
vi.mock("@/hooks/usePost", () => ({ usePost: () => ({ mutateAsync: postMock }) }));
vi.mock("sonner", () => ({ toast: toastMock }));

import RecordServiceDialog from "../RecordServiceDialog";
import { todayIso, type TimeBar } from "@/lib/timeBarEvents";

const bar: TimeBar = {
  id: 7,
  label: "Notice of delay",
  clock_type: "delay_notice",
  contract_form: "JBCC",
  clause_ref: "",
  clause_verified: false,
  awareness_date: "2026-08-03",
  duration: 20,
  unit: "working",
  deadline_date: "2026-08-31",
  days_remaining: 3,
  days_remaining_unit: "working",
  days_remaining_label: "3 working days remaining",
  status: "open",
};

const docs = [
  { _id: "41", name: "Notice of delay (signed)", reference: "DOC-041" },
  { _id: "42", name: "Programme rev C", reference: "DOC-042" },
];

const renderDialog = (over: Partial<Parameters<typeof RecordServiceDialog>[0]> = {}) => {
  const onClose = vi.fn();
  const onRecorded = vi.fn();
  render(
    <RecordServiceDialog
      bar={bar}
      projectId="5"
      defaultRecipient="Principal agent"
      onClose={onClose}
      onRecorded={onRecorded}
      {...over}
    />,
  );
  return { onClose, onRecorded };
};

beforeEach(() => {
  fetchMock.mockReset();
  postMock.mockReset();
  postMock.mockResolvedValue({});
  Object.values(toastMock).forEach((f) => f.mockReset());
  fetchMock.mockReturnValue({ data: { results: docs }, isLoading: false, isError: false });
});

describe("the defaults", () => {
  it("starts on today and the contract's recipient, with no method chosen", () => {
    renderDialog();
    expect(screen.getByLabelText("Date served")).toHaveValue(todayIso());
    expect(screen.getByLabelText("Date served")).toHaveAttribute("max", todayIso());
    expect(screen.getByLabelText("Served on")).toHaveValue("Principal agent");
    for (const name of ["Email", "Hand delivery", "Registered post", "Via the platform"]) {
      expect(screen.getByRole("radio", { name })).not.toBeChecked();
    }
    // A method is a fact; it is never chosen for the user.
    expect(screen.getByRole("button", { name: "Record service" })).toBeDisabled();
  });

  it("names the notice and its deadline", () => {
    renderDialog();
    expect(screen.getByText(/Notice of delay, due 31 Aug 2026/)).toBeInTheDocument();
  });
});

describe("what cannot be recorded", () => {
  it("refuses a date in the future", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    fireEvent.change(screen.getByLabelText("Date served"), { target: { value: "2999-01-01" } });
    expect(screen.getByText("The date served cannot be in the future.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record service" })).toBeDisabled();
  });

  it("refuses a date before the event was known", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    fireEvent.change(screen.getByLabelText("Date served"), { target: { value: "2026-08-02" } });
    expect(screen.getByText(/before the date of awareness \(03 Aug 2026\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record service" })).toBeDisabled();
  });

  it("refuses an empty recipient", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    fireEvent.change(screen.getByLabelText("Served on"), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: "Record service" })).toBeDisabled();
  });
});

describe("recording", () => {
  it("sends the date, method, recipient and reference, then refreshes", async () => {
    const { onClose, onRecorded } = renderDialog();
    fireEvent.change(screen.getByLabelText("Date served"), { target: { value: "2026-08-27" } });
    fireEvent.click(screen.getByRole("radio", { name: "Registered post" }));
    fireEvent.change(screen.getByLabelText("Served on"), { target: { value: "Principal agent (J. Mokoena)" } });
    fireEvent.change(screen.getByLabelText("Reference or note (optional)"), { target: { value: "RD 1234 567 ZA" } });

    fireEvent.click(screen.getByRole("button", { name: "Record service" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith({
      url: "time-bars/7/serve/",
      data: {
        served_on: "2026-08-27",
        method: "registered_post",
        served_to: "Principal agent (J. Mokoena)",
        reference: "RD 1234 567 ZA",
      },
    });
    await waitFor(() => expect(onRecorded).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("Service recorded: served on 27 Aug 2026");
  });

  it("links the notice document when one is chosen", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    fireEvent.change(screen.getByLabelText("The notice served (optional)"), { target: { value: "delay" } });
    expect(fetchMock).toHaveBeenCalledWith("documents/?project_id=5&search=delay");
    fireEvent.click(screen.getByRole("button", { name: "DOC-041 · Notice of delay (signed)" }));
    expect(screen.getByText("DOC-041 · Notice of delay (signed)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record service" }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][0].data.document_id).toBe(41);
  });

  it("shows the server's reason when it refuses, and stays open", async () => {
    postMock.mockRejectedValue({ response: { data: { error: "This notice is already recorded as served on 27 Aug 2026." } } });
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    fireEvent.click(screen.getByRole("button", { name: "Record service" }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("This notice is already recorded as served on 27 Aug 2026."),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cannot be sent twice while the first is in flight", async () => {
    let resolve: (v: unknown) => void = () => {};
    postMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Email" }));
    const button = screen.getByRole("button", { name: "Record service" });
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "Recording…" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Recording…" }));
    expect(postMock).toHaveBeenCalledTimes(1);
    resolve({});
  });
});
