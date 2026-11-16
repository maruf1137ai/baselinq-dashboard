/**
 * "Analyze with AI" is offered only where the backend can answer: the task
 * chat and the checked analysis accept VO, RFI, CPI, SI and DC. Anything else
 * (GI, IC, a claim) would open a chat that fails.
 */
import { describe, expect, it } from "vitest";

import { taskAnalysisEndpoint } from "../taskAiAnalysis";

describe("taskAnalysisEndpoint", () => {
  it.each([
    ["VO", "ai_analysis/vo/"],
    ["RFI", "ai_analysis/rfi/"],
    ["CPI", "ai_analysis/cpi/"],
    ["SI", "ai_analysis/si/"],
    ["DC", "ai_analysis/dc/"],
  ])("gives the analysis endpoint for %s", (type, endpoint) => {
    expect(taskAnalysisEndpoint(type)).toBe(endpoint);
  });

  it.each(["GI", "IC", "CLAIM", "vo", "toString", "", null, undefined])(
    "has no endpoint for %j, so the button is not shown",
    (type) => {
      expect(taskAnalysisEndpoint(type as string | null | undefined)).toBeNull();
    },
  );
});
