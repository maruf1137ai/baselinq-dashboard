/**
 * The checked analysis is appended to Linq's opening message as a few lines, not as a second
 * message and not as a dump of every field. It says what the analysis concluded, how far its
 * citations could be trusted, and the one or two things that need acting on.
 */
import { describe, expect, it } from "vitest";

import { analysisSummary, citationLine, titleCase } from "../analysisMarkdown";

const voResult = {
  analysis: {
    vo_id: "VO-081",
    overall_status: "REVIEW_REQUIRED",
    risk_level: "HIGH",
    summary: "The variation order VO-081 involves the installation of a rooftop solar PV array.",
    validation: { counts: { verified: 7 } },
    deadline_status: {
      is_overdue: true, days_overdue: 44, due_date: "2026-08-26",
      message: "Task is 44 days overdue. Immediate action required.",
    },
    risk_flags: [
      { title: "Unverified Rates", severity: "MEDIUM", description: "Rates cannot be verified." },
      { title: "Overdue Task", severity: "HIGH", description: "The task is overdue by 44 days." },
    ],
    // Everything below used to be printed in full. It must not appear now.
    procedural_compliance: { authorized_issuer: { status: "NON_COMPLIANT", finding: "Cannot be verified." } },
    valuation_assessment: { applicable_method: { method: "Other", clause_reference: "26.2" } },
    contract_citations: [{ clause_number: "23.4.2", clause_title: "Notification of Delay" }],
    recommendations: { for_employer: ["Ensure timely review of variation orders."] },
  },
  mock_used: false,
  cached: false,
  model_name: "gpt-4o",
};

const summary = (over: Record<string, unknown> = {}, type = "VO") =>
  analysisSummary({ ...voResult, ...over }, type);

describe("analysisSummary", () => {
  it("is a handful of lines: verdict, citations, what to act on", () => {
    const out = summary();
    expect(out).toContain("**Checked verdict — VO-081:** REVIEW REQUIRED · HIGH RISK");
    expect(out).toContain("7 of 7 clause citations verified in your contract.");
    expect(out).toContain("Task is 44 days overdue. Immediate action required.");
    expect(out.split("\n").filter(Boolean).length).toBeLessThanOrEqual(4);
  });

  it("leaves the long detail out — that is a question away in the same chat", () => {
    const out = summary();
    expect(out).not.toContain("Procedural Compliance");
    expect(out).not.toContain("Valuation Assessment");
    expect(out).not.toContain("Contract Citations");
    expect(out).not.toContain("Notification of Delay");
    expect(out).not.toContain("Ensure timely review");
    expect(out).not.toContain("rooftop solar PV array");   // the welcome already says this
  });

  it("names the worst risk first", () => {
    const out = summary();
    expect(out).toContain("Overdue Task (HIGH)");
    // With a deadline already reported, only the single worst flag joins it.
    expect(out).not.toContain("Unverified Rates");
  });

  it("names two flags when there is no deadline to report", () => {
    const { deadline_status, ...analysis } = voResult.analysis;
    void deadline_status;
    const out = analysisSummary({ ...voResult, analysis }, "VO");
    expect(out).toContain("Overdue Task (HIGH)");
    expect(out).toContain("Unverified Rates (MEDIUM)");
  });

  it("takes a risk flag that is a bare string", () => {
    const out = analysisSummary({
      analysis: { si_id: "SI-052", overall_status: "COMPLIANT", risk_level: "LOW",
        risk_flags: ["Night work permit may be required"] },
    }, "SI");
    expect(out).toContain("Night work permit may be required");
    expect(out).not.toContain("undefined");
  });

  it("flags a demo result", () => {
    expect(summary({ mock_used: true })).toContain("Demo result — AI is not configured");
    expect(summary()).not.toContain("Demo result");
  });

  it("falls back to the task type when the analysis carries no id", () => {
    expect(analysisSummary({ analysis: { overall_status: "COMPLIANT" } }, "RFI"))
      .toContain("**Checked verdict — RFI:** COMPLIANT");
  });

  it("returns nothing when there is no analysis", () => {
    expect(analysisSummary(null)).toBe("");
    expect(analysisSummary({ analysis: null })).toBe("");
  });
});

describe("citationLine", () => {
  it("words the count exactly as the on-screen banner does", () => {
    expect(citationLine({ counts: { verified: 2, unverified: 1 }, invalid_citations: ["99.9"] }))
      .toBe("2 of 3 clause citations verified in your contract · 1 not found in your contract. "
        + "Not found: 99.9 — check before relying on them.");
    expect(citationLine({ counts: { verified: 1 } }))
      .toBe("1 of 1 clause citation verified in your contract.");
    expect(citationLine({ counts: {} })).toBe("");
    expect(citationLine(null)).toBe("");
  });
});

describe("titleCase", () => {
  it("reads a backend key as a heading, keeping construction shorthand upper-case", () => {
    expect(titleCase("procedural_compliance")).toBe("Procedural Compliance");
    expect(titleCase("eot_entitlement")).toBe("EOT Entitlement");
    expect(titleCase("vo_implications")).toBe("VO Implications");
  });
});
