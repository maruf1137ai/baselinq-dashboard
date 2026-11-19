/**
 * Scheduling a meeting needs a time, not only a date.
 *
 * Bug (19 Nov 2026): picking a date but no time saved the meeting with an
 * empty time, which the server turned into local midnight ("12:00 AM").
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const postRequest = vi.fn();
const patchRequest = vi.fn();
const toastError = vi.fn();

vi.mock("@/hooks/usePost", () => ({
  usePost: () => ({ mutateAsync: postRequest, isPending: false }),
}));
vi.mock("@/hooks/usePatch", () => ({
  usePatch: () => ({ mutateAsync: patchRequest, isPending: false }),
}));
const TEAM = { teamMembers: [] };
vi.mock("@/hooks/useFetch", () => ({
  default: () => ({ data: TEAM }),
}));
vi.mock("sonner", () => ({
  toast: { error: (msg: string) => toastError(msg), success: vi.fn() },
}));
// The real calendar is a full date grid; a single button stands in for "pick 1 Dec 2026".
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect: (d: Date) => void }) => (
    <button type="button" onClick={() => onSelect(new Date(2026, 11, 1))}>pick-1-dec</button>
  ),
}));

import { ScheduleNewMeetingDialog } from "@/components/meetings/scheduleMeetingDialog";

beforeEach(() => {
  postRequest.mockReset();
  patchRequest.mockReset();
  toastError.mockReset();
  localStorage.setItem("selectedProjectId", "9");
  localStorage.setItem("user", JSON.stringify({ id: 1 }));
});

function openAndFillTitleAndDate() {
  render(<ScheduleNewMeetingDialog />);
  fireEvent.click(screen.getByRole("button", { name: /Schedule Meeting/ }));
  fireEvent.change(screen.getByLabelText(/Meeting Title/), { target: { value: "Site progress" } });
  fireEvent.click(screen.getByRole("button", { name: /^Date/ }));
  fireEvent.click(screen.getByRole("button", { name: "pick-1-dec" }));
}

describe("Schedule meeting — time is required", () => {
  it("refuses to schedule with a date but no time", async () => {
    openAndFillTitleAndDate();
    const submit = screen.getAllByRole("button", { name: "Schedule Meeting" }).at(-1)!;
    fireEvent.click(submit);
    expect(toastError).toHaveBeenCalledWith("Please select a time.");
    expect(postRequest).not.toHaveBeenCalled();
  });

  it("still asks for the date first when neither is set", () => {
    render(<ScheduleNewMeetingDialog />);
    fireEvent.click(screen.getByRole("button", { name: /Schedule Meeting/ }));
    fireEvent.change(screen.getByLabelText(/Meeting Title/), { target: { value: "Site progress" } });
    const submit = screen.getAllByRole("button", { name: "Schedule Meeting" }).at(-1)!;
    fireEvent.click(submit);
    expect(toastError).toHaveBeenCalledWith("Please select a date.");
    expect(postRequest).not.toHaveBeenCalled();
  });
});

/**
 * Part 2 (19 Nov 2026): the organiser can edit a meeting after creating it.
 * The same form opens prefilled and saves with a PATCH, not a new POST.
 */
describe("Edit meeting", () => {
  const MEETING = {
    id: 66,
    project: 47,
    title: "Site progress",
    meeting_link: "",
    date: "2026-12-01",
    time: "9:00 AM",
    priority: "Medium",
    attendees: [1, 7],
  };

  it("opens prefilled and saves the changes to the same meeting", async () => {
    const onSaved = vi.fn();
    patchRequest.mockResolvedValue({});
    render(<ScheduleNewMeetingDialog meeting={MEETING} open onOpenChange={() => {}} onSaved={onSaved} />);

    expect(screen.getByText("Edit Meeting")).toBeInTheDocument();
    const title = screen.getByLabelText(/Meeting Title/) as HTMLInputElement;
    expect(title.value).toBe("Site progress");
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();

    fireEvent.change(title, { target: { value: "Site progress moved" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(postRequest).not.toHaveBeenCalled();
    expect(patchRequest).toHaveBeenCalledTimes(1);
    const { url, data } = patchRequest.mock.calls[0][0];
    expect(url).toBe("meetings/66/");
    expect(data).toMatchObject({
      title: "Site progress moved",
      date: "2026-12-01",
      time: "9:00 AM",
      priority: "Medium",
      attendees: [1, 7],
    });
    // The link didn't change, so the location is left as it is.
    expect(data).not.toHaveProperty("location");
  });

  it("has no Schedule Meeting trigger of its own", () => {
    render(<ScheduleNewMeetingDialog meeting={MEETING} open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole("button", { name: /Schedule Meeting/ })).not.toBeInTheDocument();
  });

  it("shows the server's reason when the save is refused", async () => {
    patchRequest.mockRejectedValue({ response: { data: { detail: "Only the meeting's organiser can change its details." } } });
    render(<ScheduleNewMeetingDialog meeting={MEETING} open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Only the meeting's organiser can change its details."),
    );
  });
});
