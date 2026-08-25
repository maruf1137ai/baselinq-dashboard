/**
 * /programme?milestone=<milestoneId>.
 *
 * The link opens the Milestones tab and marks the phase it names. What it must
 * never do is narrow the list: a phase that has been deleted, or one on a
 * project this viewer is not a member of, has to leave the programme looking
 * exactly as it does with no parameter — every phase still listed, nothing
 * marked, no error. A programme page that showed one row (or none) because a
 * link was stale would be read as the project's actual programme.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseMilestones = vi.fn();

vi.mock("@/hooks/useMilestones", () => ({
  useMilestones: () => mockUseMilestones(),
  useUpdateMilestone: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMilestone: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useRiskForecast", () => ({
  useRiskForecast: () => ({ data: null, isLoading: false }),
}));
vi.mock("@/components/programme/timeline", () => ({
  default: () => <div data-testid="timeline" />,
}));
vi.mock("@/components/programme/AddPhaseDialog", () => ({
  AddPhaseDialog: () => null,
}));
vi.mock("@/components/programme/AcceptBaselineDialog", () => ({
  AcceptBaselineDialog: () => null,
}));

import Window from "@/components/programme/window";

const phase = (id: string, name: string) => ({
  _id: id,
  projectId: "1",
  name,
  startDate: "2026-01-05",
  endDate: "2026-03-30",
  status: "planned" as const,
  percentComplete: null,
  baselineStart: null,
  baselineEnd: null,
  actualEnd: null,
  createdBy: { userId: null, name: null },
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});

const PHASES = [phase("m1", "Earthworks"), phase("m2", "Superstructure")];

const renderProgramme = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Window />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("selectedProjectId", "1");
  mockUseMilestones.mockReturnValue({ data: PHASES, isLoading: false });
});

describe("/programme?milestone=", () => {
  it("opens the Schedule tab as before when there is no parameter", () => {
    renderProgramme("/programme");
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
    expect(screen.queryByText("Earthworks")).not.toBeInTheDocument();
  });

  it("opens the Milestones tab and marks the phase the link names", () => {
    renderProgramme("/programme?milestone=m2");

    const row = screen.getByText("Superstructure").closest("[data-highlighted]");
    expect(row).not.toBeNull();
    expect(screen.getByText("Earthworks").closest("[data-highlighted]")).toBeNull();
  });

  it("scrolls the named phase into view", () => {
    const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, "scrollIntoView");
    renderProgramme("/programme?milestone=m1");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("shows the whole programme, unmarked, when the id is stale", () => {
    renderProgramme("/programme?milestone=deleted-phase");

    // Both phases still listed. Nothing highlighted. No error surface.
    expect(screen.getByText("Earthworks")).toBeInTheDocument();
    expect(screen.getByText("Superstructure")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it("shows the whole programme when the phase is one this viewer's list did not return", () => {
    // Indistinguishable from a stale id on the client, and deliberately
    // treated the same: the page says nothing at all about the phase rather
    // than implying it does not exist.
    mockUseMilestones.mockReturnValue({ data: [PHASES[0]], isLoading: false });

    renderProgramme("/programme?milestone=m2");

    expect(screen.getByText("Earthworks")).toBeInTheDocument();
    expect(document.querySelector("[data-highlighted]")).toBeNull();
  });

  it("does not claim an empty programme when the list has not loaded", () => {
    // The "Open risk signals 0" failure in miniature: an in-flight list must
    // not be reported as an absence.
    mockUseMilestones.mockReturnValue({ data: [], isLoading: true });

    renderProgramme("/programme?milestone=m1");

    expect(screen.getByText("Loading phases...")).toBeInTheDocument();
    expect(screen.queryByText("No programme phases yet")).not.toBeInTheDocument();
  });
});
