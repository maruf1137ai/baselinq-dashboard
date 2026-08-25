/**
 * Deep-link parameter resolution.
 *
 * The cases that matter here are the ones that go wrong, not the ones that go
 * right. A link is a durable thing: it is pasted into an email, a task, a
 * meeting note, and it is followed weeks later by someone who may not be the
 * person it was written for. By then the record may be gone, or the follower
 * may simply never have been entitled to see it.
 *
 * Both of those must land on the ordinary, unfiltered page. Neither may
 * produce an error, and — the expensive one — neither may produce a filtered
 * view that reads as "there is nothing here". Baselinq has shipped that bug
 * before: a risk cell that told a viewer lacking permission "Open risk signals
 * 0" while twelve existed, asserting a clean project to somebody who had only
 * not been shown it. These tests exist to keep the deep links from repeating
 * that shape.
 */
import { describe, expect, it } from "vitest";

import { findByDeepLinkId, pageContaining, resolveTabParam } from "@/lib/deepLink";

/** The four tab keys /finance actually renders, in page order. */
const ALL_FINANCE_TABS = [
  "Cost Ledger",
  "Payment Certificates",
  "Variation Orders",
  "Platform Fees",
];

/** What a viewer with finance.view but not finance.approve_payment sees. */
const TABS_WITHOUT_PLATFORM_FEES = ALL_FINANCE_TABS.slice(0, 3);

describe("resolveTabParam", () => {
  it("selects the tab the parameter names", () => {
    expect(resolveTabParam("Payment Certificates", ALL_FINANCE_TABS)).toBe(
      "Payment Certificates",
    );
    expect(resolveTabParam("Variation Orders", ALL_FINANCE_TABS)).toBe(
      "Variation Orders",
    );
    expect(resolveTabParam("Cost Ledger", ALL_FINANCE_TABS)).toBe("Cost Ledger");
    expect(resolveTabParam("Platform Fees", ALL_FINANCE_TABS)).toBe("Platform Fees");
  });

  it("survives the ways a query string mangles a key with a space in it", () => {
    // "+" is how a form encoder writes a space; "%20" arrives already decoded
    // by URLSearchParams. Case and separator choice are not worth a broken link.
    expect(resolveTabParam("payment+certificates", ALL_FINANCE_TABS)).toBe(
      "Payment Certificates",
    );
    expect(resolveTabParam("payment-certificates", ALL_FINANCE_TABS)).toBe(
      "Payment Certificates",
    );
    expect(resolveTabParam("payment_certificates", ALL_FINANCE_TABS)).toBe(
      "Payment Certificates",
    );
    expect(resolveTabParam("  VARIATION ORDERS  ", ALL_FINANCE_TABS)).toBe(
      "Variation Orders",
    );
  });

  it("falls back to today's default when the parameter is absent or blank", () => {
    expect(resolveTabParam(null, ALL_FINANCE_TABS)).toBe("Cost Ledger");
    expect(resolveTabParam(undefined, ALL_FINANCE_TABS)).toBe("Cost Ledger");
    expect(resolveTabParam("", ALL_FINANCE_TABS)).toBe("Cost Ledger");
    expect(resolveTabParam("   ", ALL_FINANCE_TABS)).toBe("Cost Ledger");
  });

  it("falls back rather than erroring on a tab key that no longer exists", () => {
    // A link written when the tab was called "Forecast", followed today.
    expect(resolveTabParam("Forecast", ALL_FINANCE_TABS)).toBe("Cost Ledger");
    expect(resolveTabParam("../../admin", ALL_FINANCE_TABS)).toBe("Cost Ledger");
  });

  it("cannot open a tab this viewer's permissions removed", () => {
    // Platform Fees is the employer's bill from Baselinq. A viewer without
    // finance.approve_payment does not have it in `visibleTabs`, and a link
    // naming it must land on their ordinary default — not reveal the tab, and
    // not blank the page either.
    expect(resolveTabParam("Platform Fees", TABS_WITHOUT_PLATFORM_FEES)).toBe(
      "Cost Ledger",
    );
  });

  it("resolves to nothing when the viewer may see no tabs at all", () => {
    // No finance.view: `visibleTabs` is empty and the page renders no tab
    // content. The parameter must not conjure one — it is the page's gate that
    // decides, and it decided before the URL was consulted.
    expect(resolveTabParam("Payment Certificates", [])).toBe("");
    expect(resolveTabParam(null, [])).toBe("");
  });
});

