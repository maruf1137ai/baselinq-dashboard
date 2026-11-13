/**
 * Help / Billing reference page — Baselinq's platform fee, for project users.
 *
 * The plain-English story of how the fee is worked out, how the monthly
 * invoice reaches the project, how to pay it, and what each status means.
 * Same reference family as HelpFinance.tsx (same shape and styling); the
 * "who can see it" rows are LIVE, read from this project's Roles &
 * Permissions exactly as HelpFinance does.
 *
 * Source of truth:
 *   - Fee base (ex-VAT, retention, VO de-duplication) → billing/fee_base.py
 *   - Rate (standard or negotiated, 0.5–1%), VAT 15%    → billing/models.py
 *                                     (PlatformBillingSettings, ProjectFeeConfig)
 *   - When a fee is raised / credited back             → billing/signals.py, billing/accrual.py
 *   - Monthly invoice, due date, carry-forward          → billing/invoicing.py
 *   - 30-day read-only lock                             → billing/lockout.py
 *   - Drafts/cancelled hidden from the project          → billing/views.py
 *   - Notifications and the invoice email               → billing/notify.py
 *   - Only Baselinq administrators change billing       → permissions.core.is_billing_admin
 *
 * Update this page whenever those rules change. Baselinq's own operating
 * guide is the admin panel's Billing → Guide (pages/account/admin/billing/BillingGuide.tsx).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";
import { useGrantedRoles } from "@/hooks/useGrantedRoles";
import { useRoles } from "@/hooks/useRolePermissions";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import { formatRoleList, unionRoleCodes } from "@/lib/formatRoleList";

type Row = { action: string; who: string; when: string; note?: string; youCan?: boolean };

/** A section is either a numbered walk-through or a who/what/when table. */
type Section =
  | { type: string; title: string; description: string; steps: string[] }
  | { type: string; title: string; description: string; rows: Row[]; headings?: [string, string, string] };

/** Row action -> permission code whose grants decide its "who". */
const ROW_PERMISSION: Record<string, string[]> = {
  "See the fee on each certificate and variation": ["finance.platform_fees.view"],
  "See and pay Baselinq's invoices": ["finance.invoices.view"],
  "See the billing terms": ["billing.terms.view"],
};
const ROW_CODES = [...new Set(Object.values(ROW_PERMISSION).flat())];

