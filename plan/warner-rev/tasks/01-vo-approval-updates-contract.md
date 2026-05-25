# 1. VO Approval Updates Contract Value + Timeline

## What it is
When a Variation Order is signed, the project's running contract value and end date must update automatically. Right now nothing happens — the VO is signed but project data stays stale.

## Current state
- `VariationOrder.approved_amount` exists (frozen grand_total at sign-off)
- `VariationOrder.time_extension_approved` exists (EOT days)
- `Project` model has `total_budget` and `principal_agent_mandate` but no `contract_value` or `contract_end_date`
- Sign endpoint sets `signed_at` / `signed_by` but does not touch the Project

## Target flow
1. PM/QS signs a VO (existing flow)
2. On successful sign:
   - `project.contract_value += vo.approved_amount`
   - `project.contract_end_date += vo.time_extension_approved days`
3. Both updates are atomic (transaction)
4. Audit-trail entry records old → new value/date
5. Frontend project header reflects new contract value + end date

## Backend changes
- New migration: add `contract_value` (Decimal) and `contract_end_date` (Date) to `Project`
- Seed `contract_value` from existing `total_budget` on first migration; seed `contract_end_date` from existing project end date
- In `views_signing.py` sign endpoint, after VO is signed:
  - Wrap in `transaction.atomic`
  - Update `project.contract_value` and `project.contract_end_date`
  - Emit `TaskAudit` entry: `event="vo_approved_contract_updated"`, old/new values
- Project serializer exposes both fields

## Frontend changes
- Project header / detail page shows `contract_value` and `contract_end_date` (separate from `total_budget`)
- On VO detail page, after signing, refresh project query so new contract value is visible
- Audit-trail card on VO detail page shows the "contract updated from X to Y" entry

## Open questions
- Should `contract_value` start at the project's `total_budget` value or stay null until first VO? **Recommend: seed from total_budget, treat as original_contract_value baseline.**
- What happens when a VO is reversed/cancelled after approval? **Decision needed** — most likely a second audit entry that subtracts the delta.
