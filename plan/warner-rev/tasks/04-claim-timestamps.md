# 4. Claim Timestamps — `intention_at` / `formal_claim_at`

## What it is
The claim flow has two stages: **Intention to Claim** → **Formal Claim**. Right now the FK linkage exists but neither stage records *when* it was submitted. This is a legal defensibility gap — in a dispute, you need to prove the contractor lodged the intention first and when.

## Current state
- `IntentionToClaim` model exists
- `DelayClaim` has `intention_ref` (FK to IC) and `escalated_to_claim` flag
- Neither model records the submission timestamp of each stage explicitly
- `created_at` exists but it's the row-creation timestamp, not the "submitted by contractor" moment

## Target flow
- When a contractor lodges an Intention to Claim → set `intention_at = now()`
- When that IC is escalated into a formal DelayClaim → set `formal_claim_at = now()` on the DelayClaim
- Both timestamps surface in:
  - Task detail audit trail
  - The signed certificate (task 5)
  - The claim list view

## Backend changes
- Migration: add `intention_at` (DateTimeField, nullable for backfill) on `IntentionToClaim`
- Migration: add `formal_claim_at` (DateTimeField, nullable for backfill) on `DelayClaim`
- Backfill data migration: `intention_at = created_at` for existing IC rows; `formal_claim_at = created_at` for existing DC rows
- In `views_werner.py`:
  - IC creation endpoint: set `intention_at = timezone.now()`
  - IC → DC escalation endpoint: set `formal_claim_at = timezone.now()` on the new DelayClaim
- Serializers expose both fields

## Frontend changes
- Claim detail page: display "Intention lodged on …" and "Formal claim submitted on …" in the metadata strip
- Audit-trail card includes both timestamps with their actors

## Open questions
- For existing IC/DC rows that get backfilled from `created_at`: do we want a flag to indicate "backfilled estimate" vs "actually recorded"? **Recommend no — keep it simple, note in migration comment that rows pre-2026-05-19 are estimates.**
