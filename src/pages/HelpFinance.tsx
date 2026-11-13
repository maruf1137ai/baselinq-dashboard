/**
 * Help / Finance reference page.
 *
 * One section per Finance area (Cost Ledger, Variation Orders, Payment
 * Certificates, Platform Fees) showing who can do what in plain English.
 * Written for non-technical users — uses role display names, not role codes.
 * Mirrors HelpTasks.tsx's shape and styling deliberately, so this reads as
 * the same reference family rather than a second design.
 *
 * Source of truth:
 *   - Cost Ledger / VO edit perms → backend/tasks/views.py (_has_finance_edit),
 *                                     backend/cost_ledger/views.py
 *   - VO Sign & Issue              → backend/tasks/views_signing.py (SIGNING_ROLES)
 *   - Auto cost-ledger entries     → backend/cost_ledger/signals.py
 *   - PC create / submit / certify permissions → backend/tasks/pc_workflow.py
 *                                     (TRANSITION_PERMISSIONS)
 *                                     and user/migrations/0040_pc_single_approve_permission.py,
 *                                     widened by user/migrations/0049_widen_pc_create_approve_grants.py
 *   - PC approve auto-posts, no manual post action → backend/tasks/views_pc_workflow.py
 *                                     (PaymentCertificateWorkflowMixin._run_transition) —
 *                                     approving chains straight to posting; there is no
 *                                     ".../post/" HTTP route left, and
 *                                     user/migrations/0042_remove_pc_manual_post.py revoked
 *                                     finance.post_certificate from every role
 *   - PC maker-checker              → backend/tasks/pc_workflow.py
 *                                     (CREATOR_EXCLUDED_TRANSITIONS)
 *   - PC draft edit/delete (creator-only, Draft-only) → backend/tasks/views.py
 *                                     (PaymentCertificateViewSet._draft_edit_guard)
 *   - Platform Fees visibility     → backend/cost_ledger/views.py (_can_view_platform_fees,
 *                                     finance.platform_fees.view)
 *   - Invoices / billing terms     → backend/billing/views.py (finance.invoices.view),
 *                                     backend/billing/views_config.py (billing.terms.view);
 *                                     acting on them is Baselinq administrators only
 *                                     (permissions.core.is_billing_admin). The full
 *                                     billing story is HelpBilling.tsx (/help/billing).
 *
 * Update this page whenever those rules change.
 *
 * The rows below marked in ROW_PERMISSION have a LIVE "who" — computed from
 * the matching permission code's current grants (Roles & Permissions), via
 * GrantedRolesView (backend/permissions/auto_cc.py) and useGrantedRoles.
 * VO's "Sign & Issue" is now one of them too — task.vo.approve, wired into
 * views_signing.py's _can_sign() in place of the hardcoded SIGNING_ROLES["vo"]
 * set (grants realigned first in user/migrations/0057_realign_vo_approve_grants.py,
 * same pattern as task.approve_si/task.vo.recommend — see HelpTasks.tsx).
 * "Create, edit or delete a Variation Order" was split into two rows for the
 * same reason: VariationOrderViewSet.create() now checks task.vo.create
 * (matching the Tasks-side "+Action" button it's actually reached through —
 * see HelpTasks.tsx's "Create a new VO"), while update()/destroy() still
 * check finance.edit, so one dynamic list could no longer describe all
 * three verbs accurately. PC's "Edit/delete a Draft" and "change the fee
 * rate" stay static: the former is a creator-identity check
 * (_draft_edit_guard), the latter has no endpoint at all — neither is
 * driven by the Permission tables.
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

interface FinanceSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

/** Row action -> permission code(s) whose grants decide its "who". Multiple codes = OR. */
const ROW_PERMISSION: Record<string, string[]> = {
  "View the Cost Ledger": ["finance.view", "finance.edit"],
  "Export to CSV": ["finance.view", "finance.edit"],
  "Add an entry manually": ["finance.edit"],
  "Create a Variation Order": ["task.vo.create"],
  "Edit or delete a Variation Order": ["finance.edit"],
  "Sign & Issue (the approval)": ["task.vo.approve"],
  "Create a new certificate": ["finance.create_certificate"],
  "Submit for Certification": ["finance.create_certificate"],
  Cancel: ["finance.create_certificate"],
  "Approve / Reject": ["finance.approve_certificate"],
  "View Platform Fees": ["finance.platform_fees.view"],
  "View Baselinq's invoices": ["finance.invoices.view"],
  "View the billing terms": ["billing.terms.view"],
};
const ROW_CODES = [...new Set(Object.values(ROW_PERMISSION).flat())];

