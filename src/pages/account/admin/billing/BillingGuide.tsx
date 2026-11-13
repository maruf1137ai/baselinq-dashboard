/**
 * Admin Panel → Billing → Guide: how Baselinq staff run platform billing.
 *
 * The operating manual for the pages beside it — set-up, switching a project
 * on, the monthly cycle, recording payment, fixing mistakes, changing rates,
 * and what each refusal message means. The project users' side of the same
 * story is /help/billing (pages/HelpBilling.tsx); keep the two in step.
 *
 * Every refusal quoted below is the server's own wording (billing/invoicing.py,
 * billing/views_config.py, billing/views_admin.py) — update it here if that
 * wording changes.
 */
import React from "react";
import { Link } from "react-router-dom";

import { AdminPage, SectionCard, TD, TH } from "../adminUi";

type Step = { text: string; link?: { to: string; label: string } };

const SECTIONS: { id: string; title: string; subtitle: string; steps: Step[] }[] = [
  {
    id: "setup",
    title: "1. Before the first invoice (once)",
    subtitle: "A tax invoice cannot be issued without Baselinq's details.",
    steps: [
      { text: "Open Billing settings.", link: { to: "/account/admin/billing/settings", label: "Billing settings" } },
      { text: "Fill in Baselinq's legal name, VAT registration number and address. These three are required — Issue is refused until they are set." },
      { text: "Add the bank details the client pays into and a billing email. They are printed on every invoice and in the invoice email." },
      { text: "Check the standard fee rate (1%) and payment terms (14 days — an issued invoice is due 14 days after its issue date). VAT is fixed at 15% and cannot be changed." },
      { text: "Save. These details are copied onto each invoice when it is issued, so changing them later never alters an invoice already sent." },
    ],
  },
  {
    id: "switch-on",
    title: "2. A project's billing terms",
    subtitle: "Billing is ON by default: every project is billed at the standard rate from the moment it is created. Open a project to set who is billed, agree a different rate, or switch it off.",
    steps: [
      { text: "Open Project billing and click the project. You do not need to be a member of it.", link: { to: "/account/admin/billing/projects", label: "Project billing" } },
      { text: "Enter who is billed first — the client's name and the email address invoices are sent to. A new project starts with nobody set, and without an email the invoice is only shown in the app." },
      { text: "Leave the rate on Standard, or choose Negotiated and enter the agreed rate (between 0.5% and 1%). A negotiated rate needs a reason — it is kept in the rate history." },
      { text: "A rate below 1% does not apply straight away: it is sent for board approval and the current rate stays until another superuser approves it (see 7. Changing a rate). The project page shows an amber “awaiting approval” banner meanwhile." },
      { text: "Set a cap if one was agreed (the most the project is ever charged, excluding VAT). Leave it empty for no cap." },
      { text: "To stop charging a project, turn Billing active off and save. Nothing is charged while it is off." },
      { text: "Turning billing back on (or on for the first time) also charges every certificate already posted and every variation already approved on the project that has no fee yet — including ones finalised while it was off. The confirmation says how many were raised. If any were not meant to be billed, reverse them under Fees with the reason — a reversed fee is never charged again." },
    ],
  },
  {
    id: "monthly",
    title: "3. Every month: build, check, issue",
    subtitle: "One invoice per project per month — never one per certificate.",
    steps: [
      { text: "After the month ends, open Billing and click Run month end. Pick the month that just closed.", link: { to: "/account/admin/billing", label: "Billing overview" } },
      { text: "Read the result. It lists the drafts it built and every project it skipped, with the reason (usually: nothing to invoice)." },
      { text: "Open Invoices → Draft. Click each draft and check its lines: every certificate and variation reference, its fee, VAT and total.", link: { to: "/account/admin/billing/invoices?status=draft", label: "Drafts" } },
      { text: "If a draft is right, click Issue → Issue and send. It gets its tax invoice number (BLQ-…) and due date, the billing contact is emailed, and the project's finance users are notified." },
      { text: "If a draft is wrong, Cancel it instead (a reason is required). Its fees go back to Not invoiced and are picked up by the next run." },
    ],
  },
  {
    id: "paid",
    title: "4. When the money arrives",
    subtitle: "The client pays by bank transfer using the invoice number as the reference.",
    steps: [
      { text: "Open Invoices → Unpaid (or Overdue) and click the invoice the payment is for.", link: { to: "/account/admin/billing/invoices?status=unpaid", label: "Unpaid invoices" } },
      { text: "Click Mark as paid. Enter the bank reference and the date the money arrived (not today's date if it arrived earlier)." },
      { text: "Save. The invoice and every fee on it show Paid, and the project is notified that payment was received." },
    ],
  },
  {
    id: "overdue",
    title: "5. Chasing overdue invoices",
    subtitle: "An unpaid invoice becomes Overdue the day after its due date — automatically. More than 30 days overdue, the project becomes read-only.",
    steps: [
      { text: "The Billing overview shows the overdue total and a Chase button when there are any.", link: { to: "/account/admin/billing/invoices?status=overdue", label: "Overdue invoices" } },
      { text: "Open each one to see who it was billed to and when it was due, and follow up with the billing contact directly." },
      { text: "If an invoice is still unpaid more than 30 days after its due date, the project locks to read-only for its users: they can still view and download everything, but cannot create, edit, approve or send messages. A red bar across the project tells them which invoice is the cause." },
      { text: "If the client has agreed to pay and needs more time, open the invoice and set a grace date. The lock is held off until that date; clear it to remove the grace." },
      { text: "Once paid, mark it paid as in step 4 — Overdue and the lock both clear by themselves." },
    ],
  },
  {
    id: "mistakes",
    title: "6. Fixing a mistake",
    subtitle: "Nothing is ever deleted. Corrections are made with credits and cancellations, so every number stays traceable.",
    steps: [
      { text: "A fee charged in error: open Fees, find it, click Reverse and give the reason. A matching credit is written and comes off the next invoice; that event is never charged again.", link: { to: "/account/admin/billing/fees", label: "Fees" } },
      { text: "You do not need to reverse fees whose source was undone — that happens by itself. A certificate that stops being Posted, or a variation that is no longer approved, gets its fee credited back automatically. A variation that moves to Closed keeps its fee: Closed means the work was completed, not cancelled." },
      { text: "A draft that is wrong: Cancel it. Its fees return to Not invoiced." },
      { text: "An issued invoice that is wrong and not yet paid: Cancel it with a reason, fix the cause, and run month end again for that month. The cancelled number is kept on record." },
      { text: "A paid invoice cannot be cancelled — the client has paid it. Reverse the wrong fee instead; the credit reduces the client's next invoice." },
      { text: "A month that only has reversals is not invoiced (Baselinq never sends a negative invoice). The credits carry forward to the next invoice that has something to charge." },
    ],
  },
  {
    id: "rates",
    title: "7. Changing a rate",
    subtitle: "A rate change only affects fees recorded after it. Past fees and issued invoices never change. A rate below 1% needs a second superuser to approve it.",
    steps: [
      { text: "One project (a negotiated deal): Project billing → the project → Negotiated, enter the rate and the reason. Choose Standard to put it back on the standard rate." },
      { text: "Every project on the standard rate: Billing settings → Standard fee rate, with a reason. Projects with a negotiated rate keep theirs." },
      { text: "A rate of 1% applies as soon as you save. A rate below 1% — for one project or for the standard rate — is sent for board approval instead: you see “Sent for board approval — the current rate stays until approved”, and the old rate keeps being charged until then." },
      { text: "Approving: another superuser opens Billing settings → Pending rate approvals and clicks Approve. The person who asked for the change cannot approve their own request.", link: { to: "/account/admin/billing/settings", label: "Billing settings" } },
      { text: "Rejecting: click Reject and give a reason (it is required). The old rate stays. Either way, the person who asked is notified of the decision." },
      { text: "Every change — who asked, when, old and new rate, why, its status (Applied, Awaiting approval, Approved or Rejected) and who decided it — is listed under Rate history in Billing settings." },
    ],
  },
];

