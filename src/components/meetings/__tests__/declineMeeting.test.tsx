/**
 * Declining a meeting needs a reason (bug, 19 Nov 2026): a decline used to
 * change one RSVP row, show nothing on the meeting and tell nobody why.
 */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();
const patchData = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  patchData: (args: unknown) => patchData(args),
  postData: vi.fn(),
}));
vi.mock("@/hooks/useMeetingUnreadNotifications", () => ({
  useMeetingUnreadNotifications: () => ({ unreadByMeetingId: {} }),
}));
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) },
}));

import MeetingsList from "@/components/meetings/meetingList";
import { DeclineReasonForm } from "@/components/meetings/DeclineMeeting";
import { MeetingSidePanel, type SidePanelMeeting } from "@/components/meetings/MeetingSidePanel";

function withClient(ui: React.ReactElement) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>
  );
}

beforeEach(() => {
  fetchData.mockReset();
  patchData.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  localStorage.setItem("selectedProjectId", "47");
});

describe("Decline reason form", () => {
  it("can't be sent without a reason, blanks included", () => {
    render(withClient(<DeclineReasonForm meetingId={66} onCancel={() => {}} />));
    const send = screen.getByRole("button", { name: "Decline meeting" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason for declining/), { target: { value: "   " } });
    expect(send).toBeDisabled();
    expect(patchData).not.toHaveBeenCalled();
  });

  it("sends the trimmed reason with the decline", async () => {
    patchData.mockResolvedValue({ status: "declined" });
    const onDone = vi.fn();
    render(withClient(<DeclineReasonForm meetingId={66} onCancel={() => {}} onDone={onDone} />));
    fireEvent.change(screen.getByLabelText(/Reason for declining/), { target: { value: "  On site all day  " } });
    fireEvent.click(screen.getByRole("button", { name: "Decline meeting" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(patchData).toHaveBeenCalledWith({
      url: "meetings/66/rsvp/",
      data: { status: "declined", reason: "On site all day" },
    });
  });

  it("shows the server's reason when the decline is refused", async () => {
    patchData.mockRejectedValue({ response: { data: { error: "This meeting is no longer open for replies." } } });
    render(withClient(<DeclineReasonForm meetingId={66} onCancel={() => {}} />));
    fireEvent.change(screen.getByLabelText(/Reason for declining/), { target: { value: "Clash" } });
    fireEvent.click(screen.getByRole("button", { name: "Decline meeting" }));
    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith("This meeting is no longer open for replies."));
  });
});

describe("Declining from the meetings list", () => {
  const INVITE = {
    id: 66, title: "Site coordination", status: "scheduled", artefact_status: "none",
    date: "2026-12-01", time: "9:00 AM", date_time: "December 01 2026 • 9:00 AM",
    location: "Site office", attendees: [], extra_attendees: 0, ai_notes: false, my_rsvp: "invited",
  };

  it("asks for a reason first, and the dialog doesn't open the meeting", async () => {
    fetchData.mockResolvedValue({ count: 1, next: null, previous: null, results: [INVITE] });
    patchData.mockResolvedValue({ status: "declined" });
    render(withClient(
      <MemoryRouter initialEntries={["/meetings"]}>
        <Routes>
          <Route path="/meetings" element={<MeetingsList />} />
          <Route path="/meetings/:id" element={<p>MEETING PAGE</p>} />
        </Routes>
      </MemoryRouter>,
    ));

    // Exactly "Decline": the "Declined" filter tab is a button too.
    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    // Nothing is sent until a reason is given.
    expect(patchData).not.toHaveBeenCalled();
    const box = screen.getByLabelText(/Reason for declining/);
    fireEvent.click(box);
    fireEvent.change(box, { target: { value: "Clash with the safety audit" } });
    fireEvent.click(screen.getByRole("button", { name: "Decline meeting" }));

    await vi.waitFor(() =>
      expect(patchData).toHaveBeenCalledWith({
        url: "meetings/66/rsvp/",
        data: { status: "declined", reason: "Clash with the safety audit" },
      }),
    );
    expect(screen.queryByText("MEETING PAGE")).not.toBeInTheDocument();
  });
});

describe("Attendees panel", () => {
  it("shows who declined and why", () => {
    const meeting: SidePanelMeeting = {
      id: 66, project: 47, status: "scheduled", date_display: "December 01, 2026", time: "9:00 AM",
      location: "", attendees: [1, 7], is_organiser: false,
      attendee_responses: [
        { user_id: 1, name: "Arif", email: "arif@example.com", rsvp_status: "accepted", responded_at: null, is_organiser: true },
        { user_id: 7, name: "Test PM", email: "pm@example.com", rsvp_status: "declined", responded_at: null, decline_reason: "Clash with the safety audit", is_organiser: false },
      ],
    };
    render(withClient(<MeetingSidePanel meeting={meeting} onEdit={() => {}} onChanged={() => {}} />));
    const row = screen.getByTestId("attendee-7");
    expect(row).toHaveTextContent("Declined");
    expect(row).toHaveTextContent("Reason: Clash with the safety audit");
    expect(screen.getByTestId("attendee-1")).not.toHaveTextContent("Reason");
  });
});
