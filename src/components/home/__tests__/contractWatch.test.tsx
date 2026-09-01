/**
 * The Contract-watch switcher, at the render level.
 *
 * Three panels folded into one behind a segmented control, and a segmented
 * control is a place where two failures hide easily:
 *
 *   1. A tab a role may not populate is drawn disabled or empty rather than
 *      omitted. `RiskConditionBlock` renders nothing without `compliance.view`
 *      because "no open risk signals" is an all-clear addressed to the one
 *      viewer with no way to check it — and a greyed tab labelled "Risk"
 *      leaks exactly the fact the panel withholds. The tab must go with the
 *      panel, and only a DOM assertion catches it.
 *
 *   2. Something already overdue sits behind a tab nobody presses. The whole
 *      argument for folding the panels is that it costs a reader less; it
 *      costs them more if the gravest item is now one click further away.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ContractWatchBlock } from "../ContractWatch";
import type { HomeData } from "@/hooks/useHomeData";

const overdueCertificate = {
  key: "cert-1",
  kind: "certificate",
  headline: "Payment certificate 007 is unpaid",
  detail: null,
  consequence: "money",
  pressure: "breach",
  daysRemaining: -6,
  clock: null,
  date: "2026-08-01",
  overdue: true,
  href: "/finance",
  action: "Open",
  requires: [],
};

function homeData(over: Partial<HomeData>): HomeData {
  return {
    isLoading: false,
    loadIssue: { level: "none" },
    queue: [overdueCertificate],
    upcomingMeetings: [],
    riskGroups: [],
    riskCounts: { total: 0 },
    riskUnavailable: false,
    canViewCompliance: false,
    canViewFinance: false,
    myActions: [],
    ...over,
  } as unknown as HomeData;
}

const draw = (data: HomeData) =>
  render(
    <MemoryRouter>
      <ContractWatchBlock data={data} projectId={45} />
    </MemoryRouter>,
  );

const tabNames = () =>
  screen.getAllByRole("tab").map((t) => (t.textContent ?? "").replace(/\s+/g, " ").trim());

describe("ContractWatchBlock", () => {
  it("offers no Risk segment to a viewer without compliance.view", () => {
    draw(homeData({ canViewCompliance: false }));
    expect(tabNames().some((n) => /risk/i.test(n))).toBe(false);
  });

  it("offers Risk once compliance.view is held", () => {
    draw(
      homeData({
        canViewCompliance: true,
        riskCounts: { total: 4 } as HomeData["riskCounts"],
      }),
    );
    expect(tabNames().some((n) => /risk/i.test(n))).toBe(true);
  });

  it("drops the Risk segment when the risk engine did not answer", () => {
    // An outage must not present as a populated tab reading zero.
    draw(homeData({ canViewCompliance: true, riskUnavailable: true }));
    expect(tabNames().some((n) => /risk/i.test(n))).toBe(false);
  });

  it("opens on the segment holding something already overdue", () => {
    draw(
      homeData({
        canViewCompliance: true,
        riskCounts: { total: 9 } as HomeData["riskCounts"],
      }),
    );
    const selected = screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true");
    expect(selected?.textContent ?? "").toMatch(/needs you/i);
  });

  it("states a zero count rather than omitting it", () => {
    // "Meetings 0" says the diary was read and is empty. A missing number
    // leaves the reader to press the tab to find out.
    draw(homeData({}));
    expect(tabNames().some((n) => /meetings\s*0/i.test(n))).toBe(true);
  });
});
