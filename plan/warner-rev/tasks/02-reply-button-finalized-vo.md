# 2. Reply Button Hidden on Finalized VO

## What it is
Once a VO is signed and issued, it is a closed legal document. Replying to it makes no sense — but the current UI still shows the reply form in some cases.

## Current state
- `TaskDetails.tsx` line 1246 — `isTaskLocked` is computed as: "task is on the last timeline stage"
- This is fragile — if the timeline stages configuration is off, the reply form remains visible on a signed VO
- The reply form, action menu, and the rest of the action bar all key off `isTaskLocked`

## Target flow
- For task type = VO: if `signed_at` is set, reply form is hidden, action bar is hidden, only the read-only certificate view is shown
- For SI: same rule applies after Sign & Issue
- For RFI / DC / GI: rely on existing timeline rule (no change)

## Backend changes
None — `signed_at` is already exposed on the entity via the serializer.

## Frontend changes
- Replace `isTaskLocked` computation with: `displayTask.signed_at != null` for VO/SI, OR last-stage rule for others
- Verify hide logic on:
  - Reply form (~line 1765)
  - Action buttons (`+Action`, escalate)
  - Acknowledge button (RFI)
- Test cases: signed VO, signed SI, RFI on last stage, RFI mid-flow

## Open questions
- Should the read-only certificate view show all past replies/audit on a finalized VO? **Recommend yes — full read-only history is the whole point of the certificate trail.**
