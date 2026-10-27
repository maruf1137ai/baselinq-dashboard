/**
 * The two-person rule on a Variation Order (QA BUG-08): whoever recommended a
 * VO is not offered Approve & Sign — the server refuses them
 * (`recommender_cannot_approve`).
 */
import { describe, expect, it } from "vitest";

import { isVoRecommender, voRecommendedByName } from "@/lib/voApprovalRules";

const recommended = (userId: string | number | null, name = "Test PA") => ({
  status: "Recommended",
  recommendedBy: userId === null ? null : { userId: String(userId), name },
});

describe("isVoRecommender", () => {
  it("is true for the person who recommended it", () => {
    expect(isVoRecommender(recommended(7), 7)).toBe(true);
    expect(isVoRecommender(recommended(7), "7")).toBe(true);
  });

  it("is false for anybody else", () => {
    expect(isVoRecommender(recommended(7), 8)).toBe(false);
  });

  it("is false once the VO has moved on, or was never recommended", () => {
    expect(isVoRecommender({ ...recommended(7), status: "Approved" }, 7)).toBe(false);
    expect(isVoRecommender({ status: "Priced", recommendedBy: null }, 7)).toBe(false);
    expect(isVoRecommender(recommended(null), 7)).toBe(false);
  });

  it("never matches an unknown user", () => {
    expect(isVoRecommender(recommended(7), undefined)).toBe(false);
    expect(isVoRecommender(recommended(7), null)).toBe(false);
    expect(isVoRecommender(null, 7)).toBe(false);
  });
});

describe("voRecommendedByName", () => {
  it("reads the recommender from the VO record", () => {
    expect(voRecommendedByName(recommended(7, "Jane Smith"))).toBe("Jane Smith");
  });

  it("is null when nobody has recommended it", () => {
    expect(voRecommendedByName({ status: "Priced", recommendedBy: null })).toBeNull();
    expect(voRecommendedByName(recommended(7, "  "))).toBeNull();
  });
});