export const BILLING_SECTIONS: Section[] = [
  {
    type: "FEE",
    title: "How the fee works",
    description:
      "Baselinq charges a small platform fee on the money that moves through your project — normally 1%, unless a different rate was agreed for this project. VAT at 15% is added to that fee, because Baselinq pays VAT over to SARS like any other supplier.",
    steps: [
      "Billing is on for every project by default, at the standard rate unless a different rate was agreed. Settings → Billing shows whether it is active on yours.",
      "A fee is recorded automatically at two moments only: when a variation order is signed and approved, and when a payment certificate reaches Posted — its last step, after Approved. Nobody on the project clicks anything for it.",
      "Nothing is charged while a certificate is a draft, submitted or approved but not yet posted, and nothing extra is charged if a posted certificate is edited later.",
      "The fee is worked out on the value EXCLUDING VAT. For a payment certificate that is the value certified this period, less retention, plus any retention released.",
      "Each rand is charged once. A variation is charged when it is approved, so when that same work later appears in a payment certificate it is taken out of the certificate's fee — you are never charged twice for it.",
      "VAT at 15% is then added to the fee itself. You never pay a fee on VAT.",
      "If your project has a cap, fees stop once the total fee reaches it.",
      "If a certificate stops being Posted, or a variation is no longer approved, its fee is credited back automatically. A variation that moves to Closed keeps its fee — Closed means the work was completed.",
      "If Baselinq switched billing off for a while, certificates posted and variations approved in that time are charged when it is switched back on — they then appear on the next invoice like any other fee.",
      "The Financial Position page shows the running total of Baselinq fees on the project, with the rate you are charged in its title.",
    ],
  },
  {
    type: "EXAMPLE",
    title: "A worked example",
    description: "A project on the standard 1%, with 5% retention.",
    headings: ["What happened", "Fee worked out on", "What the project is charged"],
    rows: [
      {
        action: "A variation order for R100 000 (excl. VAT) is approved",
        who: "R100 000",
        when: "1% = R1 000 fee + R150 VAT = R1 150",
      },
      {
        action: "A payment certificate for R500 000 is posted — it includes that R100 000 variation",
        who: "R500 000 − R25 000 retention − R100 000 already charged = R375 000",
        when: "1% = R3 750 fee + R562,50 VAT = R4 312,50",
      },
      {
        action: "End of the month",
        who: "Both fees together",
        when: "One invoice: R4 750 fee + R712,50 VAT = R5 462,50",
        note: "Not two separate bills — one invoice a month, listing every certificate and variation it covers.",
      },
    ],
  },
  {
    type: "INVOICE",
    title: "The monthly invoice",
    description:
      "Baselinq does not bill you for every certificate. Fees build up during the month and arrive as ONE invoice after the month ends.",
    steps: [
      "During the month: each fee appears under Settings → Billing as \"Not invoiced\".",
      "After the month ends, Baselinq prepares the invoice. It lists every fee still not invoiced — including any older one that was missed — each with its certificate or variation reference. Any credits are taken off it.",
      "When Baselinq issues it, it gets a tax invoice number (BLQ-…) and a due date, 14 days after it is issued.",
      "You are told twice: the billing contact named in Settings → Billing receives it by email, and everyone on the project who can see invoices gets a notification.",
      "It then shows under Settings → Billing as \"Unpaid\", and each fee on it changes from \"Not invoiced\" to \"Invoiced · BLQ-…\", which links straight to the invoice.",
    ],
  },
  {
    type: "PAYING",
    title: "Paying an invoice",
    description: "Payment is by bank transfer — there is no card payment inside Baselinq.",
    steps: [
      "Open Settings → Billing and click the invoice. It shows every line, the platform fee, the VAT (15%) and the total due.",
      "Use the bank details shown under \"Pay by bank transfer\", and the invoice number (BLQ-…) as the payment reference so Baselinq can match your payment.",
      "Once the money arrives, Baselinq marks the invoice paid. You get a \"Payment received\" notification, the invoice shows \"Paid\", and every fee on it shows \"Paid\".",
      "If the due date passes before payment arrives, the invoice shows \"Overdue\". Pay it as normal — the status updates as soon as Baselinq records the payment.",
    ],
  },
  {
    type: "LOCK",
    title: "If an invoice stays unpaid",
    description:
      "An invoice more than 30 days past its due date makes the whole project read-only until it is paid.",
    steps: [
      "A red bar appears across the project naming the invoice: \"This project is read-only\".",
      "Everyone can still open, read and download everything — documents, certificates, reports and messages.",
      "Nobody on the project can create, edit or approve anything, or send messages, while the lock is on.",
      "Pay the invoice as above. The lock lifts by itself as soon as Baselinq records the payment.",
      "If you need more time, contact your Baselinq account manager — Baselinq can hold the lock off until an agreed date.",
    ],
  },
  {
    type: "STATUSES",
    title: "What each status means",
    description: "The same words appear on a fee and on an invoice, both on Settings → Billing.",
    headings: ["Status", "Where you see it", "What it means"],
    rows: [
      { action: "Not invoiced", who: "A fee", when: "Recorded, and waiting for the next monthly invoice. Nothing to pay yet." },
      { action: "Invoiced · BLQ-…", who: "A fee", when: "On an invoice Baselinq has sent you, which has not been paid yet." },
      { action: "Unpaid", who: "An invoice", when: "Sent to you and not yet paid. Still within its due date." },
      { action: "Overdue", who: "A fee or an invoice", when: "Still unpaid after the invoice's due date." },
      { action: "Paid", who: "A fee or an invoice", when: "Baselinq has received the money." },
      {
        action: "Reversed / Credit",
        who: "A fee",
        when: "A fee Baselinq took back, for example because it was charged in error. The credit comes off your next invoice.",
      },
    ],
  },
  {
    type: "ACCESS",
    title: "Who can see it",
    description:
      "Everything here is read-only for the project. Nobody on the project can change the fee, the rate or an invoice — not even Client/Owner. Those are set by Baselinq.",
    rows: [
      {
        action: "See the fee on each certificate and variation",
        who: "The roles granted \"View the Platform Fees tab\" on Roles & Permissions.",
        when: "Settings → Billing, anytime.",
      },
      {
        action: "See and pay Baselinq's invoices",
        who: "The roles granted \"View Baselinq invoices\" on Roles & Permissions.",
        when: "Settings → Billing, anytime.",
        note: "These are also the people notified when an invoice is issued or paid.",
      },
      {
        action: "See the billing terms",
        who: "The roles granted \"View billing terms\" on Roles & Permissions.",
        when: "Settings → Billing, anytime.",
      },
      {
        action: "Change the rate, cap or who is billed",
        who: "Baselinq only.",
        when: "Contact your Baselinq account manager — for example to update the billing contact or to query a fee.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "A change of rate only ever applies to fees recorded after the change. A fee already charged — and an invoice already sent — never changes.",
  "Each certificate and each variation is charged once only, however many times it is saved.",
  "VAT is always shown on its own line: on every fee, every invoice line, and the invoice totals.",
  "If a fee was charged in error, Baselinq reverses it with a credit. The original fee stays on record and the credit appears on your next invoice, so every number can be traced.",
  "If your billing contact changes, tell Baselinq so the next invoice is emailed to the right person.",
];

const isSteps = (s: Section): s is Extract<Section, { steps: string[] }> => "steps" in s;

export default function HelpBilling() {
  const navigate = useNavigate();
  const projectId = useSelectedProjectId();
  const grants = useGrantedRoles(ROW_CODES, projectId);
  const { data: roles } = useRoles(projectId);
  const { data: effective } = useEffectivePermissions(projectId ? Number(projectId) : null);

  const roleNamesByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles ?? []) map[r.code] = r.name;
    return map;
  }, [roles]);

  // Static prose until both the grants and the role names have arrived —
  // never a half-computed sentence.
  const sections = useMemo(() => {
    if (!grants || Object.keys(roleNamesByCode).length === 0) return BILLING_SECTIONS;
    return BILLING_SECTIONS.map((section) => {
      if (isSteps(section)) return section;
      return {
        ...section,
        rows: section.rows.map((row) => {
          const codes = ROW_PERMISSION[row.action];
          if (!codes) return row;
          const roleCodes = unionRoleCodes(...codes.map((c) => grants[c]));
          const youCan = effective ? codes.some((c) => effective.permissions?.[c] === true) : undefined;
          return { ...row, who: `Anyone holding: ${formatRoleList(roleCodes, roleNamesByCode)}.`, youCan };
        }),
      };
    });
  }, [grants, roleNamesByCode, effective]);

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/help", { replace: true });
  };

  return (
    <div className="help-reference-page min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">Billing reference</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to Baselinq's platform fee on your project: what it is charged on, how the
          monthly invoice reaches you, how to pay it, and what each status means.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.type}
              href={`#${s.type.toLowerCase()}`}
              className="text-xs px-2.5 py-1 rounded-full border border-border text-foreground hover:bg-muted transition-colors"
            >
              {s.title}
            </a>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.type} id={s.type.toLowerCase()} className="scroll-mt-6">
              <h2 className="text-lg font-normal text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.description}</p>

              {isSteps(s) ? (
                <ol className="mt-4 rounded-xl border border-border bg-card divide-y divide-border">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-4 px-5 py-3.5 text-sm text-foreground leading-relaxed">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center tabular-nums">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        {(s.headings ?? ["Action", "Who can do it", "Where and when"]).map((h, i) => (
                          <th key={h} className={`text-left font-normal px-4 py-2.5 ${i === 0 ? "w-1/4" : i === 1 ? "w-2/5" : ""}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.rows.map((r, i) => (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="px-4 py-3 text-foreground">{r.action}</td>
                          <td className="px-4 py-3 text-foreground leading-relaxed">
                            {r.who}
                            {r.youCan !== undefined && (
                              <p
                                className={`mt-1 text-xs ${r.youCan ? "text-green-700" : "text-muted-foreground"}`}
                                data-testid="help-you-can"
                              >
                                {r.youCan ? "You can, on this project." : "You can't, on this project."}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-foreground leading-relaxed">
                            {r.when}
                            {r.note && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.note}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-normal text-foreground">Good to know</h2>
          <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
            <ul className="space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-5">
              {GLOBAL_NOTES.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated 2026-11-11. If the platform behaves differently from what's described here, the
          platform's behaviour is the bug — please let the team know.
        </p>
      </div>
    </div>
  );
}
