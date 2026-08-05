import { describe, it, expect } from "vitest";

import {
  describePCSubmitError,
  extractPCIntegrityError,
  groupIntegrityIssues,
} from "../pcIntegrity";

/** The shape `postData` rethrows — a raw axios error. */
const axiosError = (status: number, data: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });

const REFUSAL = {
  integrity: [
    "This certificate would over-certify VO-003.",
    "Certificate refused — no amounts were saved.",
  ],
  issues: [
    {
      code: "vo_over_certified",
      field: "voItems[1].thisPeriod",
      detail:
        "VO-003: 250 000,00 already certified against an approved value of 300 000,00; only 50 000,00 remains.",
    },
    {
      code: "contract_sum_exceeded",
      detail: "Cumulative certified value exceeds the contract sum.",
    },
  ],
};

describe("extractPCIntegrityError", () => {
  it("reads the refusal body the drawer used to throw away", () => {
    const parsed = extractPCIntegrityError(axiosError(400, REFUSAL));
    expect(parsed).not.toBeNull();
    expect(parsed!.messages).toHaveLength(2);
    expect(parsed!.messages[0]).toContain("VO-003");
    expect(parsed!.issues).toHaveLength(2);
    expect(parsed!.issues[0].code).toBe("vo_over_certified");
    expect(parsed!.issues[0].field).toBe("voItems[1].thisPeriod");
  });

  it("accepts a bare string for `integrity`", () => {
    const parsed = extractPCIntegrityError(
      axiosError(400, { integrity: "Refused." }),
    );
    expect(parsed!.messages).toEqual(["Refused."]);
  });

  it("accepts plain strings in `issues`", () => {
    const parsed = extractPCIntegrityError(
      axiosError(400, { issues: ["VO-003 is fully certified."] }),
    );
    expect(parsed!.issues).toEqual([{ detail: "VO-003 is fully certified." }]);
  });

  it("reads the snake_case spellings the API also uses", () => {
    const parsed = extractPCIntegrityError(
      axiosError(400, {
        issues: [{ vo_number: "VO-007", detail: "Over-certified.", field_name: "x" }],
      }),
    );
    expect(parsed!.issues[0].voNumber).toBe("VO-007");
    expect(parsed!.issues[0].field).toBe("x");
  });

  it("returns null for a failure that is not an integrity finding", () => {
    expect(extractPCIntegrityError(axiosError(500, { detail: "Server error" }))).toBeNull();
    expect(extractPCIntegrityError(axiosError(403, { error: "Forbidden" }))).toBeNull();
    expect(extractPCIntegrityError(new Error("Network Error"))).toBeNull();
    expect(extractPCIntegrityError(undefined)).toBeNull();
  });

  it("drops empty issues rather than rendering a blank row", () => {
    const parsed = extractPCIntegrityError(
      axiosError(400, { integrity: ["Refused."], issues: [{}, "", { detail: "  " }] }),
    );
    expect(parsed!.issues).toEqual([]);
  });
});

describe("groupIntegrityIssues", () => {
  const vos = ["VO-001", "VO-003", "VO-010"];

  it("puts an issue against the variation named in its sentence", () => {
    const { byVo, general } = groupIntegrityIssues(
      extractPCIntegrityError(axiosError(400, REFUSAL))!.issues,
      vos,
    );
    expect(byVo["VO-003"]).toHaveLength(1);
    expect(byVo["VO-003"][0]).toContain("50 000,00 remains");
    expect(general).toEqual(["Cumulative certified value exceeds the contract sum."]);
  });

  it("prefers the server's own voNumber over parsing the sentence", () => {
    const { byVo } = groupIntegrityIssues(
      [{ voNumber: "VO-001", detail: "See VO-003 for context." }],
      vos,
    );
    expect(byVo["VO-001"]).toEqual(["See VO-003 for context."]);
    expect(byVo["VO-003"]).toBeUndefined();
  });

  it("uses the field path when the sentence names nothing", () => {
    const { byVo } = groupIntegrityIssues(
      [{ field: "voItems.VO-010.thisPeriod", detail: "Over-certified." }],
      vos,
    );
    expect(byVo["VO-010"]).toEqual(["Over-certified."]);
  });

  it("does not put a VO-010 message against VO-001", () => {
    const { byVo, general } = groupIntegrityIssues(
      [{ detail: "VO-010 has nothing left to certify." }],
      ["VO-001", "VO-010"],
    );
    expect(byVo["VO-010"]).toHaveLength(1);
    expect(byVo["VO-001"]).toBeUndefined();
    expect(general).toEqual([]);
  });

  it("leaves an unattributable issue general rather than guessing a row", () => {
    const { byVo, general } = groupIntegrityIssues(
      [{ detail: "Retention rate has changed since this draft was started." }],
      vos,
    );
    expect(byVo).toEqual({});
    expect(general).toHaveLength(1);
  });
});

describe("describePCSubmitError", () => {
  it("prefers the server's own wording", () => {
    expect(describePCSubmitError(axiosError(403, { error: "Not permitted" }))).toBe(
      "Not permitted",
    );
    expect(describePCSubmitError(axiosError(400, { detail: "Bad period" }))).toBe(
      "Bad period",
    );
  });

  it("falls back to the thrown message, then to a plain sentence", () => {
    expect(describePCSubmitError(new Error("Network Error"))).toBe("Network Error");
    expect(describePCSubmitError({})).toBe("Could not create the certificate.");
  });
});