const MESSAGES: { message: string; meaning: string; fix: string }[] = [
  {
    message: "Baselinq's invoice details are incomplete",
    meaning: "The legal name, VAT number or address is missing.",
    fix: "Fill them in under Billing settings, then issue again.",
  },
  {
    message: "…net to … — credits only. They carry forward to the next invoice.",
    meaning: "The project's unbilled items are only reversals, so there is nothing to charge.",
    fix: "Nothing. The credits come off the next invoice automatically.",
  },
  {
    message: "No uninvoiced platform fee was accrued up to …",
    meaning: "Everything on the project is already invoiced, or nothing has been charged yet.",
    fix: "Nothing — no invoice is needed this month.",
  },
  {
    message: "A draft invoice already exists for this project and period",
    meaning: "Month end was already run for that month.",
    fix: "Review and issue (or cancel) the existing draft.",
  },
  {
    message: "Say why the rate is changing",
    meaning: "A rate change needs a reason for the rate history.",
    fix: "Fill in the reason box that appears under the rate, then save.",
  },
  {
    message: "… must be between 0.5% and 1%",
    meaning: "Rates outside the agreed band are refused.",
    fix: "Enter a rate from 0.5 to 1. Use Switch billing off to stop charging a project.",
  },
  {
    message: "Sent for board approval — the current rate stays until approved.",
    meaning: "The new rate is below 1%, so it needs a second superuser's approval.",
    fix: "Ask another superuser to approve it under Billing settings → Pending rate approvals.",
  },
  {
    message: "A rate below 1% must be approved by someone other than the person who asked for it.",
    meaning: "You tried to approve your own rate request.",
    fix: "Another superuser has to approve it.",
  },
  {
    message: "Say why the rate is rejected.",
    meaning: "A rejection needs a reason, which is sent to the person who asked.",
    fix: "Type the reason in the Reject dialog, then confirm.",
  },
  {
    message: "A settled invoice cannot be cancelled",
    meaning: "The client has already paid it.",
    fix: "Reverse the wrong fee instead; the credit goes on the next invoice.",
  },
];

