/**
 * The admin panel shell uses the viewport it is given.
 *
 * `AdminPage` capped every admin screen at `max-w-6xl` — 1152px — with no
 * `mx-auto`, so on any ordinary monitor the content stopped a little over
 * halfway across and the rest of the window sat empty.
 *
 * The visible damage was not the empty space, it was what the cap did to the
 * tables inside it. Fees carries nine columns — date, project, source, base,
 * rate, fee, VAT, total, status — every cell `whitespace-nowrap` with `px-6`
 * padding. Past 1152px the table overflowed its own container, SectionCard's
 * `overflow-x-auto` engaged, and the leading date column was clipped: "Nov
 * 2026" rendered as "ov 2026". A date column that silently loses its first
 * character, on a page of money, is worse than a layout complaint.
 *
 * Finance, Programme and Documents all run full width. The admin panel was
 * the only part of the product that capped itself.
 *
 * The exception is the billing guide, which is prose. Sentences set to 1900px
 * are unreadable, so that page opts back in to a reading width — and the two
 * cases are pinned here so a later tidy-up cannot quietly re-apply the cap to
 * everything, or strip it from the one page that wants it.
 */
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminPage } from "../account/admin/adminUi";

const shellOf = (ui: React.ReactElement) => {
  const { container } = render(ui);
  // PageHeader is rendered inside; the shell is the outermost div.
  return container.firstElementChild as HTMLElement;
};

describe("AdminPage width", () => {
  it("does not cap a table page's width", () => {
    const shell = shellOf(
      <AdminPage title="Fees" description="Every platform fee on every project.">
        <table />
      </AdminPage>,
    );
    const cls = shell.className;
    expect(cls).not.toMatch(/\bmax-w-/);
    expect(cls).toContain("p-6");
  });

  it("keeps a reading width for a prose page", () => {
    const shell = shellOf(
      <AdminPage prose title="Billing guide" description="How the fee works.">
        <p>Sentences, not columns.</p>
      </AdminPage>,
    );
    expect(shell.className).toMatch(/\bmax-w-/);
  });
});
