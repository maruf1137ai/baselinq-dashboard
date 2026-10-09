/**
 * The checked analysis, in three or four lines, appended to Linq's opening message in the chat.
 *
 * The chat's welcome already reads the task against the contract — rates, scope, programme risk,
 * procedure, a recommendation, the price table and the clause chips. What it cannot say is whether
 * a *checked* analysis has been run and what it concluded. That is all this adds: the verdict, how
 * many of its clause citations were actually found in the contract, and the one or two facts that
 * need acting on. Everything else the analysis holds is a question away in the same chat.
 */

/** Construction shorthand that must not be title-cased into "Vo Implications" / "Eot Entitlement". */
const ACRONYMS = new Set(["vo", "rfi", "si", "cpi", "dc", "eot", "ld", "lds", "boq", "ai", "pc", "id"]);

export function titleCase(key: string): string {
  return key
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => (ACRONYMS.has(word.toLowerCase())
      ? word.toUpperCase()
      : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function plain(value: unknown): string {
  return String(value ?? "").replace(/_/g, " ").trim();
}

/** The citation line, worded exactly as CitationValidationBanner words it on screen. */
export function citationLine(validation: unknown): string {
  if (!validation || typeof validation !== "object") return "";
  const v = validation as { counts?: Record<string, number>; invalid_citations?: string[]; total_citations?: number };
  const counts = v.counts;
  const invalid = Array.isArray(v.invalid_citations) ? v.invalid_citations : [];

  if (counts && typeof counts === "object") {
    const verified = counts.verified || 0;
    const missing = counts.unverified || 0;
    const quote = counts.number_only || 0;
    const standard = counts.reference_only || 0;
    const checked = verified + missing + quote + standard;
    if (checked === 0) return "";
    const parts = [
      `${verified} of ${checked} clause citation${checked === 1 ? "" : "s"} verified in your contract`,
      missing ? `${missing} not found in your contract` : "",
      quote ? `${quote} with a quote that doesn't match` : "",
      standard ? `${standard} only in the standard form` : "",
    ].filter(Boolean);
    let line = `${parts.join(" · ")}.`;
    if (missing > 0 && invalid.length > 0) {
      line += ` Not found: ${invalid.join(", ")} — check before relying on them.`;
    }
    return line;
  }
  if (invalid.length > 0) {
    return `${invalid.length} of ${v.total_citations ?? invalid.length} clause citation`
      + `${invalid.length === 1 ? "" : "s"} could not be verified against the indexed contract. `
      + `Unverified: ${invalid.join(", ")}.`;
  }
  if (typeof v.total_citations === "number" && v.total_citations > 0) {
    return `${v.total_citations} clause citation${v.total_citations === 1 ? "" : "s"} verified against the indexed contract.`;
  }
  return "";
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** The one or two things that need acting on: a missed deadline, then the worst risk flags. */
function keyFacts(data: Record<string, any>): string[] {
  const facts: string[] = [];

  const deadline = data.deadline_status;
  if (deadline?.is_overdue) {
    facts.push(plain(deadline.message)
      || `Overdue by ${deadline.days_overdue} day${deadline.days_overdue === 1 ? "" : "s"} — immediate action required.`);
  }

  const flags = Array.isArray(data.risk_flags) ? data.risk_flags : [];
  const ranked = flags
    .map((flag: any) => (typeof flag === "string"
      ? { title: flag, severity: "" }
      : { title: plain(flag?.title), severity: plain(flag?.severity).toUpperCase() }))
    .filter((flag: { title: string }) => flag.title)
    .sort((a: { severity: string }, b: { severity: string }) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const worst = ranked.slice(0, facts.length ? 1 : 2)
    .map((flag: { title: string; severity: string }) =>
      flag.severity ? `${flag.title} (${flag.severity})` : flag.title);
  if (worst.length) facts.push(`Flagged: ${worst.join("; ")}.`);

  return facts;
}

/**
 * `analysisData` is the response the task page received:
 * `{ analysis, price_breakdown?, mock_used, cached, model_name, cached_at? }`.
 * Returns "" when there is nothing checked to report.
 */
export function analysisSummary(analysisData: any, taskType = "task"): string {
  const data = analysisData && typeof analysisData === "object" && "analysis" in analysisData
    ? analysisData.analysis
    : analysisData;
  if (!data || typeof data !== "object") return "";

  const id = data.vo_id || data.rfi_id || data.si_id || data.cpi_id || data.dc_id || taskType;
  const verdict = [
    plain(data.overall_status || data.overall_assessment).toUpperCase(),
    data.risk_level ? `${plain(data.risk_level).toUpperCase()} RISK` : "",
  ].filter(Boolean).join(" · ");

  const lines = [`**Checked verdict — ${id}:** ${verdict || "see below"}`];

  const citations = citationLine(data.validation);
  if (citations) lines.push(citations);

  const facts = keyFacts(data);
  if (facts.length) lines.push(facts.join(" "));

  if (analysisData?.mock_used) {
    lines.push("_Demo result — AI is not configured on this server, so this is not a real analysis._");
  }

  return lines.join("\n\n");
}
