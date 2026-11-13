import { describe, expect, it } from "vitest";

import { computeCertificateFigures } from "../pcFigures";

/**
 * Every expectation here is hand-worked from the JBCC chain as
 * `tasks/pc_integrity.py::recompute` computes it — the server's arithmetic,
 * which wins, because the serializer overwrites the client's computed money
 * fields with its own. Asserting against the server's chain and not against
 * what pcFigures.ts happens to do is the whole point of the file.
 *
 *   valuation (3.0)  = work + variations + materials
 *   retention (4.0)  = valuation x rate          <- the valuation, not the claim
 *   certified (10.0) = valuation - retention + release
 *   subtotal  (12.0) = certified - penalties
 *   vat       (13.0) = subtotal x vat rate
 *   amountDue (16.0) = subtotal + vat - advance recovery
 *   claim            = valuation - penalties - advance
 */

const BASE = {
  grossWorkValue: 1_000_000,
  voThisPeriod: 0,
  materialsOnSite: 0,
  penalties: 0,
  advanceRecovery: 0,
  retentionRelease: 0,
  retentionRatePct: 5,
  vatRatePct: 15,
  retentionApplies: true,
  ratesReady: true,
};

describe("computeCertificateFigures", () => {
  it("a clean certificate", () => {
    const f = computeCertificateFigures(BASE);
    expect(f.grossValuation).toBe(1_000_000);
    expect(f.netValuationThisPeriod).toBe(1_000_000);
    expect(f.retention).toBe(50_000);
    expect(f.certified).toBe(950_000);
    expect(f.subtotal).toBe(950_000);
    expect(f.vat).toBe(142_500);
    expect(f.amountDue).toBe(1_092_500);
  });

  it("takes retention off the valuation, not off a claim reduced by penalties", () => {
    // The defect this file exists for. Retention stays 50 000 — 5% of the
    // VALUATION — and the penalty comes off below it at 12.0.
    // The old inline arithmetic took 5% of the 900 000 claim: retention 45 000,
    // subtotal 855 000, VAT 128 250, due R983 250. The certificate that then
    // saved said R977 500.
    const f = computeCertificateFigures({ ...BASE, penalties: 100_000 });
    expect(f.netValuationThisPeriod).toBe(900_000);
    expect(f.retention).toBe(50_000);
    expect(f.certified).toBe(950_000);
    expect(f.subtotal).toBe(850_000);
    expect(f.vat).toBe(127_500);
    expect(f.amountDue).toBe(977_500);
  });

  it("deducts advance recovery below the tax line", () => {
    // VAT is charged on 950 000, not on 750 000: the recovery is a repayment of
    // money already advanced, not a reduction in the value certified.
    const f = computeCertificateFigures({ ...BASE, advanceRecovery: 200_000 });
    expect(f.netValuationThisPeriod).toBe(800_000);
    expect(f.retention).toBe(50_000);
    expect(f.subtotal).toBe(950_000);
    expect(f.vat).toBe(142_500);
    expect(f.amountDue).toBe(892_500);
  });

  it("penalties and advance recovery together", () => {
    const f = computeCertificateFigures({
      ...BASE, penalties: 100_000, advanceRecovery: 200_000,
    });
    expect(f.netValuationThisPeriod).toBe(700_000);
    expect(f.retention).toBe(50_000);
    expect(f.subtotal).toBe(850_000);
    expect(f.vat).toBe(127_500);
    expect(f.amountDue).toBe(777_500);
  });

  it("a retention release adds back above the tax line", () => {
    const f = computeCertificateFigures({ ...BASE, retentionRelease: 30_000 });
    expect(f.certified).toBe(980_000);
    expect(f.subtotal).toBe(980_000);
    expect(f.vat).toBe(147_000);
  });

  it("variations and materials are part of the valuation retention is taken off", () => {
    const f = computeCertificateFigures({
      ...BASE, grossWorkValue: 600_000, voThisPeriod: 300_000, materialsOnSite: 100_000,
    });
    expect(f.grossValuation).toBe(1_000_000);
    expect(f.retention).toBe(50_000);
  });

  it("retention switched off zeroes the arithmetic, not the rate", () => {
    const f = computeCertificateFigures({ ...BASE, retentionApplies: false });
    expect(f.retention).toBe(0);
    expect(f.subtotal).toBe(1_000_000);
    expect(f.vat).toBe(150_000);
  });

  it("rates not ready read as zero rather than as a plausible wrong figure", () => {
    const f = computeCertificateFigures({ ...BASE, ratesReady: false });
    expect(f.retention).toBe(0);
    expect(f.vat).toBe(0);
    expect(f.amountDue).toBe(1_000_000);
  });

  it("subtotal is the figure the platform fee is charged on", () => {
    // billing/fee_base.py::certified_value_excluding_vat returns exactly this
    // number, and charges 1% of it. If the two ever disagree the customer gets
    // a fee it cannot reconcile to the certificate it names.
    const f = computeCertificateFigures({
      ...BASE, penalties: 250_000, advanceRecovery: 300_000, retentionRelease: 80_000,
      grossWorkValue: 5_000_000,
    });
    // 5 000 000 - 250 000 (5%) + 80 000 - 250 000 = 4 580 000
    expect(f.subtotal).toBe(4_580_000);
  });
});
