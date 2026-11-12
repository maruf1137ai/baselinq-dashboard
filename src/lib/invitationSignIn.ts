/**
 * Accepting an invitation addressed to an email that already has an account
 * needs that account signed in: the invitation link alone proves someone can
 * read the email, not that they own the account. The backend refuses the
 * accept otherwise (403 `sign_in_required` / `wrong_account`).
 *
 * These helpers decide whether the current browser session is that account,
 * and send the invitee through /login and back to the invitation.
 */

const INVITATION_PATH = /^\/accept-(?:appointed-)?invitation\/[A-Za-z0-9_-]+\/?$/;

/**
 * The `next` value /login honours. Only an invitation page on this site
 * qualifies: anything else (another site, a protocol-relative URL, an
 * arbitrary app route) is dropped, so the parameter can't be used to send
 * someone elsewhere after they sign in.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return INVITATION_PATH.test(raw) ? raw : null;
}

/** The sign-in page, set to come back to `invitationPath` afterwards. */
export function loginUrlFor(invitationPath: string): string {
  return `/login?next=${encodeURIComponent(invitationPath)}`;
}

/** The email of the account this browser is signed in as, lower-cased. */
export function signedInEmail(): string | null {
  try {
    if (!localStorage.getItem("access")) return null;
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
    return email || null;
  } catch {
    return null;
  }
}

/** Whether this browser is signed in as the account `email` belongs to. */
export function isSignedInAs(email: string | null | undefined): boolean {
  const current = signedInEmail();
  return !!current && !!email && current === email.trim().toLowerCase();
}