const STATIC_SECTIONS: FinanceSection[] = [
  {
    type: "LEDGER",
    title: "Cost Ledger",
    description:
      "The running record of what's been committed as cost (Debit) and what's been certified or offset against it (Credit). Most entries appear automatically — this is a record, not something you usually type into by hand.",
    rows: [
      {
        action: "View the Cost Ledger",
        who: "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Consultant Quantity Surveyor (or Quantity Surveyor).",
        when: "Anytime on the project.",
      },
      {
        action: "Add an entry manually",
        who: "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager.",
        when: "Anytime — for costs that don't come from a Variation Order or Payment Certificate.",
        note: "A Variation Order or Payment Certificate can only be linked to a manual entry once it's Approved / Posted respectively.",
      },
      {
        action: "Export to CSV",
        who: "Anyone who can view the Cost Ledger.",
        when: "Anytime.",
      },
      {
        action: "Entries created automatically",
        who: "Nobody clicks a button for these.",
        when:
          "A Debit appears the moment a Variation Order is Approved. A Credit appears the moment a Payment Certificate is Posted — not when it's created, submitted, or anywhere earlier in the chain, and never at all if it's Rejected or Cancelled first.",
      },
    ],
  },
  {
    type: "VO",
    title: "Variation Orders (Finance)",
    description:
      "A formal change to the contract's cost. This page covers the Finance tab's own actions — for the full task workflow (pricing, recommending, the contractor's side) see the Task workflow reference.",
    rows: [
      {
        action: "Create a Variation Order",
        who: "Client/Owner, Administrator, Client Project Manager, Project Manager, Principal Agent, Principal/PM.",
        when: "Anytime on the project.",
        note: "There's no \"New Variation Order\" button on this page by design — a VO is always escalated from a Site Instruction or a task (see the Task workflow reference); this is the permission that flow actually checks.",
      },
      {
        action: "Edit or delete a Variation Order",
        who: "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager.",
        when: "Anytime on the project.",
      },
      {
        action: "Sign & Issue (the approval)",
        who: "Client/Owner, Project Manager, Client Project Manager, Principal Agent, Principal/PM, Administrator.",
        when: "Once the VO has been priced.",
        note: "Signing requires a 4-digit PIN if you've set one in Settings → Security. This is what puts the Debit in the Cost Ledger.",
      },
    ],
  },
  {
    type: "PC",
    title: "Payment Certificates",
    description:
      "The document that makes a payment legally due. Under JBCC, the person who values and prepares a claim is never the same person who has final say over certifying it — this page enforces that split by identity (whoever raised this specific certificate), not by keeping the create and approve role lists apart. Both lists are deliberately broad: any professional can raise their own certificate, and any of several roles can certify someone else's, so there's always a traceable approver rather than a single bottleneck.",
    rows: [
      {
        action: "Create a new certificate",
        who: "Quantity Surveyor, Consultant Quantity Surveyor, Construction Manager, Contracts Manager, Project Manager, Project Administrator, Administrator, Super User, Principal / PM, Principal Agent, Architect, or Engineer (Structural, Mechanical, Electrical or Site) — in short, any member of the project's professional or management team can raise their own certificate.",
        when: "Anytime on the project.",
        note: "Creates the certificate as a Draft.",
      },
      {
        action: "Edit or delete a Draft",
        who: "Only the certificate's own creator.",
        when: "While the certificate is a Draft.",
        note: "Once it's Submitted, nobody — not even the creator — can edit or delete it.",
      },
      {
        action: "Submit for Certification",
        who: "The same roles as Create — and specifically the certificate's own creator, who is expected to submit their own draft.",
        when: "While the certificate is a Draft.",
      },
      {
        action: "Approve / Reject",
        who: "Principal / PM, Principal Agent, Administrator, Project Administrator, Project Manager, Super User, Quantity Surveyor, or Consultant Quantity Surveyor — but never the certificate's own creator, regardless of their role.",
        when: "Once it's been Submitted.",
        note: "A single certifying act, and the only step that exists — approving is what makes the certificate final: money becomes legally due, the platform fee accrues, and the credit lands in the Cost Ledger, all in the same act. There is no separate QS stage, client stage, or posting step, and Client/Owner has no action anywhere in this process — one role certifies, independently, exactly as JBCC's principal-agent clause describes.",
      },
      {
        action: "Cancel",
        who: "The same roles as Create/Submit.",
        when: "At any stage before it's Posted.",
        note: "Withdrawal by whoever raised the claim, not a certifier's decision — that's why it needs the same permission as Submit, not the same as Reject.",
      },
    ],
  },
  {
    type: "FEES",
    title: "Platform Fees",
    description:
      "A read-only statement of Baselinq's own platform fee on the project's certified work. There is nothing to create or approve here.",
    rows: [
      {
        action: "View Platform Fees",
        who: "The roles granted \"View the Platform Fees tab\" on Roles & Permissions.",
        when: "Anytime.",
        note: "Without it the fee derivation on Settings → Billing is not shown at all.",
      },
      {
        action: "Reverse (credit back) a charge",
        who: "Baselinq administrators only — never a role on the project.",
        when: "While the charge is live. A reason is required, and the credit lands on the next invoice.",
        note: "Each fee shows whether it is Not invoiced, Invoiced, Overdue or Paid. See the Billing reference for what each means.",
      },
    ],
  },
  {
    type: "INVOICES",
    title: "Invoices",
    description:
      "Baselinq's monthly invoice for the platform fee: what is to pay, what is overdue, and what will be on the next invoice. The project reads and pays them; Baselinq raises them.",
    rows: [
      {
        action: "View Baselinq's invoices",
        who: "The roles granted \"View Baselinq invoices\" on Roles & Permissions.",
        when: "Anytime.",
        note: "Without it the invoice list on Settings → Billing is not shown at all.",
      },
      {
        action: "Issue, cancel or mark an invoice paid",
        who: "Baselinq administrators only — never a role on the project.",
        when: "Once a month: Baselinq issues one invoice listing every fee not yet invoiced, and marks it paid when the bank transfer arrives.",
        note: "How to pay, and what Unpaid / Overdue / Paid mean, is in the Billing reference.",
      },
    ],
  },
  {
    type: "BILLING",
    title: "Billing terms",
    description:
      "Settings → Billing: the fee rate, VAT, what the fee is charged on, any cap, and the billing contact.",
    rows: [
      {
        action: "View the billing terms",
        who: "The roles granted \"View billing terms\" on Roles & Permissions.",
        when: "Anytime.",
      },
      {
        action: "Change the fee rate, cap, or basis",
        who: "Baselinq administrators only — nobody on the project, not even Client/Owner.",
        when: "Never, from a project role. The standard rate is 1%; a different rate (0.5%–1%) can be agreed for a project. VAT is always 15%.",
        note: "A rate change applies only to fees recorded after it — nothing already charged is repriced.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Maker-checker on Payment Certificates: whoever creates a certificate can never approve or reject that same certificate — even when their role would otherwise qualify for the action. This is enforced by the server, not just hidden in the menu, so it holds even if someone calls the API directly. The creator CAN submit and cancel their own draft — raising and submitting is the maker's job, not a certification act.",
  "A certificate's Approvals status (Draft, Submitted, Approved, Posted, Rejected, Cancelled) always reflects its real state. Click the status to see who it's currently waiting on and who's eligible to act.",
  "Cost Ledger entries linked to a Payment Certificate only ever appear once that certificate is Posted — never earlier, and never at all if it's Rejected or Cancelled first. Posting happens automatically the instant a certificate is Approved — there is no separate posting action.",
  "A plain \"QS\" behaves as Consultant Quantity Surveyor for every rule on this page. Administrator and Super User hold their own explicit grants on the Payment Certificate rules above — Client/Owner does not automatically inherit them and has no action anywhere in the PC process.",
];

export default function HelpFinance() {
  const navigate = useNavigate();
  const projectId = useSelectedProjectId();
  const grants = useGrantedRoles(ROW_CODES, projectId);
  // project_id: the roles list is readable to any member of THIS project;
  // without it the server answers 403 to anyone lacking roles.view, and this
  // page stayed on its static fallback for them.
  const { data: roles } = useRoles(projectId);
  // The reader's own answer on THIS project, from the same live payload every
  // gate in the app reads — refreshed by the permissions push.
  const { data: effective } = useEffectivePermissions(projectId ? Number(projectId) : null);

  const roleNamesByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles ?? []) map[r.code] = r.name;
    return map;
  }, [roles]);

  // Falls back to the static prose until both the grants and the role names
  // have arrived — never renders a half-computed sentence.
  const sections = useMemo(() => {
    if (!grants || Object.keys(roleNamesByCode).length === 0) return STATIC_SECTIONS;
    return STATIC_SECTIONS.map((section) => ({
      ...section,
      rows: section.rows.map((row) => {
        const codes = ROW_PERMISSION[row.action];
        if (!codes) return row;
        const roleCodes = unionRoleCodes(...codes.map((c) => grants[c]));
        const youCan = effective
          ? codes.some((c) => effective.permissions?.[c] === true)
          : undefined;
        return { ...row, who: `Anyone holding: ${formatRoleList(roleCodes, roleNamesByCode)}.`, youCan };
      }),
    }));
  }, [grants, roleNamesByCode, effective]);

  // Back goes to wherever the user actually came from — the Help hub, a
  // deep link out of /finance, anywhere — rather than always dumping them on
  // /finance. history.state.idx is React Router's history index: 0 (or
  // undefined) means this page is the first entry, so there is nothing to
  // pop and we fall back to /finance.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/finance", { replace: true });
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

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Finance reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to who can do what in Cost Ledger, Variation
          Orders, Payment Certificates, Platform Fees, Invoices and billing
          terms, read live from this project's Roles & Permissions. If a button isn't
          showing for you, this page explains why — every action is gated by
          your role, and Payment Certificates additionally check that you
          didn't raise the certificate you're trying to act on.
        </p>

        {/* Quick jump nav */}
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

        {/* Per-area sections */}
        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.type} id={s.type.toLowerCase()} className="scroll-mt-6">
              <h2 className="text-lg font-normal text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left font-normal px-4 py-2.5 w-1/4">Action</th>
                      <th className="text-left font-normal px-4 py-2.5 w-2/5">Who can do it</th>
                      <th className="text-left font-normal px-4 py-2.5">When</th>
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
                          {r.note && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              {r.note}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* Cross-cutting rules */}
        <section className="mt-12">
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Finance</h2>
          <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
            <ul className="space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-5">
              {GLOBAL_NOTES.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated 2026-08-31. If the platform behaves differently from
          what's described here, the platform's behaviour is the bug — please
          let the team know.
        </p>
      </div>
    </div>
  );
}
