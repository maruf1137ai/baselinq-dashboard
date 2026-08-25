import { describe, expect, it } from "vitest";

import { BASE_TABS, TAB_SLUG, resolveTab, slugFor, tabsFor } from "../tabs";

describe("tabsFor — the finance gate", () => {
  it("hides the commercial tab from a viewer without finance.view", () => {
    expect(tabsFor(false)).toEqual(BASE_TABS);
    expect(tabsFor(false)).not.toContain("Commercial position");
  });

  it("shows it to a viewer who holds it", () => {
    expect(tabsFor(true)).toContain("Commercial position");
  });

  it("gates only the commercial tab — the insurer evidence tabs are not finance", () => {
    // Project Health's route gate is compliance.view. The four evidence tabs
    // carry no rand figure and must stay reachable without finance.view.
    expect(tabsFor(false)).toEqual([
      "Risk signals",
      "Notice deadlines",
      "Evidence",
      "Insurer",
    ]);
  });
});

describe("?tab= deep links", () => {
  // These slugs are a contract with the homepage links. Changing one silently
  // breaks a link that was only just fixed.
  it("keeps every slug the homepage links to", () => {
    expect(Object.keys(TAB_SLUG).sort()).toEqual([
      "commercial",
      "evidence",
      "insurer",
      "notice-deadlines",
      "risk-signals",
    ]);
  });

  it("round-trips every tab through its slug", () => {
    for (const tab of tabsFor(true)) {
      expect(TAB_SLUG[slugFor(tab)!]).toBe(tab);
    }
  });

  it("resolves each slug to its tab", () => {
    expect(resolveTab("notice-deadlines", true)).toBe("Notice deadlines");
    expect(resolveTab("evidence", true)).toBe("Evidence");
    expect(resolveTab("insurer", true)).toBe("Insurer");
    expect(resolveTab("commercial", true)).toBe("Commercial position");
  });

  it("falls back to the first tab for an absent or unknown slug", () => {
    expect(resolveTab(null, true)).toBe("Risk signals");
    expect(resolveTab("", true)).toBe("Risk signals");
    expect(resolveTab("nonsense", true)).toBe("Risk signals");
  });

  it("does not land a viewer without finance.view on the commercial tab", () => {
    // The URL is shareable and can be pasted to anybody.
    expect(resolveTab("commercial", false)).toBe("Risk signals");
  });

  it("still honours the non-finance slugs for that viewer", () => {
    expect(resolveTab("insurer", false)).toBe("Insurer");
    expect(resolveTab("notice-deadlines", false)).toBe("Notice deadlines");
  });
});
