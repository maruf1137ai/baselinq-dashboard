/**
 * The JBCC payment certificate chain, as one pure function.
 *
 * WHY THIS IS NOT INLINE IN THE DRAWER
 * ------------------------------------
 * It was, and it was wrong. The drawer took retention off the CLAIM; the server
 * takes it off the VALUATION (`tasks/pc_integrity.py::recompute`). Those differ
 * by `rate x (penalties + advance recovery)`, and the server wins — the
 * serializer overwrites every computed money field with its own recomputation
 * (`attrs[field] = computed[field]`). So a certificate carrying penalties
 * showed one amount due on screen and stored another: on a R1 000 000 valuation
 * with R100 000 of penalties at 5%, the drawer read R983 250 and the saved
 * certificate said R977 500.
 *
 * It survived because `createPCDrawer.tsx` is two thousand lines with no test.
 * Pulling the arithmetic out is what makes it testable, and the tests assert
 * against the server's chain rather than against what this file happens to do.
 *
 * Line numbers below are the JBCC payment certificate's own.
 */

export interface CertificateInputs {
  /** Work items, this period, summed. */
  grossWorkValue: number;
  /** Included variations, this period, summed. */
  voThisPeriod: number;
  materialsOnSite: number;
  penalties: number;
  advanceRecovery: number;
  retentionRelease: number;
  retentionRatePct: number;
  vatRatePct: number;
  /** The operator's retention checkbox. False zeroes the ARITHMETIC, not the rate snapshot. */
  retentionApplies: boolean;
  /**
   * False while the project's real rates are still in flight. Rates then read
   * as zero rather than as a placeholder that would show a plausible wrong
   * figure for a beat.
   */
  ratesReady: boolean;
}

export interface CertificateFigures {
  /** 3.0 — work + variations + materials. What retention is taken off. */
  grossValuation: number;
  grossValuationAdjusted: number;
  /** The Claim column: PaymentCertificate.claim_amount. */
  netValuationThisPeriod: number;
  /** 4.0 — on the valuation, never on the claim. */
  retention: number;
  /** 10.0 */
  certified: number;
  /** 12.0 — the VAT-exclusive amount certified as payable. The 1% base. */
  subtotal: number;
  /** 13.0 */
  vat: number;
  /** 16.0 — the Net column, after advance recovery. */
  amountDue: number;
}

export function computeCertificateFigures(input: CertificateInputs): CertificateFigures {
  const {
    grossWorkValue, voThisPeriod, materialsOnSite, penalties, advanceRecovery,
    retentionRelease, retentionRatePct, vatRatePct, retentionApplies, ratesReady,
  } = input;

  const grossValuation = grossWorkValue + voThisPeriod + materialsOnSite;   // 3.0
  const grossValuationAdjusted = grossValuation - penalties - advanceRecovery;

  // The Claim column, matching recompute's definition:
  //     claim = valuation - penalties - advance + escalation
  // (this drawer captures no escalation, so that term is zero).
  const netValuationThisPeriod = grossValuationAdjusted;

  const effectiveRetentionRate = ratesReady && retentionApplies ? retentionRatePct : 0;
  const retention = grossValuation * (effectiveRetentionRate / 100);        // 4.0
  const certified = grossValuation - retention + retentionRelease;          // 10.0
  const subtotal = certified - penalties;                                   // 12.0
  const vat = subtotal * ((ratesReady ? vatRatePct : 0) / 100);             // 13.0
  // Advance recovery sits BELOW the tax line, so it reduces the payment
  // without reducing the amount VAT is charged on.
  const amountDue = subtotal + vat - advanceRecovery;                       // 16.0

  return {
    grossValuation, grossValuationAdjusted, netValuationThisPeriod,
    retention, certified, subtotal, vat, amountDue,
  };
}
