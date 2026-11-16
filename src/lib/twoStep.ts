/**
 * Two-step sign-in helpers: what the sign-in response asks for next, plain
 * error messages for the backend's refusal codes, and saving the session.
 */

import { clearTokens, storeTokens } from "./authSession";

export type LoginNext = "signed_in" | "code_required" | "setup_required";

export interface TwoStepStatus {
  enrolled: boolean;
  required: boolean;
  graceEndsAt: string | null;
  recoveryCodesLeft: number;
}

export function loginNext(data: any): LoginNext {
  if (data?.twoStep === "code_required" && data?.preAuthToken) return "code_required";
  if (data?.twoStep === "setup_required" && data?.preAuthToken) return "setup_required";
  return "signed_in";
}

const MESSAGES: Record<string, string> = {
  two_step_bad_code: "That code is wrong or has expired. Enter the current code from your app.",
  two_step_bad_recovery_code: "That recovery code is wrong or has already been used.",
  two_step_locked: "Too many wrong codes. Wait 15 minutes, then try again.",
  two_step_session_expired: "Your sign-in timed out. Enter your email and password again.",
  two_step_code_missing: "Enter the 6-digit code from your app, or a recovery code.",
  two_step_already_on: "Two-step sign-in is already on for this account.",
  two_step_required:
    "Your role certifies or approves payments, so two-step sign-in can't be turned off.",
  two_step_not_set_up: "Two-step sign-in isn't set up for this account.",
};

/** A plain message for a failed two-step call (axios error or our Error). */
export function twoStepErrorMessage(err: any, fallback = "Something went wrong. Try again."): string {
  const data = err?.response?.data;
  const code: string | undefined = data?.code ?? err?.code;
  if (code === "two_step_locked") {
    const seconds = Number(data?.retryAfterSeconds);
    if (seconds > 0) {
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      return `Too many wrong codes. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
    }
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (!err?.response && err?.message === "Network Error") {
    return "Can't reach Baselinq. Check your connection and try again.";
  }
  const text = [data?.error, data?.detail, data?.message].find((m) => typeof m === "string" && m.trim());
  return text || fallback;
}

/** The secret in groups of four, for typing into an app by hand. */
export function formatSecret(secret: string): string {
  return (secret || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

/** Keep only digits, at most 6. */
export function cleanCode(value: string): string {
  return (value || "").replace(/\D/g, "").slice(0, 6);
}

/** Store a completed sign-in, exactly as the password-only sign-in did. */
export function saveSession(data: { tokens?: { access?: string; refresh?: string }; user?: unknown }) {
  // storeTokens keeps the access token in memory in cookie mode, and in
  // localStorage otherwise (src/lib/authSession.ts).
  storeTokens(data?.tokens);
  if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));
}

/** Drop a stale session before a fresh sign-in's two-step calls. */
export function clearStaleSession() {
  clearTokens();
}

/** "14 November 2026", for a grace-period deadline. */
export function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

/** Recovery codes as a text file the user can keep. */
export function recoveryCodesFile(codes: string[], email?: string): string {
  const head = ["Baselinq recovery codes"];
  if (email) head.push(`Account: ${email}`);
  head.push("Each code works once, if you can't use your authenticator app.", "");
  return [...head, ...codes, ""].join("\n");
}
