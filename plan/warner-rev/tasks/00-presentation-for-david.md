# Werner Spec Updates — For David

**6 tasks completed.** Backend + frontend, fully tested.

Following the client meeting on 2026-05-15. Each task is a direct response to something the team — Vans, Darren, Grant — raised in the call.

---

## Task 1 — Variation Orders Now Update the Contract

> *"Variation orders once approved update the contract value and timeline in the system."*
> — Vans Arc, meeting notes (01:03:00)

### Before
- A VO got signed and… nothing happened.
- The project's contract value stayed the same on the dashboard.
- The end date stayed the same on the dashboard.
- Users had to mentally do the math: "Original budget + sum of VOs = real contract value."

### Now
- The moment a VO is signed, the project's contract value goes up by the approved amount.
- The project's end date pushes out by the approved time extension.
- An audit-trail entry records the change: `Contract amended by VO-042: value R 10M → R 10.5M, end date 31 Dec → 14 Jan`.
- Two new fields on the project settings page show the **live** contract value and **live** end date.

### Why it matters
The dashboard now tells the truth about the contract. Lawyers, insurers, and clients can read a project's status without doing arithmetic. The audit trail proves exactly when each change happened and by whom.

---

## Task 2 — Reply Form Disappears After a VO Is Signed

> *"Remove reply buttons where inappropriate, e.g., on variation orders once finalized."*
> — Meeting notes (01:02:49)

### Before
- After a Variation Order or Site Instruction was signed, the reply form sometimes stayed visible.
- Users could keep typing replies into a document that was already a closed legal certificate.
- Confusing — and a real problem if someone replied thinking the doc was still open.

### Now
- The moment a VO or SI is signed, the reply form disappears.
- The escalate button disappears too — you can't escalate a signed document.
- Past replies, audit trail, and the certificate itself stay visible — that's the legal record.

### Why it matters
A signed contract amendment is final. The UI now reflects that, removing the only path that could produce a wrong-headed user action.

---

## Task 3 — Insurance Brokers Get Notified on High-Risk Claims

> *"Project managers manually rate claims as low, medium, or high risk, triggering notifications to insurance brokers for high-risk claims."*
> — Grant McEvoy, meeting notes (18:52)

### Before
- The code to email brokers existed — but it was incomplete.
- A piece of the notification system wasn't wired up, so the email **silently never fired**.
- High-risk claims were being flagged in the system, but no broker ever heard about it.

### Now
- When a PM sets a claim's risk level to High:
  1. An email is sent to the respondent's insurance broker (from the user's profile).
  2. The respondent gets an in-app notification: *"Your broker has been notified."*
  3. A flag is set on the claim so the email never fires twice.
- If the broker email isn't configured, the PM still completes their action, but the user gets a notification telling them to update their profile.

### Why it matters
This is the foundation of the insurance partnership Grant and Darren want to build. Brokers can intervene early on high-risk claims, reducing exposure and giving them visibility into all the projects they insure. Without this firing reliably, the broker pitch doesn't work.

---

## Task 4 — Claims Now Record When Each Stage Was Submitted

> *"The process distinguishes intention to claim (early warning) from actual claims, requiring evidence of mitigation efforts before escalation."*
> — Darren Ogden, meeting notes (11:00)