describe("findByDeepLinkId", () => {
  interface Vo {
    id: string;
    taskId: string;
  }
  const variations: Vo[] = [
    { id: "VO-001", taskId: "43" },
    { id: "VO-002", taskId: "44" },
  ];

  it("matches on either identifier a link might carry", () => {
    expect(findByDeepLinkId("VO-002", variations, v => [v.id, v.taskId])).toEqual(
      variations[1],
    );
    expect(findByDeepLinkId("44", variations, v => [v.id, v.taskId])).toEqual(
      variations[1],
    );
  });

  it("matches a numeric id against its string form", () => {
    const certificates = [{ id: 7, pcNumber: "PC-007" }];
    expect(findByDeepLinkId("7", certificates, c => [c.id, c.pcNumber])).toEqual(
      certificates[0],
    );
    expect(findByDeepLinkId("pc-007", certificates, c => [c.id, c.pcNumber])).toEqual(
      certificates[0],
    );
  });

  it("returns nothing for a stale id — the record was deleted", () => {
    expect(findByDeepLinkId("VO-999", variations, v => [v.id, v.taskId])).toBeNull();
  });

  it("returns nothing when the viewer's own list came back without it", () => {
    // The permission case. The record exists; this viewer's request did not
    // return it. That must be indistinguishable from "no parameter" — the
    // caller selects nothing and renders the full list it does have. What it
    // must NOT do is filter, which would show an empty page and assert the
    // record's absence to someone who was only never shown it.
    const whatThisViewerCanSee: Vo[] = [{ id: "VO-001", taskId: "43" }];
    expect(
      findByDeepLinkId("VO-002", whatThisViewerCanSee, v => [v.id, v.taskId]),
    ).toBeNull();
    // And the list the page renders is untouched — the helper returns a
    // selection, never a filtered collection.
    expect(whatThisViewerCanSee).toHaveLength(1);
  });

  it("returns nothing while the list is still loading", () => {
    expect(findByDeepLinkId("VO-001", [], (v: Vo) => [v.id])).toBeNull();
  });

  it("returns nothing for an absent or blank parameter", () => {
    expect(findByDeepLinkId(null, variations, v => [v.id])).toBeNull();
    expect(findByDeepLinkId(undefined, variations, v => [v.id])).toBeNull();
    expect(findByDeepLinkId("", variations, v => [v.id])).toBeNull();
    expect(findByDeepLinkId("  ", variations, v => [v.id])).toBeNull();
  });

  it("does not match records whose identifier is missing", () => {
    // A row with no VO number must never be matched by an empty-ish link.
    const ragged = [{ id: null as string | null, taskId: undefined as string | undefined }];
    expect(findByDeepLinkId("null", ragged, r => [r.id, r.taskId])).toBeNull();
    expect(findByDeepLinkId("undefined", ragged, r => [r.id, r.taskId])).toBeNull();
  });
});

describe("pageContaining", () => {
  const rows = Array.from({ length: 34 }, (_, i) => ({ id: i + 1 }));

  it("finds the page a row sits on", () => {
    expect(pageContaining(rows, r => r.id === 1, 10)).toBe(1);
    expect(pageContaining(rows, r => r.id === 10, 10)).toBe(1);
    expect(pageContaining(rows, r => r.id === 11, 10)).toBe(2);
    expect(pageContaining(rows, r => r.id === 34, 10)).toBe(4);
  });

  it("leaves pagination alone when the row is not in the list", () => {
    // Stale id, or hidden behind the current search. Returning null is what
    // stops the table jumping to a page for a row it does not have.
    expect(pageContaining(rows, r => r.id === 999, 10)).toBeNull();
    expect(pageContaining([], () => true, 10)).toBeNull();
  });

  it("refuses a nonsensical page size rather than dividing by zero", () => {
    expect(pageContaining(rows, r => r.id === 1, 0)).toBeNull();
  });
});
