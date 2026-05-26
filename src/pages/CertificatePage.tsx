/**
 * Werner spec — public certificate page.
 *
 * Accessed at /certificates/:type/:token. No auth required — possession of
 * the UUID4 token is the access grant. Renders an email-template-style,
 * print-friendly read-only view of an SI / VO / Claim / IC.
 *
 * Visual style: transactional-email aesthetic. Centered card on a soft
 * neutral background, narrow column (~640px) like Stripe/Linear receipts,
 * thin dividers, table-style data rows. Browser print produces a clean
 * A4 layout — the toolbar hides itself via @media print.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ExternalLink, Copy as CopyIcon, Printer } from "lucide-react";

import {
  CertificateData,
  buildCertificateUrl,
  formatCertCurrency,
  formatCertDate,
  getCertificateTypeLabel,
} from "@/lib/certificate";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export default function CertificatePage() {
  const { type, token } = useParams<{ type: string; token: string }>();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!type || !token) {
      setStatus("not-found");
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/certificates/${type}/${token}/`, {
          signal: ac.signal,
          // Bypass HTTP cache. A CDN / reverse proxy was returning 304
          // Not Modified on the certificate URL, which made fetch's
          // `resp.ok` false (304 isn't in 2xx) and the page rendered
          // "error". Certificates are tiny JSON payloads — no benefit
          // to caching them client-side, and a stale cached cert would
          // be wrong anyway once revoked.
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (resp.status === 404) {
          setStatus("not-found");
          return;
        }
        if (!resp.ok) {
          setStatus("error");
          return;
        }
        const data = (await resp.json()) as CertificateData;
        setCert(data);
        setStatus("ready");
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        setStatus("error");
      }
    })();
    return () => ac.abort();
  }, [type, token]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading certificate…
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-md border border-border bg-white p-8 text-center">
        <h1 className="text-lg font-normal text-foreground tracking-tight">Certificate not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This certificate link is invalid, has expired, or has been revoked.
        </p>
      </div>
    );
  }

  if (status === "error" || !cert) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-md border border-border bg-white p-8 text-center">
        <h1 className="text-lg font-normal text-foreground tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn't load this certificate. Please try again later.
        </p>
      </div>
    );
  }

  const typeLabel = getCertificateTypeLabel(cert.type);
  const url = buildCertificateUrl(cert.type, token);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* best-effort */
    }
  };

  return (
    <>
      {/* Email-template print rules — hide the toolbar, flatten shadows,
          drop the page background colour so paper output looks clean. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .cert-shell { background: white !important; padding: 0 !important; }
          .cert-card {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="cert-shell min-h-screen bg-[#f4f4f5] py-10 px-4">
        {/* Toolbar — copy + open-source + print. Sits above the card so
            it doesn't interrupt the email aesthetic; hidden when printing. */}
        <div className="no-print mx-auto mb-4 flex max-w-[640px] items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Read-only certificate
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-slate-100"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-foreground hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        {/* Card: white, narrow column, subtle border + shadow — matches
            transactional-email layouts (Stripe, Linear, Vercel receipts). */}
        <div className="cert-card mx-auto max-w-[640px] overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          {/* Header strip — soft tint, centered brand line + cert type. */}
          <div className="border-b border-border bg-slate-50 px-8 py-6 text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Baselinq
            </div>
            <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              {typeLabel} Certificate
            </div>
            <h1 className="mt-1 text-2xl font-normal tracking-tight text-foreground">
              {cert.number}
            </h1>
            {cert.title && (
              <p className="mt-1 text-sm text-muted-foreground">{cert.title}</p>
            )}
          </div>

          {/* Intro paragraph — sets tone like a transactional email body. */}
          <div className="px-8 pt-6 pb-2 text-sm text-foreground">
            This is an official {typeLabel.toLowerCase()} record from{" "}
            <span className="font-normal">{cert.project?.name || "the project"}</span>
            {cert.signed_at ? " issued and signed below." : "."} Possession of this
            link grants read access. Print the page (Ctrl/Cmd + P) for a paper copy.
          </div>

          {/* Details table — email-style key/value rows with thin dividers. */}
          <div className="px-8 py-4">
            <dl className="divide-y divide-border text-sm">
              <DetailRow label="Project">
                <span>
                  {cert.project?.name}
                  {cert.project?.project_number ? (
                    <span className="text-muted-foreground"> · {cert.project.project_number}</span>
                  ) : null}
                </span>
              </DetailRow>

              {cert.signed_by && (
                <DetailRow label="Signed by">
                  <span>
                    {cert.signed_by.name}
                    {cert.signed_by.role ? (
                      <span className="text-muted-foreground"> · {cert.signed_by.role}</span>
                    ) : null}
                  </span>
                </DetailRow>
              )}

              <DetailRow label="Signed at">{formatCertDate(cert.signed_at)}</DetailRow>
              <DetailRow label="Issued at">{formatCertDate(cert.issued_at)}</DetailRow>

              {/* Type-specific rows */}
              {cert.type === "vo" && (
                <>
                  <DetailRow label="Approved amount">
                    {formatCertCurrency(cert.approved_amount, cert.currency)}
                  </DetailRow>
                  <DetailRow label="Time extension">
                    {cert.time_extension_approved != null
                      ? `${cert.time_extension_approved} day${cert.time_extension_approved === 1 ? "" : "s"}`
                      : "—"}
                  </DetailRow>
                </>
              )}
              {cert.type === "ic" && (
                <>
                  <DetailRow label="Raised by">{cert.raised_by ?? "—"}</DetailRow>
                  <DetailRow label="Respondent">{cert.respondent ?? "—"}</DetailRow>
                  <DetailRow label="Intention lodged">{formatCertDate(cert.intention_at)}</DetailRow>
                  <DetailRow label="Risk level">{cert.risk_level ?? "—"}</DetailRow>
                </>
              )}
              {cert.type === "claim" && (
                <>
                  <DetailRow label="Days claimed">{cert.time_days_claimed ?? "—"}</DetailRow>
                  <DetailRow label="Amount claimed">
                    {formatCertCurrency(cert.cost_amount_claimed, cert.currency)}
                  </DetailRow>
                  <DetailRow label="Formal claim submitted">
                    {formatCertDate(cert.formal_claim_at)}
                  </DetailRow>
                </>
              )}
            </dl>
          </div>

          {cert.description && (
            <div className="border-t border-border px-8 py-5">
              <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                Description
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {cert.description}
              </p>
            </div>
          )}

          {cert.audit_trail && cert.audit_trail.length > 0 && (
            <div className="border-t border-border px-8 py-5">
              <div className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                Audit trail
              </div>
              <ul className="space-y-2.5 text-sm">
                {cert.audit_trail.map((row, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 border-b border-border/50 pb-2.5 last:border-b-0">
                    <div className="min-w-0">
                      <div className="text-foreground">{row.description}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{row.actor}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      {formatCertDate(row.at)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Email-style footer — quiet, with the public URL printed as
              the only place the raw link appears (so a printed copy can
              still be re-typed if needed). */}
          <div className="border-t border-border bg-slate-50 px-8 py-5 text-center">
            <div className="text-xs text-muted-foreground">
              Generated by Baselinq · token-gated public read-only view
            </div>
            <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
              {url}
            </div>
            <div className="no-print mt-3">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Open in new tab
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Email-style label/value row with a thin divider. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
