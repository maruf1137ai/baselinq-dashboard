/**
 * What a contractor's homepage actually renders.
 *
 * ── Why this test is at the RENDER level ─────────────────────────────────
 *
 * The gates themselves are already tested as pure functions —
 * `resolveFinanceAccess`, `filterQueueByPermission` and `visibleRiskSignals`
 * in `homeSignals.test.ts`, `buildChangeFeed` in `homeVisuals.test.ts`, and
 * `buildKeyIndicators` in `projectPosition.test.ts`, which asserts that a
 * viewer without `finance.view` gets no output matching `/r\s?\d/`.
 *
 * Every one of those checks a FUNCTION. None of them checks the SCREEN. A
 * panel can hold a correctly-filtered list and still print a rand figure in
 * its heading, its footnote, its empty state or a `title` attribute — and the
 * visual band added four new places for exactly that to happen: a headline
 * figure, a comparison line, a footnote and a tooltip, in every zone.
 *
 * So this asserts against the rendered DOM of every new panel: the band in
 * both of its layouts, and the "What changed" feed. The rule it enforces is
 * the one the page has always claimed —
 *
 *   **A viewer without `finance.view` sees no rand figure and none of the
 *   words "certified", "retention" or "variation" anywhere on the homepage.**
 *
 * `title` attributes are included in the sweep deliberately: the band moves
 * several caveats onto tooltips, and a caveat is exactly the kind of prose
 * that mentions a contract sum in passing.
 */
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { StatusBandBlock } from "../StatusBand";
import { WhatChangedBlock } from "../WhatChanged";
import {
  buildCertificateChanges,
  buildCertifiedCurve,
  buildChangeFeed,
  buildContractTimeline,
  buildMilestoneChanges,
  buildNoticeChanges,
  buildVariationChanges,
  splitChangeByStatus,
  summariseChangePosition,
  summariseMilestoneDrift,
} from "@/lib/homeVisuals";
import { summariseMoney, summariseTime } from "@/lib/homeSignals";
import { buildCertificateRun, retentionPosition, summariseVariations } from "@/lib/homeIndicators";
import type { HomeData } from "@/hooks/useHomeData";

// ── The fixture: a real project, with money on it ─────────────────────────
//
// Deliberately a project where every gated figure is NON-ZERO and non-null.
// A contractor's screen staying clean because there was nothing to leak would
// prove nothing.

const PROJECT = {
  startDate: "2026-01-01",
  endDate: "2026-10-31",
  contractEndDate: "2026-12-31",
  contractValue: 10_000_000,
  retentionRate: 5,
};

const CERTIFICATES = [
  { id: 1, pcNumber: "PC-001", certificateDate: "2026-03-20", claimAmount: 1_400_000, retentionAmount: 70_000, workflowState: "posted", postedAt: "2026-03-21T09:00:00Z" },
  { id: 2, pcNumber: "PC-002", certificateDate: "2026-04-19", claimAmount: 1_850_000, retentionAmount: 92_500, workflowState: "posted", postedAt: "2026-04-20T09:00:00Z" },
  { id: 3, pcNumber: "PC-003", certificateDate: "2026-05-19", claimAmount: 2_100_000, retentionAmount: 105_000, workflowState: "posted", postedAt: "2026-05-20T09:00:00Z", updatedAt: "2026-06-10T09:00:00Z" },
  // Undated and in flight — the two disclosures the curve owes the reader.
  { id: 4, pcNumber: "PC-004", certificateDate: null, claimAmount: 900_000, retentionAmount: 45_000, workflowState: "posted" },
  { id: 5, pcNumber: "PC-005", certificateDate: "2026-06-18", claimAmount: 1_600_000, retentionAmount: 80_000, workflowState: "submitted" },
];

const VARIATIONS = [
  { ref: "VO-001", status: "Approved", value: 450_000, dateInstructed: "2026-02-10", approvedAt: "2026-02-20T09:00:00Z", updatedAt: "2026-02-20T09:00:00Z" },
  { ref: "VO-002", status: "Under Review", value: 220_000, dateInstructed: null, approvedAt: null, updatedAt: "2026-06-01T09:00:00Z" },
  { ref: "VO-003", status: "Draft", value: 90_000, dateInstructed: "2026-05-02", approvedAt: null, updatedAt: "2026-05-02T09:00:00Z" },
];

