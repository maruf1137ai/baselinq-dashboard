# 6. Assignment State After Reply

## What it is
When a reply is submitted on an RFI or SI, the responsibility ("the ball") moves to the other party. Currently the backend stores the reply but doesn't reassign the task — so the assignee field stays stale and the UI is confusing.

## Current state
- Reply endpoints exist on RFI, SI, VO, DC, GI (`views_werner.py`)
- Replies are stored correctly with author, timestamp, content
- `assigned_user` / `assignee` on the task does NOT update after a reply
- Frontend assignee chip shows whoever was originally assigned — looks stuck

## Target flow (Werner spec)
- **RFI** lodged by contractor → assigned to professional/PM to answer → professional replies → reassign back to contractor to acknowledge or escalate
- **SI** issued by professional → assigned to contractor to acknowledge → contractor acknowledges → SI closed
- **VO** drafted by QS → assigned to PM to approve → PM signs → VO closed (no reply)
- **DC** (DelayClaim) submitted by contractor → assigned to professional → professional decides → reassign back to contractor

State machine table:

| Task | Initial assignee | After reply (by professional) | After reply (by contractor) |
|------|------------------|------------------------------|----------------------------|
| RFI  | Professional     | Contractor                   | Professional               |
| SI   | Contractor (ack) | (closed on ack)              | (no reply needed)          |
| DC   | Professional     | Contractor                   | Professional               |
| GI   | Contractor       | Contractor                   | (close)                    |

## Backend changes
- New helper in `views_werner.py` (or a `tasks/state.py` module): `next_assignee(task, reply_author)` → returns user/role to reassign to
- Each reply endpoint calls `next_assignee` after storing the reply and updates `task.assigned_user`
- Emit `TaskAudit` entry: `event="reassigned"`, old/new assignee
- The reply notification should be sent to the **new** assignee, not the old one

## Frontend changes
- Assignee chip on task detail page re-renders after reply
- Optimistic update: show pending state, then settle when API returns
- The "Add a reply" form is hidden if the current user is NOT the current assignee (or has the right role)

## Open questions
- For RFI, when there are multiple contractors on a project, which one gets reassigned? **Recommend: the original RFI author.**
- Should the QS be CC'd on VO reassignment events? **Werner spec: yes — auto-CC PM and QS on all VO movements.** Existing `_fan_out_notifications` covers this.
- What if the new assignee doesn't have a user account (legacy meeting-participant)? **Fallback: keep current assignee, raise a warning log entry.**
