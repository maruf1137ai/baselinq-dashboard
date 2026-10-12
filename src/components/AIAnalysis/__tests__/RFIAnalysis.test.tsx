/**
 * Part 7: every clause reference in the RFI analysis carries its verification status. The real model put its
 * two verified citations under contract_compliance (authority_to_respond, communication_protocol), which the
 * modal shows on the "Compliance" tab; implications and linked references carry badges too.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RFIAnalysis } from "../RFIAnalysis";

// The shape the real model returned for RFI 244 (2026-10-08), trimmed.
const data = {
  rfi_id: "RFI-017",
  summary: "Rebar lap length clarification.",
  risk_level: "LOW",
  overall_assessment: "Answerable from the contract.",
  rfi_categorization: { information_type: "Clarification", discipline_relevance: "Structural", urgency_level: "Medium" },
  contract_compliance: {
    authority_to_respond: { status: "COMPLIANT", finding: "The engineer responds.", clause_reference: "5.1",
      citation_status: "verified", authorized_party: "Engineer" },
    communication_protocol: { status: "COMPLIANT", finding: "In writing.", clause_reference: "1.3",
      citation_status: "verified" },
    response_timeline: { status: "PENDING", finding: "Not stated.", clause_reference: null, citation_status: "not_cited" },
  },
  potential_implications: {
    design_change: { likely: false, assessment: "None.", clause_reference: "99.9", citation_status: "unverified" },
  },
  contract_citations: [{ clause_number: "5.1", clause_title: "Engineer", page_number: 4, citation_status: "verified" }],
  risk_flags: [],
  validation: { valid: true, total_citations: 2, invalid_citations: [], counts: { verified: 2 } },
};

describe("RFIAnalysis citation badges", () => {
  it("badges the compliance checks the real model cited", () => {
    const { container } = render(<RFIAnalysis data={data} visibleSections={20} />);
    fireEvent.click(screen.getByText("Compliance"));
    const verified = container.querySelectorAll("[data-citation-status='verified']");
    expect(verified.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll("[data-citation-status='not_cited']").length).toBe(0);  // honest "not available": no badge
  });

  it("badges implications and linked references too", () => {
    const { container } = render(<RFIAnalysis data={data} visibleSections={20} />);
    fireEvent.click(screen.getByText("Impact & Actions"));
    expect(container.querySelector("[data-citation-status='unverified']")).not.toBeNull();
    expect(screen.getByText("Not in your contract")).toBeInTheDocument();
  });
});