const MILESTONES = [
  { _id: "m1", name: "Foundations", baselineEnd: "2026-03-01", endDate: "2026-03-01", actualEnd: "2026-03-15", updatedAt: "2026-03-16T09:00:00Z", status: "completed" },
  { _id: "m2", name: "Frame", baselineEnd: "2026-06-01", endDate: "2026-06-20", updatedAt: "2026-05-30T09:00:00Z", status: "in_progress" },
  { _id: "m3", name: "Roof", endDate: "2026-09-01", updatedAt: "2026-05-30T09:00:00Z", status: "planned" },
];

const TIME_BARS = [
  { id: 7, label: "VO-002 delay notice", status: "served", served_at: "2026-06-02T09:00:00Z", clause_ref: "26.1" },
];

const NOW = new Date("2026-06-15T09:00:00Z");

/**
 * The band's slice of `HomeData`, built through the SAME functions the hook
 * calls — not hand-written literals. A fixture that hard-codes what the hook
 * is expected to produce cannot catch a builder that starts leaking.
 */
function homeData(gates: { canViewFinance: boolean; canViewCompliance: boolean }): HomeData {
  const { canViewFinance, canViewCompliance } = gates;

  // The gate is a FETCH gate first: without finance.view the hook never
  // requests certificates or variations, so the lists are empty here too.
  // The permission filter is the second line of defence, not the only one.
  const certificates = canViewFinance ? CERTIFICATES : [];
  const variations = canViewFinance ? VARIATIONS : [];

  const money = summariseMoney(
    canViewFinance ? PROJECT : undefined,
    certificates,
    variations.map((v) => ({ status: v.status, grandTotal: v.value })),
  );
  const time = summariseTime(PROJECT, NOW);
  const run = buildCertificateRun(certificates);
  const tolerancePct = canViewFinance && canViewCompliance ? 3 : null;

  return {
    canViewFinance,
    canViewCompliance,
    money,
    time,
    timeline: buildContractTimeline(time, NOW),
    milestoneDrift: summariseMilestoneDrift(MILESTONES),
    certifiedCurve: buildCertifiedCurve(run, money.revisedContractSum),
    changePosition: summariseChangePosition(
      variations,
      money.contractSum,
      money.variations,
      tolerancePct,
    ),
    changeSplit: splitChangeByStatus(variations),
    // `now` is threaded into every builder AND into the feed: significance
    // sets an event's shelf life and recency decides whether it is still on
    // the shelf, so a fixture dated in 2026 read against the real clock ages
    // out of its own feed and the test would prove nothing.
    changeFeed: buildChangeFeed(
      [
        buildCertificateChanges(certificates, NOW),
        buildVariationChanges(variations, NOW),
        buildNoticeChanges(TIME_BARS, NOW),
        buildMilestoneChanges(MILESTONES, NOW),
      ],
      { canViewFinance, canViewCompliance },
      { now: NOW, limit: 6 },
    ),
    retention: retentionPosition(canViewFinance ? PROJECT : undefined, money.retentionHeld),
    variationPosition: summariseVariations(variations),
    variationsTruncated: false,
  } as unknown as HomeData;
}

function draw(data: HomeData) {
  const { container } = render(
    <MemoryRouter>
      <StatusBandBlock data={data} />
      <WhatChangedBlock feed={data.changeFeed} />
    </MemoryRouter>,
  );
  // Visible text PLUS every tooltip, because the band moves several caveats
  // onto `title` and a caveat is prose that can mention a contract sum.
  const titles = Array.from(container.querySelectorAll("[title]"))
    .map((el) => el.getAttribute("title") ?? "")
    .join(" ");
  return `${container.textContent ?? ""} ${titles}`;
}

/** The visible face of the band only, with tooltips excluded. */
function visible(data: HomeData) {
  const { container } = render(
    <MemoryRouter>
      <StatusBandBlock data={data} />
    </MemoryRouter>,
  );
  return container.textContent ?? "";
}

// ── The contractor ────────────────────────────────────────────────────────

