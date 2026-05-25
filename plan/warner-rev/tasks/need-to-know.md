# Need to Know — open questions for Werner / David

Questions and ambiguities we hit while building Werner rev H that need a
decision from the client before we ship the next round. Each entry should
list the symptom, what we assumed, and the question.

---

## 1. SI status: Acknowledged → Done?

**Symptom:** Contractor replies to an SI. The SI workflow status moves to
`Acknowledged`. On the kanban task board the task drops into the
**Done** column.

**Werner spec (rev H, page 5–6):** SI flow is
`Draft → Issued → Acknowledged → Actioned → Verified`. Verified is the
terminal state; Acknowledged is mid-flow.

**Our current assumption:** Acknowledged is **not** Done. The task
should stay in "In Review" on the board until the SI hits `Verified`
(or `Completed` / `Closed` for legacy data).

**Question for Werner / David:** Confirm — is the kanban "Done" column
reserved for `Verified` only, or do you want Acknowledged to also land
in Done (matching the old behaviour)?

---

## 2. DC / Claim — Determination Made vs EOT Awarded

**Symptom:** When a PM signs and issues a Claim today, the system sets
its status to `Determination Made`. But the DelayClaim model has a
later state, `EOT Awarded`, that we never transition into.

**Werner notes:** Claims can be approved (EOT granted) or rejected. The
status enum reflects this:
`Delay Identified → Notice Issued → Under Assessment → Determination Made → EOT Awarded`.

**Our current assumption:** `Determination Made` is the terminal state
regardless of outcome — meaning we treat "the PM has decided" as the
end of the workflow. We don't currently distinguish approved-with-EOT
from rejected.

**Question for Werner / David:** Two options —
  (a) Keep one status and add a separate `decision` field
      (`approved` / `rejected` / `partial`); EOT Awarded is computed
      from `decision = approved`.
  (b) Have the sign endpoint actually transition to `EOT Awarded` when
      the determination is "approve" and `Determination Made` (or a
      new `Rejected` status) when it's "reject."

**Recommended (a):** smaller schema, clearer semantics, easier to
filter on. (b) is closer to a literal reading of the spec but adds two
branches to the signing flow and a UI choice the PM has to make.

---

## 3. SI "Mark as Verified" — who and how?

**Symptom:** SI workflow `Draft → Issued → Acknowledged → Actioned → Verified`
has Verified as the terminal state. Today there's no explicit way for
the professional to mark an SI as Verified.

**Our current assumption:** Verification is an explicit professional
action — i.e. there's a "Mark as Verified" button on the SI detail
page, visible to the issuing professional when status is `Actioned`
(or `Acknowledged` if the contractor never explicitly Actioned). On
click → `status = Verified`, Task → Done, audit row written.

**Question for Werner / David:**
  (a) Confirm the trigger is an explicit professional action (button).
  (b) Should the button be visible from `Acknowledged` onward, or only
      after `Actioned`?
  (c) Does the verifying professional have to be the same person who
      issued the SI, or can any professional on the project verify?

---

## 4. "What's next" guidance card on a VO escalated from an SI

**Symptom:** When a PM escalates an SI to a VO, the resulting VO is a
plain doc — title and description identical to the SI's. There's no
prescriptive guidance for the PM on what they're supposed to do next
(discuss with contractor, enter amount + days, sign).

**Our current assumption:** the PM is experienced and knows what to do
once they see the VO. We do NOT show a guidance card.

**What I considered building:** a small card visible only while the VO
is in `Draft` status, addressed to the PM, with prescriptive steps:
  1. Discuss cost + time impact with the contractor in the reply form
  2. Once agreed, enter Approved Amount and Time Extension
  3. Sign & Issue to apply the contract change

**Question for Werner / David:**
  (a) Do you want this guidance card at all?
  (b) If yes, what wording? Should it match Werner's terminology?
  (c) Should it show on EVERY VO Draft, or only on auto-escalated ones?
  (d) Should it be visible to non-PM viewers (contractor, client)?

I did NOT implement this — it's a product opinion, not a data exposure.

---

## 5. Should the VO description quote the SI reply that triggered it?

**Symptom:** When a PM escalates an SI to a VO, the VO's `description`
field is copied verbatim from the SI's instruction text. The contractor's
SI reply that triggered the escalation (e.g. "this needs 14 extra days
plus a material cost increase") is NOT visible inside the VO description.

**Our current assumption:** the VO description = SI instruction (current
behaviour). Users find the triggering reply by clicking back to the source
SI (now exposed prominently via the origin banner we just shipped).

**What I considered building:** when auto-creating the VO from an SI,
prefix the VO description with a quote of the contractor's last reply:

  > Created in response to the following from [Contractor Name] on SI-005:
  > "We need 14 extra days and there's a material cost increase"
  >
  > ---
  >
  > [original SI instruction]

This way the VO carries its own context without needing to click back to
the SI.

**Question for Werner / David:**
  (a) Is modifying the VO's stored description acceptable, or must the
      description remain whatever the PM originally typed?
  (b) If acceptable, what template/wording do you want?
  (c) Does this set a precedent for other escalations (RFI → SI, IC →
      Claim)? Should they also auto-prefix the reply?

The concern is **contractual document integrity** — Werner cares about
the legal record. Auto-modifying the body of a doc that becomes a
certificate is a meaningful product call.

I did NOT implement this — it modifies stored data, not just UI.

---