const RULES = [
  "Only superusers can see and use these pages, and only they can change billing. Other staff accounts can read billing on projects but cannot change anything.",
  "VAT is always 15% on the fee and is shown as its own line everywhere — on every fee, invoice line, invoice and email.",
  "Invoice numbers run in sequence per project (BLQ-<project>-<number>) and are only given at Issue, so a cancelled draft never leaves a gap.",
  "The project sees issued and paid invoices only — never drafts or cancelled ones — and cannot change anything. They find their fees and invoices under Settings → Billing; their guide is Help → Billing.",
  "Each certificate and each variation is charged once. If the same event fires twice, the second does nothing; a fee you reversed by hand is never charged again.",
  "More than 30 days overdue locks the project to read-only for its users — never for Baselinq staff — until the invoice is paid or a grace date is set on it.",
  "A rate below 1% only applies after a second superuser approves it.",
  "Invoice emails need a billed-to email on the project and the email service (Resend) configured on the server. Without them the project is still notified in the app.",
];

const BillingGuide = () => (
  <AdminPage prose title="Billing guide" description="How Baselinq staff run the platform fee — from setting it up to getting paid.">
    <div className="flex flex-wrap gap-2">
      {[...SECTIONS.map((s) => ({ id: s.id, title: s.title.replace(/^\d+\.\s*/, "") })), { id: "messages", title: "Messages" }, { id: "rules", title: "Rules" }].map((s) => (
        <a key={s.id} href={`#${s.id}`} className="text-xs px-2.5 py-1 rounded-full border border-border text-foreground hover:bg-muted transition-colors">
          {s.title}
        </a>
      ))}
    </div>

    <SectionCard title="How the fee works, in one paragraph">
      <p className="px-6 py-4 text-sm text-foreground leading-relaxed">
        Each project is charged the standard rate (1%) or a rate negotiated for it, excluding VAT. A fee is recorded
        automatically at two moments only: when a payment certificate reaches Posted (the last step, after Approved),
        and when a variation order is signed and approved. Retention is taken off a certificate first, and a
        variation already charged is not charged again inside a certificate. 15% VAT is added to the fee, and a cap,
        if set, stops fees once reached. Fees build up during the month and are billed once, after the month ends,
        on one invoice per project, due 14 days after issue. The client pays by bank transfer and you mark the
        invoice paid; more than 30 days overdue, the project goes read-only until it is.
      </p>
    </SectionCard>

    {SECTIONS.map((s) => (
      <section key={s.id} id={s.id} className="scroll-mt-6">
        <SectionCard title={s.title} subtitle={s.subtitle}>
          <ol className="divide-y divide-border">
            {s.steps.map((step, i) => (
              <li key={i} className="flex gap-4 px-6 py-3.5 text-sm text-foreground leading-relaxed">
                <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center tabular-nums">{i + 1}</span>
                <span>
                  {step.text}
                  {step.link && (
                    <Link to={step.link.to} className="ml-1.5 text-primary hover:underline whitespace-nowrap">
                      {step.link.label} →
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </section>
    ))}

    <section id="messages" className="scroll-mt-6">
      <SectionCard title="Messages you might see" subtitle="What each refusal means and what to do about it.">
        {/* Fixed layout + forced wrapping: TD carries whitespace-nowrap, which
            beat a plain whitespace-normal and let long messages spill over the
            next column. */}
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[32%]" />
            <col className="w-[32%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              {["Message", "Why", "What to do"].map((h) => <th key={h} className={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {MESSAGES.map((m) => (
              <tr key={m.message} className="border-b border-border last:border-0 align-top">
                <td className={`${TD} !whitespace-normal break-words`}>{m.message}</td>
                <td className={`${TD} !whitespace-normal break-words text-muted-foreground`}>{m.meaning}</td>
                <td className={`${TD} !whitespace-normal break-words`}>{m.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </section>

    <section id="rules" className="scroll-mt-6">
      <SectionCard title="Rules the system enforces">
        <ul className="px-6 py-4 space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-10">
          {RULES.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </SectionCard>
    </section>
  </AdminPage>
);

export default BillingGuide;
