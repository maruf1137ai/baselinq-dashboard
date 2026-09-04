/**
 * The summary strip and the setup row — what each of them is allowed to say.
 *
 * Neither block had a component test before this. Both were changed together
 * (the setup percentage moved out of the strip and into the setup row, and the
 * strip took the commercial position in its place), and the two facts most
 * worth pinning are the ones a later edit would quietly undo:
 *
 *  1. **The percentage lives with the setup list, not beside the project
 *     name.** Next to a project name a bare percentage reads as build
 *     progress. It is record completeness, and it belongs against the list of
 *     what is still missing, which is the only context that says so.
 *
 *  2. **The money is never rendered without `finance.view`.** `useHomeData`
 *     does not request it, but the strip must also not print a zero, a dash,
 *     or an empty "Budget" label when the figures are absent — a labelled hole
 *     still tells a contractor what they are not being shown.
 *
 * And one distinction that is easy to lose in a copy-edit: a project with
 * nothing certified says so in words. "R 0,00 certified" is a different claim
 * from "nothing has been certified yet", and only the second one is true.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ProjectSummaryBlock, SetupLineBlock } from "@/components/home/blocks";

const PROJECT = { name: "Hello baselinq", projectNumber: "PRJ-043", location: "Cape Town" };

const STATS = { percentage: 14, filledCount: 1, totalCount: 7, missing: ["Budget Allocation"] };

const MONEY_NONE = {
  contractSum: null,
  revisedContractSum: null,
  certified: null,
  balance: null,
  certifiedPct: null,
};

const MONEY_FULL = {
  contractSum: 12_000_000,
  revisedContractSum: 12_400_000,
  certified: 1_736_000,
  balance: 10_664_000,
  certifiedPct: 14,
};

function baseData(over: Record<string, unknown> = {}) {
  return {
    project: PROJECT,
    projectStats: STATS,
    time: { hasDates: false, remainingDays: null },
    money: MONEY_NONE,
    canViewFinance: false,
    canEditProject: true,
    myActions: [],
    ...over,
  } as never;
}

const renderStrip = (over = {}) =>
  render(
    <MemoryRouter>
      <ProjectSummaryBlock data={baseData(over)} />
    </MemoryRouter>,
  );

describe("the project summary strip", () => {
  it("does not carry the setup percentage any more", () => {
    // It moved to the setup row. Beside a project name it reads as progress.
    renderStrip();
    expect(screen.queryByText(/14%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Setup .*complete/i)).not.toBeInTheDocument();
  });

  it("shows budget, certified and remaining with finance access", () => {
    renderStrip({ canViewFinance: true, money: MONEY_FULL });
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText(/· Certified/)).toBeInTheDocument();
    expect(screen.getByText(/· Remaining/)).toBeInTheDocument();
    expect(screen.getByText(/\(14%\)/)).toBeInTheDocument();
  });

  it("renders no money at all without finance access", () => {
    // The figures are absent, not zeroed — and the LABEL must go with them.
    renderStrip({ canViewFinance: false, money: MONEY_FULL });
    expect(screen.queryByText("Budget")).not.toBeInTheDocument();
    expect(screen.queryByText(/Certified/)).not.toBeInTheDocument();
  });

  it("says nothing is certified rather than printing a zero", () => {
    renderStrip({
      canViewFinance: true,
      money: { ...MONEY_FULL, certified: null, balance: null, certifiedPct: null },
    });
    expect(screen.getByText(/nothing certified yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/· Certified/)).not.toBeInTheDocument();
  });
});

describe("the setup row", () => {
  const renderSetup = (over = {}) =>
    render(
      <MemoryRouter>
        <SetupLineBlock
          data={baseData(over)}
          onOpen={() => {}}
          onOpenSection={() => {}}
        />
      </MemoryRouter>,
    );

  it("carries the setup percentage, beside what is still missing", () => {
    renderSetup();
    expect(screen.getByText("14%")).toBeInTheDocument();
    expect(screen.getByText(/still to add/)).toBeInTheDocument();
  });

  it("still says which of the seven fields are done", () => {
    renderSetup();
    expect(screen.getByText(/1 of 7/)).toBeInTheDocument();
  });

  it("draws nothing once setup is complete", () => {
    const { container } = renderSetup({
      projectStats: { percentage: 100, filledCount: 7, totalCount: 7, missing: [] },
    });
    expect(container).toBeEmptyDOMElement();
  });
});
