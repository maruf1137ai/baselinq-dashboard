# Task alerts — backend changes needed

Spec for the dev team. This document captures what's broken, what's missing, and what needs building for the task alert / escalation system.

**Owner:** backend team (Shaon / Maruf / Risalat)
**Related PRs already merged / open:**
- `fix/task-api-response-fields` — adds `due_date` to the task wrapper so overdue visuals fire
- `fix/task-userid-coercion` — frontend bug making action buttons invisible
- `fix/recall-transcription-provider` — unrelated meetings fix, noted for context only

Owner of this backend work should read these three first.

---

## TL;DR

Today the overdue + escalation UX is **theatre**. The frontend shows `Xd late` badges and an `🔔 Escalated to PM` label when a task is 3+ days overdue, but **no notification is sent to anyone** — not to the assignee, not to any PM, not to the creator. No email. No scheduled job. No persistence.

This PR plan makes escalation real without requiring a Celery rollout.

---

## What exists today

### Works
- Task model + generic FK to VO/SI/RFI/DC/CPI
- TaskAudit model and manual audit rows on: creation, assignment, status change, response added, request-info
- Notification model + in-app delivery + Web Push subscriptions
- `_notify_task_assignees()` in `tasks/views.py` that dispatches notifications to `task.assigned_to`
- Frontend: card colour + `Xd late` badge + `Escalated to PM` label computed client-side from `task.due_date`

### Known gaps (flagged in code review)

| # | Gap | Evidence |
|---|-----|----------|
| 1 | **"Escalated to PM" notifies no-one** | `src/pages/Task.tsx:377-380` renders the label when `escalationLevel >= 2`. There is no backend code that reads escalation level, nor a PM concept, nor a notification call. |
| 2 | **No `TASK_OVERDUE` / `TASK_ESCALATED` notification types** | `notification/models.py:67-80` — only `TASK_ASSIGNED` and `TASK_UPDATED` exist in the Type enum. |
| 3 | **No scheduled overdue scan** | No Celery, no Beat schedule, no management command, no cron. `requirements.txt` has no task-queue deps. The system cannot proactively detect overdue. |
| 4 | **No persisted escalation state** | `Task` model (`tasks/models.py:991-1090`) has no `last_escalated_at`, `escalation_level`, or similar. Level is recalculated client-side every render. Means: no "do not spam the same escalation every pageload". |
| 5 | **No PM concept on the backend** | `Project` model has no `project_manager` FK. `ProjectTeamMember.role` is a free string. `TEXT_ROLE_TO_CODE_MAP` maps "PM" → code "PM" but nothing queries it as "the project manager". |
| 6 | **Auto-assigned users never notified on entity creation** | `create_task_for_entity()` in `tasks/views.py:346-485` auto-assigns users via `AUTO_ASSIGN_ROLES` but does not fire any notification to them. |
| 7 | **Silent SI Acknowledge** | SI `acknowledged_by` / `acknowledged_at` update via entity PATCH. Fires `status_updated` audit, but no specific "X acknowledged your SI" notification to the issuer. |
| 8 | **No email alerts for any task event** | `django-anymail` is in `requirements.txt`. Nothing in `tasks/` uses it. Only in-app + Web Push. |
| 9 | **No SLA config per task type** | The 3-day escalation threshold is hardcoded in `Task.tsx`. Every task type uses the same rule. Darren's meeting implies different SLAs: RFI likely 5 days, VO 10, DC 2, etc. |
| 10 | **No escalation audit** | When (if) an escalation fires, there is no record of "this task was escalated on date X to user Y". |

---

## Proposed solution — in 3 PRs

### PR 1 — Foundation (small, ships first)

**Backend:**

1. **`Notification.Type` additions** (`notification/models.py:67-80`):
   ```python
   TASK_OVERDUE = "task_overdue", _("Task overdue")
   TASK_ESCALATED = "task_escalated", _("Task escalated")
   ```
   Frontend notification type enum (`src/types/notification.ts`) needs matching additions.

2. **`Task.last_escalated_at`** field (`tasks/models.py`):
   ```python
   last_escalated_at = models.DateTimeField(null=True, blank=True, db_index=True)
   ```
   Migration: default `None` on all existing rows.

3. **`Project.project_manager`** field (`project/models.py`):
   ```python
   project_manager = models.ForeignKey(
       settings.AUTH_USER_MODEL,
       null=True, blank=True,
       on_delete=models.SET_NULL,
       related_name="projects_managed",
   )
   ```
   Migration: back-fill with `created_by` for existing projects. Add UI to change it in project settings (small frontend follow-up).

