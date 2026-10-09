/**
 * Chat citations must show whether a clause is really in the user's contract (audit ACC-07 / ACC-11):
 * verified, standard-form only, related context, or not found — and old messages without a status look as before.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { shownSources, type ChatSource } from "@/types/citation";
import { CitationPill } from "../CitationPill";

function source(overrides: Partial<ChatSource> = {}): ChatSource {
  return {
    clause_number: "17.1", clause_title: "Variations", page_number: 12, similarity: 0.9,
    excerpt: "The architect may vary the works.", document_name: "Main Contract", ...overrides,
  };
}

describe("CitationPill", () => {
  it("labels each status", () => {
    const { rerender } = render(<CitationPill source={source({ verification: "verified" })} />);
    expect(screen.getByText("Clause 17.1")).toBeInTheDocument();
    expect(screen.getByText("Found in your contract")).toBeInTheDocument();

    rerender(<CitationPill source={source({ verification: "reference_only" })} />);
    expect(screen.getByText("Clause 17.1 · Standard form")).toBeInTheDocument();

    rerender(<CitationPill source={source({ verification: "related" })} />);
    expect(screen.getByText("Related clause 17.1")).toBeInTheDocument();
    expect(screen.getByText("Retrieved as context — the reply does not cite it")).toBeInTheDocument();
  });

  it("a clause that is not in the contract shows no excerpt, and says why on the chip itself", () => {
    render(<CitationPill source={source({ clause_number: "99.9", excerpt: "", verification: "not_found" })} />);
    expect(screen.getByText("Clause 99.9 · not in your contract")).toBeInTheDocument();
    expect(screen.getByText("The reply cites this clause, but none of your documents contains it")).toBeInTheDocument();
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();  // no separate warning box under the reply
  });

  it("old sources without a status look as before", () => {
    const { container } = render(<CitationPill source={source()} />);
    expect(screen.getByText("Clause 17.1")).toBeInTheDocument();
    expect(container.querySelector("[data-verification='none']")).not.toBeNull();
    expect(screen.getByText("Main Contract")).toBeInTheDocument();
  });
});

describe("shownSources", () => {
  it("shows only clauses the reply cites: old 'related' context chips are hidden", () => {
    const sources = [source({ clause_number: "18.0", verification: "related" }), source({ verification: "verified" }),
      source({ clause_number: "99.9", verification: "not_found" }), source({ clause_number: "5.1" })];
    expect(shownSources(sources).map((s) => s.clause_number)).toEqual(["17.1", "99.9", "5.1"]);
    expect(shownSources(undefined)).toEqual([]);
  });

  // Part 16: a clause retrieved as several chunks used to render one identical chip per chunk —
  // the reported bug showed five chips all reading "Clause 25.0".
  it("names each clause once, keeping the best-ranked chunk's excerpt", () => {
    const sources = [
      source({ clause_number: "25.0", document_id: 7, excerpt: "best" }),
      source({ clause_number: "25.0", document_id: 7, excerpt: "worse" }),
      source({ clause_number: "25.0", document_id: 7, excerpt: "worst" }),
      source({ clause_number: "25.1", document_id: 7 }),
    ];
    const shown = shownSources(sources);
    expect(shown.map((s) => s.clause_number)).toEqual(["25.0", "25.1"]);
    expect(shown[0].excerpt).toBe("best");
  });

  // One real project had the same contract indexed under ten document keys, so three cited
  // clauses came back as nine chips. The chip shows only the clause number, so a second copy of
  // it tells the reader nothing — whichever document ranked best keeps the chip.
  it("names a clause once even when it is found in several documents", () => {
    const sources = [source({ clause_number: "25.0", document_id: 7 }), source({ clause_number: "25.0", document_id: 9 })];
    expect(shownSources(sources).map((s) => s.document_id)).toEqual([7]);
  });
});
