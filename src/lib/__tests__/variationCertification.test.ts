import { describe, expect, it } from "vitest";

import { certificationCell, toCertificationMap } from "@/lib/variationCertification";

const payload = {
  basis: "vat_exclusive",
  variations: [
    {
      voNumber: "VO-001",
      approvedValue: "100000.00",
      certifiedToDate: "50000.00",
      certifiedPosted: "30000.00",
      onUnpostedCertificates: "20000.00",
      remaining: "50000.00",
      fullyCertified: false,
      overCertified: false,
    },
    {
      voNumber: "VO-002",
      approvedValue: "40000.00",
      certifiedToDate: "45000.00",
      certifiedPosted: "45000.00",
      onUnpostedCertificates: "0.00",
      remaining: "0.00",
      fullyCertified: true,
      overCertified: true,
    },
    { voNumber: "", approvedValue: "1.00" },
  ],
};

describe("toCertificationMap", () => {
  const map = toCertificationMap(payload);

  it("splits certified (posted) from value on certificates not yet posted", () => {
    expect(map["VO-001"]).toEqual({
      approved: 100000,
      certified: 30000,
      unposted: 20000,
      remaining: 50000,
      over: 0,
    });
  });

  it("states how far an over-certified variation is over, from the server's own figures", () => {
    expect(map["VO-002"].over).toBe(5000);
    expect(map["VO-002"].remaining).toBe(0);
  });

  it("drops rows with no VO number rather than inventing a key", () => {
    expect(Object.keys(map)).toEqual(["VO-001", "VO-002"]);
  });

  it("leaves out rows from a backend that predates the posted split, rather than reading them as zero", () => {
    const old = toCertificationMap({ variations: [{ voNumber: "VO-001", approvedValue: "100.00", certifiedToDate: "100.00", remaining: "0.00" }] });
    expect(old).toEqual({});
  });

  it("reads an empty or malformed payload as no rows", () => {
    expect(toCertificationMap(undefined)).toEqual({});
    expect(toCertificationMap({ variations: null })).toEqual({});
  });
});

describe("certificationCell", () => {
  const map = toCertificationMap(payload);

  it("says nothing about a variation that is not approved", () => {
    expect(certificationCell("VO-001", false, 100000, map, "ready")).toEqual({ kind: "not-certifiable" });
  });

  it("does not report an omission as fully certified", () => {
    expect(certificationCell("VO-009", true, -25000, map, "ready")).toEqual({ kind: "not-tracked" });
  });

  it("is loading, never zero, while the ledger is on its way", () => {
    expect(certificationCell("VO-001", true, 100000, map, "loading")).toEqual({ kind: "loading" });
  });

  it("is unavailable, never zero, when the ledger failed to load", () => {
    expect(certificationCell("VO-001", true, 100000, map, "error")).toEqual({ kind: "unavailable" });
  });

  it("is unavailable when the ledger has no row for an approved variation", () => {
    expect(certificationCell("VO-404", true, 100000, map, "ready")).toEqual({ kind: "unavailable" });
    expect(certificationCell(null, true, 100000, map, "ready")).toEqual({ kind: "unavailable" });
  });

  it("returns the figures for an approved variation the ledger knows", () => {
    expect(certificationCell("VO-001", true, 100000, map, "ready")).toEqual({
      kind: "figures",
      figures: map["VO-001"],
    });
  });
});
