/**
 * Home reference page — the parts that are easy to get quietly wrong.
 *
 * 1. **It renders at all.** Like Roles & Permissions, this page derives its
 *    sections during render from several hooks plus module-level consts, and
 *    a wrong declaration order gives a binding still in its temporal dead
 *    zone when `.map()` reaches it. TypeScript does not catch it — the
 *    reference sits inside a closure it cannot prove runs immediately — and
 *    neither `tsc` nor `vite build` executes a component. Only mounting does.
 *    That exact bug shipped once on RolesPermissions.tsx; this is the guard.
 *
 * 2. **It renders with nothing loaded.** The live-roles hooks are network
 *    reads. Until they resolve, the page must fall back to its static prose
 *    rather than printing a half-computed sentence or crashing on an
 *    undefined grant map. The test deliberately provides no fixtures, which
 *    is the loading state.
 *
 * 3. **Its factual claims survive edits.** The page tells users that money
 *    and risk are not merely hidden but never requested, and that the setup
 *    ring measures the record rather than site progress. Both are the
 *    corrections this page exists to make, and both are the kind of nuance a
 *    later copy-edit smooths away. They are asserted, not trusted.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import HelpHome from "@/pages/HelpHome";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HelpHome />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Home reference page", () => {
  it("mounts and draws its heading with no data loaded", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Home reference", level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders every section, so a new one cannot be added without a nav entry", () => {
    renderPage();
    for (const title of [
      "Opening the Page",
      "Setup & Preconditions",
      "The Project Summary Strip",
      "My Actions",
      "Recent Activity",
      "Contract Watch",
      "The Status Band",
      "Construction vs Professional",
      "Where the Data Comes From",
    ]) {
      expect(
        screen.getByRole("heading", { name: title, level: 2 }),
      ).toBeInTheDocument();
    }
  });

  it("uses the source-and-audience columns, not the family's action columns", () => {
    // Home is read-only. "Action / Who can do it / When" would mean inventing
    // verbs for figures, so this page's departure from the family is
    // deliberate and worth pinning.
    renderPage();
    expect(screen.getAllByText("What you see").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Where it comes from").length).toBeGreaterThan(0);
  });

  it("says money and risk are never requested, not merely hidden", () => {
    // The whole point of the distinction: hiding a card still sends the
    // employer's commercial position to a contractor's browser.
    renderPage();
    expect(
      screen.getByText(/never requested from the server at all/i),
    ).toBeInTheDocument();
  });

  it("says the setup figure measures the record, not site progress", () => {
    // The single most misread number on Home.
    renderPage();
    // Stated twice on purpose — once against the setup row, once in the
    // cross-cutting rules — so this asserts presence, not uniqueness.
    expect(
      screen.getAllByText(/Baselinq holds no measure of physical progress/i).length,
    ).toBeGreaterThan(0);
  });

  it("does not claim the activity feed is an audit trail", () => {
    renderPage();
    expect(screen.getByText(/It is NOT an audit trail/i)).toBeInTheDocument();
  });
});
