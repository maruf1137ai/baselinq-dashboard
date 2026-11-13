/**
 * Variations signed and never certified.
 *
 * A variation becomes money the contractor can be paid only when somebody
 * ticks it into a payment certificate. Until this, that was a thing a person
 * had to remember: the certificate drawer opened every approved variation
 * excluded and at zero, and nothing anywhere said "VO-014 was signed six weeks
 * ago and has never appeared on a certificate". The work was done, the
 * variation was signed, and the money sat.
 *
 * The drawer now defaults every uncertified variation in. This queue catches
 * the rest — one signed between certificates, or unticked once and forgotten.
 */
import { describe, expect, it } from "vitest";

import { buildUncertifiedVariationQueue } from "@/lib/homeSignals";
import { toVariationRecord } from "@/lib/homeIndicators";

const NOW = new Date("2026-10-26T09:00:00Z");
const SIGNED = "2026-09-14T09:00:00Z"; // 42 days before NOW

const vo = (over: Record<string, unknown> = {}) => ({
  id: 7,
  voNumber: "VO-014",
  status: "Approved",
  signedAt: SIGNED,
  grandTotal: 340000,
  ...over,
});

describe("buildUncertifiedVariationQueue", () => {
  it("raises a row for a signed variation nothing has certified", () => {
    const rows = buildUncertifiedVariationQueue([vo()], {}, NOW);

    expect(rows).toHaveLength(1);
    expect(rows[0].headline).toMatch(/VO-014 was signed and has never been certified/);
    expect(rows[0].amount).toBe(340000);
    expect(rows[0].action).toBe("Certify it");
  });

  it("says how long the contractor has been waiting", () => {
    const rows = buildUncertifiedVariationQueue([vo()], {}, NOW);
    expect(rows[0].detail).toMatch(/Signed 42 days ago/);
  });

  it("raises a row for the BALANCE when a variation is part-certified", () => {
    const rows = buildUncertifiedVariationQueue([vo()], { "VO-014": 100000 }, NOW);

    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(240000);
    expect(rows[0].headline).toMatch(/part-certified/);
  });

  it("is silent once the variation is fully certified", () => {
    expect(buildUncertifiedVariationQueue([vo()], { "VO-014": 340000 }, NOW)).toEqual([]);
    // Over-certified is also silent — that is a certificate problem, and
    // pc_integrity already raises it. This row is about money NOT paid.
    expect(buildUncertifiedVariationQueue([vo()], { "VO-014": 400000 }, NOW)).toEqual([]);
  });

  it("ignores a variation that was never signed", () => {
    /*
      `signed_at` is set only by sign-and-issue, never by a status PATCH. The
      cost ledger and the fee engine both refuse to count a variation without
      it, so this must agree or the homepage would chase money the rest of the
      system does not believe is owed.
    */
    expect(buildUncertifiedVariationQueue([vo({ signedAt: null })], {}, NOW)).toEqual([]);
  });

  it("ignores a variation that is not approved", () => {
    expect(buildUncertifiedVariationQueue([vo({ status: "Draft" })], {}, NOW)).toEqual([]);
    expect(buildUncertifiedVariationQueue([vo({ status: "Rejected" })], {}, NOW)).toEqual([]);
  });

  it("counts Closed as certifiable", () => {
    // Closed is a variation's normal end-of-life after successful completion,
    // not a cancellation — the fee engine treats it the same as Approved.
    const rows = buildUncertifiedVariationQueue([vo({ status: "Closed" })], {}, NOW);
    expect(rows).toHaveLength(1);
  });

  it("ignores an unpriced variation", () => {
    expect(buildUncertifiedVariationQueue([vo({ grandTotal: 0 })], {}, NOW)).toEqual([]);
    expect(buildUncertifiedVariationQueue([vo({ grandTotal: null })], {}, NOW)).toEqual([]);
  });

  it("claims no contractual clock", () => {
    /*
      Nothing is forfeited by delay here — the contractor is simply unpaid. So
      the row carries `money`, not `forfeiture`, and no clock: days since
      signature is a management fact, not a contract period, and presenting it
      as one would be the countdown defect this codebase already fixed once.
    */
    const [row] = buildUncertifiedVariationQueue([vo()], {}, NOW);
    expect(row.consequence).toBe("money");
    expect(row.clock).toBeNull();
    expect(row.daysRemaining).toBeNull();
    expect(row.overdue).toBe(false);
  });

  it("is gated on finance.view", () => {
    const [row] = buildUncertifiedVariationQueue([vo()], {}, NOW);
    expect(row.requires).toContain("finance.view");
  });

  it("measures what is left EXCLUDING VAT", () => {
    /*
      QA BUG-04: a certificate adds VAT itself, so a VO is certified at its
      ex-VAT value. A VO of 100,000 + VAT certified at 100,000 is done — it is
      not "15,000 still to certify".
    */
    const v = vo({ grandTotal: 115000, certifiableValue: 100000 });
    expect(buildUncertifiedVariationQueue([v], { "VO-014": 100000 }, NOW)).toEqual([]);
    const [row] = buildUncertifiedVariationQueue([v], {}, NOW);
    expect(row.amount).toBe(100000);
  });

  it("links to the variation by its reference", () => {
    const [row] = buildUncertifiedVariationQueue([vo()], {}, NOW);
    expect(row.href).toContain("vo=VO-014");
  });
});

describe("the real API shape, through toVariationRecord (QA BUG-14)", () => {
  /*
    The alert never fired. Home fed it the `tasks/tasks/?taskType=VO` rows,
    which nest the variation under `.task` — so `voNumber` and `signedAt` were
    never at the top level the builder reads, and every row was filtered out.
    Home now passes the merged variation records; this pins that adapter.
  */
  const wrapper = {
    taskId: 345,
    status: "done", // the KANBAN status
    task: {
      _id: "88",
      voNumber: "VO-073",
      status: "Approved",
      signedAt: SIGNED,
      grandTotal: 57500,
      subTotal: 50000,
      certifiableValue: 50000,
    },
  };

  it("raises the row for a signed, uncertified VO from the wrapper shape", () => {
    const rec = toVariationRecord(wrapper);
    const rows = buildUncertifiedVariationQueue(
      [
        {
          id: rec.id,
          voNumber: rec.ref,
          status: rec.status ?? undefined,
          signedAt: rec.signedAt,
          grandTotal: rec.value,
          certifiableValue: rec.certifiable,
        },
      ],
      {},
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].headline).toMatch(/VO-073 was signed and has never been certified/);
    expect(rows[0].amount).toBe(50000);
  });

  it("the raw wrapper on its own is NOT enough — which is why Home adapts it", () => {
    expect(buildUncertifiedVariationQueue([wrapper as any], {}, NOW)).toEqual([]);
  });
});
