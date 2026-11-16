import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanCode,
  formatSecret,
  loginNext,
  recoveryCodesFile,
  saveSession,
  twoStepErrorMessage,
} from "@/lib/twoStep";

describe("loginNext", () => {
  it("reads what the sign-in response asks for", () => {
    expect(loginNext({ tokens: { access: "a" } })).toBe("signed_in");
    expect(loginNext({ twoStep: "code_required", preAuthToken: "t" })).toBe("code_required");
    expect(loginNext({ twoStep: "setup_required", preAuthToken: "t" })).toBe("setup_required");
    // The status object on a normal sign-in is not a challenge.
    expect(loginNext({ tokens: {}, twoStep: { enrolled: false } })).toBe("signed_in");
    expect(loginNext({ twoStep: "code_required" })).toBe("signed_in");
  });
});

describe("twoStepErrorMessage", () => {
  const err = (data: object) => ({ response: { data } });
  it("maps backend codes to plain words", () => {
    expect(twoStepErrorMessage(err({ code: "two_step_bad_code" }))).toMatch(/wrong or has expired/);
    expect(twoStepErrorMessage(err({ code: "two_step_session_expired" }))).toMatch(/email and password again/);
    expect(twoStepErrorMessage(err({ code: "two_step_bad_recovery_code" }))).toMatch(/already been used/);
  });
  it("says how long a lock lasts", () => {
    expect(twoStepErrorMessage(err({ code: "two_step_locked", retryAfterSeconds: 61 }))).toBe(
      "Too many wrong codes. Try again in 2 minutes.",
    );
    expect(twoStepErrorMessage(err({ code: "two_step_locked", retryAfterSeconds: 30 }))).toMatch(/1 minute\./);
  });
  it("falls back to the server text, then the fallback", () => {
    expect(twoStepErrorMessage(err({ error: "Suspended." }))).toBe("Suspended.");
    expect(twoStepErrorMessage({}, "Nope")).toBe("Nope");
    expect(twoStepErrorMessage({ message: "Network Error" })).toMatch(/connection/);
  });
});

describe("formatting", () => {
  it("groups the secret and cleans codes", () => {
    expect(formatSecret("ABCDEFGHIJKLMN")).toBe("ABCD EFGH IJKL MN");
    expect(cleanCode("12 34-56 78")).toBe("123456");
  });
  it("writes a recovery codes file", () => {
    const text = recoveryCodesFile(["aaaaa-bbbbb", "ccccc-ddddd"], "pa@example.com");
    expect(text).toContain("Account: pa@example.com");
    expect(text).toContain("aaaaa-bbbbb\nccccc-ddddd");
  });
});

describe("saveSession", () => {
  beforeEach(() => localStorage.clear());
  it("stores tokens and user, and nothing when there are no tokens", () => {
    saveSession({ twoStep: "code_required" } as any);
    expect(localStorage.getItem("access")).toBeNull();
    saveSession({ tokens: { access: "a", refresh: "r" }, user: { id: 1 } });
    expect(localStorage.getItem("access")).toBe("a");
    expect(localStorage.getItem("refresh")).toBe("r");
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual({ id: 1 });
  });
});