4. **Fire-on-access escalation** — in the existing `ProjectViewSet.tasks` method (`project/views.py:1971-2008`) that serves `GET /projects/{id}/tasks/`, before returning, do:

   ```python
   # Cheap overdue scan fires on every board load. Deduped by last_escalated_at.
   from datetime import date, timedelta
   today = date.today()
   threshold = today - timedelta(days=3)      # 3+ days overdue = escalated
   escalation_candidates = tasks.filter(
       due_date__lt=threshold,
       status__in=["todo", "in review"],
       last_escalated_at__isnull=True,        # never escalated before
   )
   for task in escalation_candidates:
       # Notify: all assignees + the PM
       recipients = set(task.assigned_to.all())
       if project.project_manager_id and project.project_manager != request.user:
           recipients.add(project.project_manager)
       for user in recipients:
           create_notification(
               user=user,
               type=Notification.Type.TASK_ESCALATED,
               title=f"Task escalated: {entity_title_for(task)}",
               body=f"Overdue by {(today - task.due_date).days} days.",
               link=f"/tasks/{task.id}",
               project=project,
               send_push=True,
           )
       TaskAudit.objects.create(
           task=task,
           action="other",
           description=f"Escalated — {(today - task.due_date).days} days overdue",
           created_by=request.user,
       )
       task.last_escalated_at = timezone.now()
       task.save(update_fields=["last_escalated_at"])
   ```

   **Tradeoff:** this runs on every board load. Cheap (single query) and deduped by the `last_escalated_at` check. Not proactive (a task only escalates when someone opens the board) — see PR 3 for the proper scheduled scan.

5. **Notify auto-assigned users on entity creation** — `create_task_for_entity()` (`tasks/views.py:346-485`), after `task.assigned_to.set(...)`:
   ```python
   _notify_task_assignees(task, notif_type=Notification.Type.TASK_ASSIGNED,
                          exclude_user=creator, is_new=True)
   ```

**Frontend** (same PR or chained):

6. `src/types/notification.ts` — add `task_overdue` and `task_escalated` to the type union
7. Notification bell renders nicely for those types (icon, link to `/tasks/{id}`)
8. Project Settings page (`src/pages/settings/projectDetails.tsx` or equivalent) — add a "Project Manager" dropdown picker populated from team members

**Size:** ~350 lines backend, ~100 lines frontend, 3 migrations.

**Ships without Celery.** Real escalation notifications fire from this PR alone.

---

### PR 2 — Fix the missing audits & silent flows

1. SI Acknowledge / Feedback / Verify — emit specific notification to issuer + add TaskAudit row (separate from generic `status_updated`)
2. Attachment upload — TaskAudit row with filename
3. Task deletion — TaskAudit row (needs `TaskAudit.Action.TASK_DELETED` new enum value)
4. Field edits (due_date, assignee change, description) — TaskAudit row

**Size:** ~200 lines, mostly new audit calls and a couple of notification types.

---

### PR 3 — Proper scheduled system (deferred, needs Celery)

This is the "do it properly" version. Depends on Celery + Redis being set up (separate infra PR).

1. Celery Beat scheduled task: `check_overdue_tasks` runs every morning at 9am SAST
2. Scans all `due_date < today AND status != done` tasks
3. Staged notifications by overdue days:
   - Day 0 — "Task due today" (soft reminder)
   - Day 1-2 — "Task overdue" → assignees only
   - Day 3+ — "Task escalated" → assignees + PM
   - Day 7+ — "Escalation to Client" → assignees + PM + project creator
4. Daily digest email via `django-anymail` for PMs (all their open+overdue tasks)
5. Deduping: use `last_escalated_at` + a `last_reminder_at` field to avoid double-pinging
6. SLA per task type — add `SLA_DAYS_BY_TASK_TYPE` config on backend (defaults per client meeting: RFI 5d, VO 10d, SI 5d, DC 2d, CPI 10d). Override-able per-project.

**Size:** ~800 lines + Celery/Redis infra.

---

## Frontend bits to align

After PR 1 merges, the frontend needs these tiny adjustments:

- `src/types/notification.ts` — add new types
- `src/components/DashboardHeader.tsx` (notification bell) — routing / icon for new types
- `src/pages/settings/projectDetails.tsx` — Project Manager picker
- Remove the client-only `escalationLevel` calculation in `Task.tsx` once backend provides a `task.escalation_state` field (PR 3)

---

## What this does NOT solve

- **Email alerts** — PR 1 is in-app + Web Push only. Email waits for PR 3.
- **SLA per task type** — hardcoded 3-day threshold in PR 1. Configurable in PR 3.
- **Proactive detection when nobody opens the board** — PR 1 is "fire on access". A task sitting in a dormant project never escalates until someone visits. PR 3 fixes this.

---

## Open questions for the product team (David)

1. **Who is "the PM"?** PR 1 proposes `Project.project_manager` FK defaulting to `created_by`. Is that right, or should it be the user with `ProjectTeamMember.role == 'PM'` / `'CPM'` / `'Principal Agent'`? Depending on answer, the field may be redundant with ProjectTeamMember.
2. **When a task is escalated, who should be notified?** Proposal: assignees + PM. Should the project creator also always get a copy?
3. **Escalation threshold** — 3 days for every task type, or different per type? Client meeting implied different SLAs.
4. **Should clients ever be escalated to?** If a client's own approval is blocking a VO, do we escalate to them or just to the PM who chases them?
5. **Can escalations be muted?** A project in a holiday period may legitimately have everything paused. Global mute per project, or per-task "pause escalation until"?

---

## File map

Backend:
- `notification/models.py` — enum additions
- `tasks/models.py` — new field + migration
- `project/models.py` — new field + migration
- `project/views.py` — tasks endpoint patched with fire-on-access
- `tasks/views.py` — notify on auto-assign

Frontend:
- `src/types/notification.ts` — types
- `src/pages/settings/projectDetails.tsx` — PM picker
- `src/components/DashboardHeader.tsx` — (optional) icon/routing for new types
