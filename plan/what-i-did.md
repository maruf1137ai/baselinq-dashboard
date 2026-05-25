# What I Did — Last 3–4 Days

*A recap for the team meeting. The work that went into the Werner-spec round.*

---

## The starting point

We had Werner's meeting notes from 2026-05-15 — Vans, Darren, and Grant explaining how they want the construction workflow to behave: SIs, VOs, RFIs, claims, signing, certificates, the lot. Long document, lots of moving pieces, lots of moments where what they wanted didn't match what we already had.

So I broke the work into stages.

---

## Stage 1 — Understanding the spec

Before writing any code, I read through Werner's notes line by line and tried to figure out what each construction document actually means in their world.

- **SI** = Site Instruction. The architect tells the contractor "do this." Signed, recorded, no money involved.
- **VO** = Variation Order. A change to the contract — adds money or time. Needs PM sign-off.
- **RFI** = Request for Information. Contractor asks the professional a question.
- **IC / Claim** = the two-stage claim process. Contractor lodges intention first, then formal claim later.
- **Sign & Issue** = the moment a doc becomes legally binding. Werner wants PIN or biometric.
- **Certificates** = shareable URLs that prove the doc was signed.

I needed this baseline because without it, the rest of the work doesn't make sense.

I used **Claude** to help me work through unfamiliar parts of the codebase and validate my understanding.

---

## Stage 2 — Mapping the gap

I went through every section of Werner's notes and listed what was already in our codebase vs what was missing. Saved it under `plan/warner-rev/` so the team can see it.

The result: **6 things needed to be built or fixed** to match Werner.

| # | Task | Werner asked for | Our system before |
|---|---|---|---|
| 1 | VO updates contract value + timeline | Signed VO → project's contract value and end date update | Nothing happened |
| 2 | Reply hidden on signed VO | Signed VO is a closed legal doc | Reply form sometimes still visible |
| 3 | Broker notification on high-risk claim | High risk → email the insurance broker | Code existed but silently no-op'd |
| 4 | Claim submission timestamps | Prove when each stage was submitted | Only had row-create timestamps |
| 5 | URL certificates | Shareable link per signed doc, not PDF | Nothing |
| 6 | Reassignment after reply | After a reply, ball moves to the other side | Assignee stayed stale |

---

## Stage 3 — Build the 6 tasks

Implemented each in order. Kept the changes focused so they could be tested and reviewed independently.

### Task 1 — VO updates contract
Added two new fields on Project: `contract_value` and `contract_end_date`. The sign endpoint now bumps both when a VO is signed. Audit trail records the delta. Frontend shows both as live read-only fields on the project settings page.

### Task 2 — Reply hidden on signed VO
Extracted the lock logic into a pure helper. VO/Claim lock immediately on `signed_at`. SI is special — it has a longer workflow, doesn't lock on Issued, only on Verified.

### Task 3 — Broker notification
Added `BROKER_NOTIFIED` notification type and a `broker_notified` flag on the claim. Now when PM sets risk = High, the broker email actually goes out and the flag prevents duplicates.

### Task 4 — Claim timestamps
Two new fields: `intention_at` on IntentionToClaim and `formal_claim_at` on DelayClaim. Backfilled existing rows from `created_at`. Frontend renders them on the claim detail page with a "N days after intention" notice gap.

### Task 5 — URL certificates
UUID4 token on every signed doc. Public endpoint `/api/certificates/{type}/{token}/` — no auth, token = access. Built a print-friendly certificate page in email-template style. Replaces PDFs.

### Task 6 — Reassignment after reply
After every reply, the system reassigns the task to whoever should respond next. Universal rule: "ball returns to the original author." Audit trail records the handoff. Notification fan-out targets the new assignee.

---

## Stage 4 — Testing

For each task, I wrote an end-to-end test that exercises the full path through the API (not just a unit test).