describe("a contractor without finance.view", () => {
  const text = () => draw(homeData({ canViewFinance: false, canViewCompliance: true }));

  it("sees no rand figure anywhere on the band or the feed", () => {
    // `formatZAR` renders "R 8 200 000,00". Any "R" followed by a digit,
    // with or without the space, is a leak.
    expect(text()).not.toMatch(/R\s?\d/);
  });

  it("sees none of the gated words, in text or in a tooltip", () => {
    const t = text().toLowerCase();
    for (const word of ["certified", "certificate", "retention", "variation", "contract sum", "tolerance"]) {
      expect(t).not.toContain(word);
    }
  });

  it("gets a COMPLETE band rather than one with holes in it", () => {
    const t = text();
    // The two zones they are entitled to, both populated.
    expect(t).toContain("Time");
    expect(t).toContain("Programme");
    // And the programme zone carries real milestone content, not a placeholder.
    expect(t).toContain("Foundations");
    expect(t).toMatch(/\d+ days/);
    // Nothing anywhere says a panel was withheld.
    expect(t.toLowerCase()).not.toContain("no permission");
    expect(t.toLowerCase()).not.toContain("restricted");
    expect(t.toLowerCase()).not.toContain("hidden");
  });

  it("still sees the contract dates — dates are not money", () => {
    // A contractor who may not see the contract sum still has to know when
    // the works are due.
    expect(text()).toContain("2026");
  });

  it("gets a change feed with the non-financial events still in it", () => {
    const t = text();
    // The programme moved, and a contractor is entitled to know it did.
    expect(t).toContain("Frame moved out to 20 Jun 2026");
    expect(t).toContain("Baseline was 1 Jun 2026");
    // Nothing financial reaches it: no certificate, no variation. Note the
    // served time bar is not here either, and not because of a gate — nothing
    // on `projects/{id}/time-bars/` says WHEN it was served, so it is counted
    // into the disclosure instead of being dated from something else.
    expect(t).not.toContain("PC-");
    expect(t).not.toContain("VO-");
    expect(t).toContain("carry no date");
  });
});

// ── The same viewer, with neither gate ────────────────────────────────────

describe("a viewer with neither finance.view nor compliance.view", () => {
  const text = () => draw(homeData({ canViewFinance: false, canViewCompliance: false }));

  it("sees no rand figure and no gated word", () => {
    expect(text()).not.toMatch(/R\s?\d/);
    const t = text().toLowerCase();
    for (const word of ["certified", "retention", "variation", "risk signal"]) {
      expect(t).not.toContain(word);
    }
  });

  it("still gets the time and programme zones", () => {
    expect(text()).toContain("Time");
    expect(text()).toContain("Programme");
  });
});

// ── The PM, as the control ────────────────────────────────────────────────
//
// Without this the tests above would pass on a band that renders nothing at
// all, which is the classic way a gating test goes green for the wrong reason.

describe("a project manager holding both gates", () => {
  const text = () => draw(homeData({ canViewFinance: true, canViewCompliance: true }));

  it("DOES see the money and change zones the contractor does not", () => {
    const t = text();
    expect(t).toContain("Money");
    expect(t).toContain("Change");
    expect(t).toMatch(/R\s?\d/);
    expect(t.toLowerCase()).toContain("certified");
    expect(t.toLowerCase()).toContain("retention");
  });

  it("declares what the certified curve could not plot", () => {
    // One undated certificate and one submitted. Both are real, neither is on
    // the curve, and the zone says so.
    expect(text()).toContain("1 undated, not plotted");
    expect(text().toLowerCase()).toContain("in flight");
  });

  it("declares variations with no instruction date", () => {
    expect(text()).toContain("1 with no instruction date");
  });

  it("words the VO tolerance as a tolerance and NEVER as a breach", () => {
    // `risk/rules/vo_tolerance.py` sets `contractual: False` deliberately:
    // no JBCC, NEC, FIDIC or GCC clause is breached at the threshold.
    const face = visible(homeData({ canViewFinance: true, canViewCompliance: true })).toLowerCase();
    expect(face).toContain("the 3% tolerance");
    // The face of the zone never uses the word. The server's rule is named
    // "VO_TOLERANCE_BREACH" and its title says "breach", and neither reaches
    // the reader here.
    expect(face).not.toContain("breach");

    // The tooltip DOES use the word — once, to deny it. That sentence is the
    // rule's own `basis_note` and is the reason the face may stay silent.
    const tips = Array.from(
      render(
        <MemoryRouter>
          <StatusBandBlock data={homeData({ canViewFinance: true, canViewCompliance: true })} />
        </MemoryRouter>,
      ).container.querySelectorAll("[title]"),
    )
      .map((el) => el.getAttribute("title") ?? "")
      .join(" ");
    expect(tips).toContain("no JBCC, NEC, FIDIC or GCC clause is breached at it");
  });

  it("sees the financial change events the contractor does not", () => {
    const t = text();
    expect(t).toContain("PC-003 posted");
    expect(t).toContain("VO-002 under review");
  });
});
