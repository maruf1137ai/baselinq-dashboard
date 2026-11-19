/**
 * The right-hand panel of a meeting (19 Nov 2026): the meeting's details and
 * who is invited, with an "Add attendee" field. Only the organiser can edit
 * or change the attendees; everyone else sees the panel read-only.
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const patchRequest = vi.fn();
const fetchUrls: string[] = [];
const TEAM = {
  teamMembers: [
    { _id: "a", userId: "1", user: { name: "Arif Organiser", email: "arif@example.com" } },
    { _id: "b", userId: "7", user: { name: "Bina Attendee", email: "bina@example.com" } },
    { _id: "c", userId: "9", user: { name: "Chen Newcomer", email: "chen@example.com" } },
  ],
};

vi.mock("@/hooks/usePatch", () => ({
  usePatch: () => ({ mutateAsync: patchRequest, isPending: false }),
}));
vi.mock("@/hooks/useFetch", () => ({
  default: (url: string) => {
    fetchUrls.push(url);
    return { data: url ? TEAM : undefined };
  },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { MeetingSidePanel, type SidePanelMeeting } from "@/components/meetings/MeetingSidePanel";

const base: SidePanelMeeting = {
  id: 66,
  project: 47,
  status: "scheduled",
  scheduled_utc: "2026-12-01T07:00:00Z",
  date_display: "December 01, 2026",
  time: "9:00 AM",
  location: "Site office",
  meeting_link: null,
  priority: "Medium",
  created_by_name: "Arif Organiser",
  is_organiser: true,
  attendees: [1, 7],
  attendee_responses: [
    { user_id: 1, name: "Arif Organiser", email: "arif@example.com", rsvp_status: "accepted", responded_at: null, is_organiser: true },
    { user_id: 7, name: "Bina Attendee", email: "bina@example.com", rsvp_status: "invited", responded_at: null, is_organiser: false },
  ],
};

beforeEach(() => {
  patchRequest.mockReset();
  patchRequest.mockResolvedValue({});
  fetchUrls.length = 0;
});

describe("Meeting side panel", () => {
  it("shows the details and every attendee with their answer", () => {
    render(<MeetingSidePanel meeting={base} onEdit={() => {}} onChanged={() => {}} />);
    expect(screen.getByText("Meeting details")).toBeInTheDocument();
    expect(screen.getByText("Site office")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Attendees (2)")).toBeInTheDocument();
    expect(within(screen.getByTestId("attendee-1")).getByText("Accepted")).toBeInTheDocument();
    expect(within(screen.getByTestId("attendee-1")).getByText("Organiser")).toBeInTheDocument();
    expect(within(screen.getByTestId("attendee-7")).getByText("Pending")).toBeInTheDocument();
  });

  it("lets the organiser edit and add attendees", () => {
    const onEdit = vi.fn();
    render(<MeetingSidePanel meeting={base} onEdit={onEdit} onChanged={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(onEdit).toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: /Add attendee/ })).toBeInTheDocument();
  });

  it("is read-only for everyone else", () => {
    render(<MeetingSidePanel meeting={{ ...base, is_organiser: false }} onEdit={() => {}} onChanged={() => {}} />);
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Add attendee/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    // It doesn't even load the project's users.
    expect(fetchUrls.every((u) => u === "")).toBe(true);
  });

  it("is read-only once the meeting is over, even for the organiser", () => {
    render(<MeetingSidePanel meeting={{ ...base, status: "completed" }} onEdit={() => {}} onChanged={() => {}} />);
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Add attendee/ })).not.toBeInTheDocument();
  });

  it("adds a user who isn't on the meeting yet, keeping everyone else", async () => {
    const onChanged = vi.fn();
    render(<MeetingSidePanel meeting={base} onEdit={() => {}} onChanged={onChanged} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Add attendee/ }));
    // Users already on the meeting aren't offered.
    expect(screen.queryByRole("option", { name: /Bina Attendee/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Chen Newcomer/ }));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(patchRequest).toHaveBeenCalledWith({ url: "meetings/66/", data: { attendees: [1, 7, 9] } });
  });

  it("removes an attendee but never offers to remove the organiser", async () => {
    const onChanged = vi.fn();
    render(<MeetingSidePanel meeting={base} onEdit={() => {}} onChanged={onChanged} />);
    expect(screen.queryByRole("button", { name: "Remove Arif Organiser" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Bina Attendee" }));
    await vi.waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(patchRequest).toHaveBeenCalledWith({ url: "meetings/66/", data: { attendees: [1] } });
  });
});