| Task | Backend tests | Frontend tests |
|---|---|---|
| 1 | 5 scenarios | 21 unit tests |
| 2 | (uses Task 1's E2E) | 17 unit tests |
| 3 | 4 scenarios | (no FE changes) |
| 4 | 4 scenarios | 13 unit tests |
| 5 | 6 scenarios | 15 unit tests |
| 6 | 6 scenarios | 13 unit tests |

All tests pass. Re-runnable, self-cleaning.

Then I started walking through the UI **as if I were the user** — log in as a contractor, raise an RFI, log in as a PM, sign a VO, watch what happens. This is where bugs started showing up.

---

## Stage 5 — Testing the actual user flows (current stage)

I went type by type:

### SI flow
Created an SI, escalated it to a VO, signed it. **Found 4 bugs along the way:**
- The Decision Timeline still said "Draft — In progress" even after the SI was Closed. Root cause was in two places — backend wasn't persisting the decision_timeline field when status changed, and the frontend stepper didn't recognise "Closed" as a state.
- The Task wrapper status wasn't following the entity status — signed VO sat in the To-Do column on the kanban.
- The SI lock was firing too early — Werner spec says SI continues through Acknowledged → Actioned → Verified after sign, not done immediately.
- The Approve & Sign button on the VO modal had no PIN input, even though I built the PIN feature.

Fixed all four. Tests still pass.

### VO flow
Tested the create → sign → contract value update path end-to-end. Found:
- The Approve & Sign Variation Order modal had only a declaration checkbox — no PIN input. The "Sign & Issue" version had PIN but only checked for SI. Now both modals use PIN uniformly for VO/Claim.
- The Sign & Issue button was clickable before entering 4 digits. Added the disabled-until-valid logic.
- The VAT row in the dialog was reading from the wrong field — it showed VAT R 0,00 even when the reply submitted R 120 VAT. Fixed to read from the latest reply's pricing data.

### RFI flow (in progress)
Tested creation. **Found that contractor users couldn't see the + Action button at all.** Traced it to the permission seed:
- The original permission seed (migration 0016) granted `task.rfi.create` to `CM` / `SE` / `SS` / `FOREMAN` — but never to the plain `CONTRACTOR` or `MC` (Main Contractor) role codes.
- Same issue across multiple permissions: VO excluded PM, GI excluded Main Contractor, DC excluded contractor-side roles.
- Wrote a migration to backfill the missing grants. Werner spec was clear that contractors are the primary RFI creators.

Currently still testing RFI: the workflow, the "Further Info Required" loop, the escalation to SI, the reassignment flow.

---

## Side things I cleaned up

While testing I also fixed:

- **Auto-memory bug** in user serializer — role lookup was failing when ROLE_MAP's canonical code drifted from the seeded DB code (`contractor`→`CIDB` in map vs `CONTRACTOR` in DB). Made the lookup match by either code or name.
- **Notes generation pipeline** — was producing very long action items / summaries for short meetings. Trimmed the prompt so length matches meeting depth.
- **Signing PIN UI** — built the missing settings page so users can actually set/clear a PIN (the backend supported it but there was no UI).
- **Email-template certificate page** — refined to look like a transactional email (Stripe / Linear style) instead of a generic card.

---

## Tools

- **Claude** — used for code search, validation, generating boilerplate (tests, migrations), and helping me reason about Werner's spec. Final decisions and code review are mine.
- **Django + DRF + pytest** on the backend.
- **Vitest + React Testing Library** on the frontend.

---

## What's next

1. Finish testing the RFI flow end-to-end and fix any remaining bugs.
2. Test IC and DC (Claim) flows the same way.
3. Test GI flow.
4. Final sweep — log in as every role (contractor, architect, PM, etc.) and confirm each sees the right + Action options.
5. Sit down with David to walk through the **need-to-know** open questions before next round.

---

## How to read the plan folder

- `plan/warner-rev/notes.md` — Werner's meeting notes, the source of truth.
- `plan/warner-rev/tasks/00-presentation-for-david.md` — handout summary of all 6 tasks for David.
- `plan/warner-rev/tasks/01-…06-` — one file per task with details, current state, and target flow.
- `plan/warner-rev/tasks/need-to-know.md` — open product questions for David.
- `plan/what-i-did.md` — this file.
