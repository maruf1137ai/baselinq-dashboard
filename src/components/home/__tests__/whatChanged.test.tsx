/**
 * What the "What changed" panel actually renders, for the two viewers.
 *
 * `homeChanges.test.ts` checks the FUNCTION. This checks the SCREEN, and the
 * two are not the same assertion: a panel can hold a correctly-filtered list
 * and still print a restricted word in its heading, its lead, its disclosure
 * line or its empty state. The band's own gating test makes the same argument
 * at more length; this is the feed's half of it, built from the real builders
 * rather than from hand-written `ChangeItem` literals, so a builder that
 * starts leaking is caught here too.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { WhatChangedBlock } from "../WhatChanged";
import {
  buildCertificateChanges,
  buildChangeFeed,
  buildDocumentChanges,
  buildMeetingChanges,
  buildMilestoneChanges,
  buildTaskChanges,
  buildVariationChanges,
} from "@/lib/homeChanges";

const NOW = new Date("2026-08-17T09:00:00Z");
const ago = (days: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

// A project with real money on it. A contractor's screen staying clean because
// there was nothing to leak would prove nothing.
const feedFor = (held: { canViewFinance: boolean; canViewCompliance: boolean }) =>
  buildChangeFeed(
    [
      buildCertificateChanges(
        [{ id: 6, pcNumber: "PC-006", workflowState: "posted", updatedAt: ago(3) }],
        NOW,
      ),
      buildVariationChanges(
        [{ id: 43, ref: "VO-004", status: "approved", approvedAt: ago(5) }],
        NOW,
      ),
      buildMilestoneChanges(
        [
          {
            _id: "m1",
            name: "Practical completion",
            baselineEnd: "2026-10-31",
            endDate: "2026-11-30",
            updatedAt: ago(2),
          },
        ],
        NOW,
      ),
      // Free text off the payload, which is what the vocabulary guard is for.
      buildDocumentChanges(
        [
          { _id: "d1", name: "Ground floor plan", reference: "A-101", createdAt: ago(1) },
          { _id: "d2", name: "Variation register", createdAt: ago(1) },
          { _id: "d3", name: "Retention release schedule", createdAt: ago(1) },
        ],
        NOW,
      ),
      buildMeetingChanges(
        [{ id: 11, title: "Monthly certification meeting", status: "held", date: ago(4) }],
        NOW,
      ),
      buildTaskChanges(
        [{ id: "t1", code: "SI-002", type: "SI", status: "done", updatedAt: ago(1) }],
        NOW,
      ),
    ],
    held,
    { now: NOW, limit: 4 },
  );

const draw = (held: { canViewFinance: boolean; canViewCompliance: boolean }) => {
  const { container } = render(
    <MemoryRouter>
      <WhatChangedBlock feed={feedFor(held)} />
    </MemoryRouter>,
  );
  const attrs = [...container.querySelectorAll("*")]
    .flatMap((el) => [...el.attributes].map((a) => a.value))
    .join(" ");
  return `${container.textContent ?? ""} ${attrs}`;
};

describe("a contractor without finance.view", () => {
  const CONTRACTOR = { canViewFinance: false, canViewCompliance: true };

  it("is shown no rand figure and none of the restricted words, anywhere in the DOM", () => {
    const t = draw(CONTRACTOR);
    expect(t).not.toMatch(/R\s?\d/);
    expect(t).not.toMatch(/\bZAR\b/i);
    for (const word of ["certif", "retention", "variation"]) {
      expect(t.toLowerCase()).not.toContain(word);
    }
  });

  it("is shown a shorter panel rather than a greyed-out one, and no hidden count", () => {
    // Visible TEXT only here, not the attributes: `overflow-hidden` is a class
    // on the panel and matching it would make this assertion meaningless.
    const { container } = render(
      <MemoryRouter>
        <WhatChangedBlock feed={feedFor(CONTRACTOR)} />
      </MemoryRouter>,
    );
    const t = (container.textContent ?? "").toLowerCase();
    // The panel still has content, so this is not a vacuous pass.
    expect(t).toContain("practical completion");
    // "3 changes hidden" would tell a contractor exactly how much commercial
    // activity is happening this week, which is the fact being withheld.
    expect(t).not.toContain("hidden");
    expect(t).not.toContain("restricted");
    expect(t).not.toContain("no permission");
  });

  it("links no row it can see into the finance pages", () => {
    render(
      <MemoryRouter>
        <WhatChangedBlock feed={feedFor(CONTRACTOR)} />
      </MemoryRouter>,
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("finance");
    }
  });
});

describe("a QS holding both gates", () => {
  const QS = { canViewFinance: true, canViewCompliance: true };

  it("is shown the commercial rows the contractor is not", () => {
    const t = draw(QS);
    expect(t).toContain("PC-006 posted");
    expect(t).toContain("VO-004 approved");
  });

  it("still prints no amount — the feed formats none, so there is none to leak", () => {
    expect(draw(QS)).not.toMatch(/R\s?\d{3}/);
  });
});

describe("the empty states, which are two different sentences", () => {
  const EMPTY = { canViewFinance: true, canViewCompliance: true };

  it("says a project is untracked rather than quiet when nothing was passed in", () => {
    render(
      <MemoryRouter>
        <WhatChangedBlock feed={buildChangeFeed([], EMPTY, { now: NOW })} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/nothing is tracked on this project yet/i)).toBeTruthy();
  });

  it("says a tracked project has been quiet when everything aged out", () => {
    const feed = buildChangeFeed(
      [buildCertificateChanges([{ id: 1, workflowState: "posted", updatedAt: ago(400) }], NOW)],
      EMPTY,
      { now: NOW },
    );
    expect(feed.empty).toBe(false);
    render(
      <MemoryRouter>
        <WhatChangedBlock feed={feed} />
      </MemoryRouter>,
    );
    // The disclosure was cut from a 130-character sentence to a count list.
    // The COUNT is what is load-bearing and it survives verbatim; the prose
    // explaining it moved into `changeFeedDisclosure`'s comment.
    expect(screen.getByText(/1 older not listed/i)).toBeTruthy();
  });
});
