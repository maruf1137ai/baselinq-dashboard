/**
 * The Meetings list shows every meeting, not the first page of them.
 *
 * `meetings/` is paged by the server at twenty. The list read one response,
 * so a project's 21st meeting was missing and the "All 20" filter count read
 * as the project's total.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchData = vi.fn();

vi.mock("@/lib/Api", () => ({
  fetchData: (url: string) => fetchData(url),
  postData: vi.fn(),
}));
vi.mock("@/hooks/useMeetingUnreadNotifications", () => ({
  useMeetingUnreadNotifications: () => ({ unreadByMeetingId: {} }),
}));

import MeetingsList from "@/components/meetings/meetingList";

const meeting = (id: number) => ({
  id,
  title: `Site meeting ${id}`,
  status: "scheduled",
  artefact_status: "none",
  date: "2026-12-01",
  time: "09:00",
  date_time: "1 Dec 2026, 09:00",
  location: "Site office",
  attendees: [],
  extra_attendees: 0,
  ai_notes: false,
  my_rsvp: null,
});
const MEETINGS = Array.from({ length: 25 }, (_, i) => meeting(i + 1));

function serve(url: string) {
  const n = Number(new URLSearchParams(url.split("?")[1]).get("page") || "1");
  return Promise.resolve({
    count: 25,
    next: n === 1 ? "http://api/next" : null,
    previous: null,
    results: n === 1 ? MEETINGS.slice(0, 20) : MEETINGS.slice(20),
  });
}

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
  fetchData.mockImplementation(serve);
  localStorage.setItem("selectedProjectId", "9");
});

describe("Meetings list paging", () => {
  it("lists the meetings on every page", async () => {
    renderList();
    expect(await screen.findByText("Site meeting 25")).toBeInTheDocument();
    expect(screen.getByText("Site meeting 1")).toBeInTheDocument();
    expect(fetchData).toHaveBeenCalledWith("meetings/?project_id=9&page_size=100&page=2");
  });

  it("counts every meeting in the filters", async () => {
    renderList();
    const all = await screen.findByRole("button", { name: /^All/ });
    await waitFor(() => expect(all).toHaveTextContent("25"));
  });

  it("says so when the meetings could not be loaded, and retries", async () => {
    fetchData.mockImplementation(() => Promise.reject(new Error("500")));
    renderList();
    expect(await screen.findByText("Meetings couldn't be loaded.")).toBeInTheDocument();
    expect(screen.queryByText("No meetings scheduled yet")).not.toBeInTheDocument();

    fetchData.mockImplementation(serve);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Site meeting 25")).toBeInTheDocument();
  });
});