### Before
- The system knew **which** Intention to Claim became which Formal Claim (there's a link between them).
- It did **not** know when each stage was actually submitted by the contractor.
- The only timestamp was "row created in database" — which isn't legally the same as "contractor submitted at."

### Now
- Two new timestamps:
  - `intention_at` — the moment the contractor lodged the early-warning notice
  - `formal_claim_at` — the moment they escalated to the formal claim
- The notice gap (e.g. "lodged 28 days before formal claim") is now visible on the claim detail page.
- Existing claims have these fields backfilled from their database creation time.

### Why it matters
Construction disputes are won and lost on documentation. In court, you need to prove the contractor lodged the early warning, waited the contractual notice period, and only then escalated. We can now prove all three with exact timestamps.

---

## Task 5 — Signed Documents Now Have Shareable URLs

> *"The importance of linking certificates as URLs rather than PDFs was raised to save storage and improve access."*
> — Meeting notes (01:05:10)

### Before
- When an SI or VO got signed, there was **no way to share the result**.
- No PDF, no link, no certificate page.
- The signed state lived in the database. If you wanted to send proof to a lawyer or insurer, you'd have to take a screenshot.

### Now
- Every signed SI, VO, Formal Claim, and submitted Intention to Claim gets its own URL.
- Anyone with the link can view a clean, print-friendly certificate page — phone, laptop, anywhere.
- Page shows: document number, parties, project, signature block, audit trail, type-specific details (VO amount/days, IC parties/risk, Claim days/cost).
- A "Copy link" button is shown on the task detail page after signing.
- Browser print produces a clean A4 layout if a paper copy is needed.
- If a link leaks, the database flag can revoke it — the URL then returns "not found."

### Why it matters
This is the killer feature for the legal and insurance pitch. A signed certificate URL can be sent to anyone in seconds. It's always live (no stale PDFs floating around). It's free to store (no file generation). It works on every device. And it can be revoked if a link leaks.

---

## Task 6 — The "Assigned To" Field Now Updates After Every Reply

### Before
- When someone replied to an RFI, SI, or claim, the system saved the reply.
- It did **not** update who was responsible next.
- The "assigned to" chip stayed pointing at the original person — even though the ball had clearly moved to the other side.
- Notifications went to the wrong person.
- Dashboards lied about workload.

### Now
- After any reply, the system automatically reassigns the task to whoever owes the next response.
- An audit-trail entry records the reassignment.
- The reply notification fan-out targets the **new** assignee.
- Universal rule: after a reply, the task goes back to the original author of the doc — unless they're the one who replied.

### Why it matters
At a glance, anyone looking at a project can now see whose turn it is. The "Action Required" badges work correctly. Notifications reach the right person. Workload dashboards become accurate.

---

# Summary

| # | Task | What changed |
|---|---|---|
| 1 | VO updates contract | Sign a VO → contract value + end date now update automatically |
| 2 | Reply hidden on signed VO | A signed legal document is now properly closed in the UI |
| 3 | Broker notifications | High-risk claims now actually reach the insurance broker |
| 4 | Claim timestamps | Audit trail now proves the notice gap between intention and formal claim |
| 5 | URL certificates | Every signed document has a shareable, print-friendly URL |
| 6 | Reassignment after reply | The "assigned to" chip now tells the truth about whose turn it is |

---

## Why these six together

These six changes turn the platform from a **document store** into a **legal record system**.

Each task removes a place where the system was lying, silent, or incomplete:

- **The dashboard told the truth, but not the legal one** → Tasks 1 and 4 fix that
- **The UI showed states that didn't exist** → Tasks 2 and 6 fix that
- **The system had work to do, but didn't** → Tasks 3 and 5 fix that

This is the foundation for the insurance and legal partnerships Grant and Darren want to build. None of the bigger pitches work if these six things are broken.

---

## Testing

All six tasks have automated end-to-end tests:

| Side | Tests |
|---|---|
| Backend | 6 E2E scripts covering 26 scenarios total |
| Frontend | 87 unit tests for the supporting helpers |

Re-runnable on demand. Every test sets up its own data and cleans up after itself — no DB pollution.

---

## Bugs caught and fixed while testing the user flows

After the six tasks landed, I went through the system as each real user (contractor, architect, PM) and found a handful of things that didn't quite match Werner. Fixed all of these the same day:

- **SI was locking too early.** Werner spec: Issued → Acknowledged → Actioned → Verified. We were treating Issued as terminal. Now only Verified locks the SI.
- **Decision Timeline showed "Draft" on auto-closed SIs.** Backend wasn't persisting `decision_timeline` when status changed via `update_fields=["status"]`; frontend stepper didn't know what "Closed" meant. Fixed both sides.
- **Kanban card never followed status.** Closed RFIs, escalated ICs, etc. stayed in "To-Do" forever. Added a shared `sync_task_status_for_entity` helper that flips Task.status when the entity reaches its terminal state.
- **Approve & Sign Variation Order had no PIN input.** Now uses the same PIN gate as Sign & Issue. Disabled until 4 digits.
- **VAT row in Approve & Sign was always R 0.** Was reading from VO's stale tax_amount instead of the latest reply's pricing. Now reads from reply structuredData when present.
- **Sign & Issue button showed for users who can't actually sign.** Frontend role set was broader than backend's. Tightened the SI signing role set to match `views_signing.py` exactly.
- **Contractor users couldn't see + Action button.** Permission seed never granted `task.rfi.create` to the `CONTRACTOR` / `MC` role codes. Same gap on multiple permissions (PM missing from VO, contractor missing from claim, etc.). Wrote a backfill migration.

---

## UX polish for the escalation flow

When a PM escalates an SI to a VO, the resulting VO used to be a "plain VO with the SI's title copied in" — no visible indication of WHY it existed or WHERE it came from. The linkage was in the audit trail and right-side References panel, but easy to miss.

**Added an Origin Banner** on every escalated doc, sitting above the title card:

> 🔗 **Auto-created from SI-005.** This doc was escalated from the site instruction above. Review the source for context before completing or signing.

Plus a "From source: SI-005" row in the doc metadata strip for at-a-glance reference.

Now anyone opening an escalated VO (PM, contractor, client, lawyer) immediately sees:
1. Where the VO came from
2. A clickable link back to the source SI
3. What to expect (review the source for context)

This is in addition to the existing right-panel References card, which keeps the structured "incoming / outgoing" view.

---

## What's not done (intentionally — needs your call)

These are flagged in [`need-to-know.md`](./need-to-know.md) as open product questions:

- **"What's next" guidance card on Draft VOs.** A prescriptive step-by-step ("1. Discuss with contractor 2. Enter amount 3. Sign") visible only to PM/QS. I didn't build it because the wording and visibility rules are product opinions. Ask if you want it.
- **VO description prefixing with the SI reply text.** When auto-creating a VO from an SI, should we quote the contractor's triggering reply at the top of the VO description? Cleaner context — but it modifies stored data on a contractual document, which Werner cares about. Needs explicit blessing.
- **DC vs EOT Awarded status distinction.** Currently we treat "Determination Made" as terminal. Werner's enum has a separate "EOT Awarded" step for granted claims. Which path do you want approving signers to land on?
- **SI Mark as Verified — who, when, how.** Verified is the terminal state for SI. We need to decide: explicit button, who can click it, from which prior status.

---

## What's not done (intentionally — won't build)

- **Revocation UI for certificates.** The database field exists; the admin UI to flip it is a separate, smaller ticket.
- **Broker portal access.** Brokers get email notifications. A future ticket can give them a real account on the platform.
- **Cancel a signed VO.** Industry standard: you don't cancel a signed contract — you issue a corrective VO. No UI needed.
- **AI drawing interpretation.** Werner mentioned this is experimental and not a near-term deliverable.

---

*Document prepared for David. Questions to Maruf.*
