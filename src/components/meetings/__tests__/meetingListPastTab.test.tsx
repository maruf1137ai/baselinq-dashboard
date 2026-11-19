/**
 * A meeting whose time has passed is not "Upcoming".
 *
 * Bug (19 Nov 2026): a meeting on 4 Sep with no link was still listed under
 * Upcoming with a "Scheduled" badge in November. The server now reports such
 * a meeting as `awaiting_outcome`; the list must put it under Past, not Upcoming.
 */
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  postData: vi.fn(),
  patchData: vi.fn(),
}));
vi.mock("@/hooks/useMeetingUnreadNotifications", () => ({
  useMeetingUnreadNotifications: () => ({ unreadByMeetingId: {} }),
}));

import MeetingsList from "@/components/meetings/meetingList";

const base = {
  artefact_status: "none",
  time: "9:00 AM",
  location: "Site office",
  attendees: [],
  extra_attendees: 0,
  ai_notes: false,
  my_rsvp: null,
};
const MEETINGS = [
  { ...base, id: 1, title: "September site meeting", status: "awaiting_outcome", date: "2026-09-04", date_time: "September 04 2026 • 12:45 AM" },
  { ...base, id: 2, title: "December site meeting", status: "scheduled", date: "2026-12-01", date_time: "December 01 2026 • 9:00 AM" },
];

function renderList() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <MeetingsList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchData.mockReset();
  fetchData.mockResolvedValue({ count: 2, next: null, previous: null, results: MEETINGS });
  localStorage.setItem("selectedProjectId", "9");
});

describe("Meetings list — past meetings", () => {
  it("counts a past meeting under Past, not Upcoming", async () => {
    renderList();
    await screen.findByText("September site meeting");
    expect(screen.getByRole("button", { name: /^Upcoming/ })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /^Past/ })).toHaveTextContent("1");
  });

  it("shows only the future meeting on the Upcoming tab", async () => {
    renderList();
    await screen.findByText("September site meeting");
    fireEvent.click(screen.getByRole("button", { name: /^Upcoming/ }));
    expect(screen.getByText("December site meeting")).toBeInTheDocument();
    expect(screen.queryByText("September site meeting")).not.toBeInTheDocument();
  });

  it("shows the past meeting on the Past tab with an Awaiting outcome badge", async () => {
    renderList();
    await screen.findByText("September site meeting");
    fireEvent.click(screen.getByRole("button", { name: /^Past/ }));
    const card = screen.getByText("September site meeting").closest("a") as HTMLElement;
    expect(within(card).getByText("Awaiting outcome")).toBeInTheDocument();
    expect(within(card).queryByText("Scheduled")).not.toBeInTheDocument();
    expect(screen.queryByText("December site meeting")).not.toBeInTheDocument();
  });
});
