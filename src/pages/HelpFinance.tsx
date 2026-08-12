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
 *   - PC create / submit / certify / post permissions → backend/tasks/pc_workflow.py
 *                                     (TRANSITION_PERMISSIONS)
 *                                     and user/migrations/0040_pc_single_approve_permission.py
 *   - PC maker-checker              → backend/tasks/pc_workflow.py
 *                                     (CREATOR_EXCLUDED_TRANSITIONS)
 *   - PC draft edit/delete (creator-only, Draft-only) → backend/tasks/views.py
 *                                     (PaymentCertificateViewSet._draft_edit_guard)
 *   - Platform Fees visibility     → backend/cost_ledger/views.py (_can_view_platform_fees)
 *
 * Update this page whenever those rules change.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface FinanceSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: FinanceSection[] = [
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
        action: "Create, edit or delete a Variation Order",
        who: "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager.",
        when: "Anytime on the project.",
        note: "There's no \"New Variation Order\" button on this page by design — a VO is always escalated from a Site Instruction or task.",
      },
      {
        action: "Sign & Issue (the approval)",
        who: "Client/Owner, Project Manager, Client Project Manager.",
        when: "Once the VO has been priced.",
        note: "Signing requires a 4-digit PIN if you've set one in Settings → Security. This is what puts the Debit in the Cost Ledger.",
      },
    ],
  },
  {
    type: "PC",
    title: "Payment Certificates",
    description:
      "The document that makes a payment legally due. Deliberately split across several roles — under JBCC the person who values and prepares a claim is never the same person who has final say over certifying it, so this page enforces that split rather than just recommending it.",
    rows: [
      {
        action: "Create a new certificate",
        who: "Quantity Surveyor, Consultant Quantity Surveyor, Contractor (Construction Manager), Main Contractor / Contract Manager (Contracts Manager), Project Manager, or Project Administrator.",
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
        who: "Principal / PM — the project's Designated Principal Agent — but never the certificate's own creator.",
        when: "Once it's been Submitted.",
        note: "A single certifying act. There is no separate QS stage and client stage — one role certifies, independently, exactly as JBCC's principal-agent clause describes.",
      },
      {
        action: "Post Certificate",
        who: "Client/Owner, Client Project Manager, or Administrator — but never the certificate's own creator.",
        when: "Once it's been Approved.",
        note: "The moment the certificate becomes final — money is now legally due, the platform fee accrues, and this is when the credit lands in the Cost Ledger.",
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
        who: "Client/Owner, Client Project Manager, Project Manager, Consultant Quantity Surveyor, Quantity Surveyor, Contracts Manager.",
        when: "Anytime.",
        note: "If your role isn't in that list, the tab shows \"Platform fees are not visible to your role\" rather than an error.",
      },
      {
        action: "Change the fee rate, cap, or basis",
        who: "Nobody on the project — not even Client/Owner.",
        when: "Never, from this app. Only Baselinq's own staff can change these terms.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Maker-checker on Payment Certificates: whoever creates a certificate can never approve, reject, or post that same certificate — even when their role would otherwise qualify for the action. This is enforced by the server, not just hidden in the menu, so it holds even if someone calls the API directly. The creator CAN submit and cancel their own draft — raising and submitting is the maker's job, not a certification act.",
  "A certificate's Approvals status (Draft, Submitted, Approved, Posted, Rejected, Cancelled) always reflects its real state. Click the status to see who it's currently waiting on and who's eligible to act.",
  "Cost Ledger entries linked to a Payment Certificate only ever appear once that certificate is Posted — never earlier, and never at all if it's Rejected or Cancelled first.",
  "Client/Owner, Administrator and similar \"owner\" roles inherit these permissions through a role alias — Administrator behaves as Client/Owner, and a plain \"QS\" behaves as Consultant Quantity Surveyor, for every rule on this page.",
];

export default function HelpFinance() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/finance"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Finance
        </Link>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Finance reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to who can do what in Cost Ledger, Variation
          Orders, Payment Certificates and Platform Fees. If a button isn't
          showing for you, this page explains why — every action is gated by
          your role, and Payment Certificates additionally check that you
          didn't raise the certificate you're trying to act on.
        </p>

        {/* Quick jump nav */}
        <div className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
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
          {SECTIONS.map((s) => (
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
                        <td className="px-4 py-3 text-foreground leading-relaxed">{r.who}</td>
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
          Last updated 2026-08-13. If the platform behaves differently from
          what's described here, the platform's behaviour is the bug — please
          let the team know.
        </p>
      </div>
    </div>
  );
}
