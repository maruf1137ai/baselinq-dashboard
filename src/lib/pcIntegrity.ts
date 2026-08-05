/**
 * Reading the server's integrity verdict on a payment certificate.
 *
 * `tasks/pc_integrity.py` refuses a certificate that would over-certify a
 * variation, and answers 400 with:
 *
 *     { "integrity": ["…", "…"], "issues": [ { "code", "detail", … } ] }
 *
 * The drawer used to fire the create without awaiting it and close
 * unconditionally, so that body was thrown away along with every line item the
 * user had entered. `postData` rethrows the raw axios error precisely so this
 * is reachable — nothing was reading it.
 *
 * The parsing lives here, out of the component, so the mapping from a server
 * message to the row it belongs against can be tested. Nothing in this module
 * invents text: if the server did not say it, it is not shown.
 */

export interface PCIntegrityIssue {
  /** Machine code where the server gave one (e.g. `vo_over_certified`). */
  code?: string;
  /** Human sentence — the server names the variation and states the arithmetic. */
  detail: string;
  /** Server-named field path, when present (e.g. `voItems[2].thisPeriod`). */
  field?: string;
  /** Variation this issue is about, when the server named it outright. */
  voNumber?: string;
}

export interface PCIntegrityError {
  /** Top-level `integrity` messages — the summary of why it was refused. */
  messages: string[];
  /** Per-problem detail, where the server broke it down. */
  issues: PCIntegrityIssue[];
}

const asString = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

/**
 * Pull the integrity verdict out of a rejected `postData` promise.
 *
 * Returns `null` when the failure was something else — a network drop, a 500,
 * a permission error. Those are not integrity findings and must not be dressed
 * up as one; the caller falls back to the ordinary error message.
 */
export function extractPCIntegrityError(err: unknown): PCIntegrityError | null {
  const data = (err as any)?.response?.data;
  if (!data || typeof data !== "object") return null;

  const rawMessages = data.integrity;
  const messages: string[] = Array.isArray(rawMessages)
    ? rawMessages.map(asString).filter(Boolean)
    : typeof rawMessages === "string" && rawMessages.trim()
      ? [rawMessages.trim()]
      : [];

  const rawIssues = Array.isArray(data.issues) ? data.issues : [];
  const issues: PCIntegrityIssue[] = rawIssues
    .map((raw: any): PCIntegrityIssue | null => {
      if (typeof raw === "string") {
        return raw.trim() ? { detail: raw.trim() } : null;
      }
      if (!raw || typeof raw !== "object") return null;
      const detail = asString(raw.detail ?? raw.message ?? raw.error).trim();
      if (!detail) return null;
      const voNumber = asString(raw.voNumber ?? raw.vo_number).trim();
      const field = asString(raw.field ?? raw.field_name).trim();
      const code = asString(raw.code).trim();
      return {
        detail,
        ...(voNumber ? { voNumber } : {}),
        ...(field ? { field } : {}),
        ...(code ? { code } : {}),
      };
    })
    .filter((i): i is PCIntegrityIssue => i !== null);

  if (messages.length === 0 && issues.length === 0) return null;
  return { messages, issues };
}

/**
 * Does `detail` name `ref`, as a reference rather than as a prefix of a longer
 * one? Plain `includes` would put a message about VO-10 against VO-1.
 */
function mentionsReference(detail: string, ref: string): boolean {
  if (!ref) return false;
  const haystack = detail.toLowerCase();
  const needle = ref.toLowerCase();
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    const before = detail[at - 1];
    const after = detail[at + ref.length];
    const wordish = (c?: string) => c !== undefined && /[A-Za-z0-9-]/.test(c);
    if (!wordish(before) && !wordish(after)) return true;
    from = at + 1;
  }
}

export interface GroupedIntegrityIssues {
  /** Variation number → the server's sentences about it. */
  byVo: Record<string, string[]>;
  /** Everything that could not be attributed to a row on this form. */
  general: string[];
}

/**
 * Put each issue against the variation it came from, so the message appears
 * beside the field the operator has to change rather than only in a banner.
 *
 * Attribution is by the server's own `voNumber`, then by a field path naming
 * one, then by the variation being named in the sentence. Anything left over
 * stays general — an issue is never guessed onto a row.
 */
export function groupIntegrityIssues(
  issues: PCIntegrityIssue[],
  voNumbers: string[],
): GroupedIntegrityIssues {
  const known = voNumbers.filter(Boolean);
  const byVo: Record<string, string[]> = {};
  const general: string[] = [];

  const push = (ref: string, detail: string) => {
    (byVo[ref] ||= []).push(detail);
  };

  for (const issue of issues) {
    const explicit =
      issue.voNumber && known.includes(issue.voNumber) ? issue.voNumber : undefined;
    const fromField = explicit
      ? undefined
      : known.find(ref => issue.field && mentionsReference(issue.field, ref));
    const fromDetail =
      explicit || fromField
        ? undefined
        : known.find(ref => mentionsReference(issue.detail, ref));

    const ref = explicit ?? fromField ?? fromDetail;
    if (ref) push(ref, issue.detail);
    else general.push(issue.detail);
  }

  return { byVo, general };
}

/**
 * One line to show when the failure was not an integrity finding. Prefers the
 * server's own wording over a status code.
 */
export function describePCSubmitError(err: unknown): string {
  const data = (err as any)?.response?.data;
  const candidates = [data?.error, data?.detail, data?.message, (err as any)?.message];
  const found = candidates.find(
    (m: unknown) => typeof m === "string" && m.trim().length > 0,
  );
  return (found as string) || "Could not create the certificate.";
}
