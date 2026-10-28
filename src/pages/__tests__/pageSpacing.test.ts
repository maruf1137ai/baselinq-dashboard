/**
 * The page-top rule, enforced against the source rather than a rendered DOM.
 *
 * The rule is written at the top of `page-header.tsx`: a page inside a default
 * `DashboardLayout` wraps its content in `space-y-6`, and a page under a
 * `padding="p-0"` host wraps it in `<PageBody>`. Both put the title 24px from
 * the top and 24px from the left, on every page.
 *
 * It had already drifted six ways inside Settings alone — one page rendered
 * with no inset at all, two carried 80px and 128px of arbitrary bottom
 * padding, and one hand-rolled the title classes `PageHeader` exists to own.
 * A rule written only in a comment gets re-broken by the next person who adds
 * a page, so these assertions read the files.
 *
 * Source-level rather than render-level on purpose: rendering a settings page
 * needs a router, a query client and a project in context, and none of that
 * would make the assertion stronger — the thing being asserted IS the class
 * string in the file.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SETTINGS_DIR = join(process.cwd(), "src/pages/settings");

/** Every settings page except the `<Outlet />` shell, which owns no content. */
const settingsPages = readdirSync(SETTINGS_DIR)
  .filter((f) => f.endsWith(".tsx") && f !== "settings.tsx")
  .map((f) => ({ name: f, src: readFileSync(join(SETTINGS_DIR, f), "utf8") }));

describe("the page-top rule", () => {
  it("has settings pages to check", () => {
    // Guards against the glob silently matching nothing and every assertion
    // below passing vacuously.
    expect(settingsPages.length).toBeGreaterThan(8);
  });

  it.each(settingsPages)(
    "settings/$name wraps its content in PageBody",
    ({ src }) => {
      expect(src).toContain("<PageBody");
    },
  );

  it.each(settingsPages)(
    "settings/$name declares no page inset of its own",
    ({ src }) => {
      // `PageBody` owns `p-6`. A page re-declaring it doubles the inset to
      // 48px; a page declaring `pb-*` on its root reintroduces the arbitrary
      // 80/128px feet this replaced.
      const root = src.slice(src.lastIndexOf("return ("), src.lastIndexOf("return (") + 400);
      expect(root).not.toMatch(/<div className="[^"]*\bp-6\b/);
      expect(root).not.toMatch(/<div className="[^"]*\bpb-(16|20|24|32)\b/);
    },
  );

  it.each(settingsPages)(
    "settings/$name uses PageHeader rather than a hand-rolled title",
    ({ src }) => {
      // The class string below is PageHeader's own. Any copy of it outside
      // that component is the drift the component exists to stop.
      const handRolled = /<h[12] className="[^"]*text-2xl font-normal tracking-tight/;
      expect(src).not.toMatch(handRolled);
    },
  );
});

describe("the app header height", () => {
  const files = ["src/pages", "src/components"]
    .flatMap((d) => walk(join(process.cwd(), d)))
    .map((f) => ({ name: f, src: readFileSync(f, "utf8") }));

  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(join(dir, e.name))
        : e.name.endsWith(".tsx")
          ? [join(dir, e.name)]
          : [],
    );
  }

  it("is subtracted by name, never as a magic pixel value", () => {
    // `DashboardHeader` is h-16. Five pages hard-coded 64px and three more
    // guessed — 120px, 200px and 100px for one quantity. `--app-header-h` is
    // the single declaration; a raw `100vh-<n>px` is the bug returning.
    const offenders = files
      .filter((f) => /100vh-\d+px/.test(f.src))
      .map((f) => f.name.replace(process.cwd() + "/", ""));
    expect(offenders).toEqual([]);
  });
});
