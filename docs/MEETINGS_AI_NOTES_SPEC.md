# Meetings AI notes — full spec

Spec for fixing the "ghost feature" that the meeting AI notes flow currently is. Intended for the backend team.

**Owner:** backend team (Shaon / Maruf) + small frontend follow-up
**Related:** tracking issue baselinq-backend#22, PR `fix/recall-transcription-provider`
**Out of scope of Darren meeting** — this is technical debt from the Recall.ai integration shipped 23 Apr.

---

## TL;DR

The Recall.ai bot joins meetings, records, and transcribes — but the entire lifecycle is invisible to the user. Notes either appear silently after 30-120 minutes, or silently never appear at all. No notification. No status. No feedback loop. The "Generate AI Notes" button in the UI actually asks for a manual transcript paste — which is now redundant to the bot but confusing to the user.

This spec proposes a state machine + notifications + small UI changes that make the pipeline transparent and reliable.

---

## Current state (what actually happens)

1. User creates a meeting with a `meeting_link` (Zoom / Meet / Teams URL).
2. Backend (`tasks/views.py` + `meetings/recall.py`) posts to Recall.ai API asking a bot to join at meeting start time. `Meeting.recall_bot_id` is stored.
3. At meeting time, bot joins (shows up in the video call as "BaseLinq Bot").
4. Bot records, leaves, Recall.ai generates transcript.
5. Recall.ai fires webhook `bot.done` to our backend.
6. Webhook handler (`meetings/views.py::recall_webhook`) **synchronously**:
   - Calls Recall.ai API to fetch transcript (up to 30s)
   - Calls OpenAI `gpt-4o-mini` to summarise (up to 90s)
   - Strips markdown fences from JSON response
   - Saves to `Meeting.summary_overview`, `Meeting.summary_sections`
7. User refreshes the meeting page; if they're lucky, summary is there.

### What's wrong with this

| # | Problem | Evidence |
|---|---------|----------|
| 1 | **Provider "default" is slow** | `meetings/recall.py:43` — free-tier ASR takes 30-120 min. **Fixed in PR `fix/recall-transcription-provider`.** |
| 2 | **User sees nothing between meeting end and summary ready** | `Meeting` model has no `ai_status`. Frontend has no badge. Silent wait for 30-120 min. |
| 3 | **Webhook handler is synchronous on OpenAI call** | Recall webhook timeout is ~10s. OpenAI responds in 30-90s. Recall times out → retries 5x → each retry re-runs OpenAI call (with `decisions.all().delete()` before each) → data can be corrupted. Known fault in `meetings/views.py::recall_webhook`. |
| 4 | **Silent OpenAI failures** | `except Exception as e: logger.error(...); return` — user sees "No AI notes yet" forever, no error surface. |
| 5 | **"Generate AI Notes" button is misleading** | Still asks for manual transcript paste (`components/meetings/generateAiNotesDialog.tsx`) even when the bot already has a transcript. Redundant + confusing. |
| 6 | **No notification when notes land** | `_process_transcript()` saves summary and returns. Never calls `create_notification()`. User has no idea the notes are ready unless they manually re-open the meeting. |
| 7 | **No bot lifecycle events exposed to user** | Recall webhook events `bot.joining`, `bot.in_call_recording`, `bot.done` are not used. We only handle `bot.done`. |
| 8 | **No retry on failure** | One OpenAI hiccup = no summary, forever. |
| 9 | **JSON parsing is fragile** | Manual markdown fence stripping. Should use OpenAI / Anthropic JSON-mode or tool use. |
| 10 | **Only one meeting notification type** | `notification/models.py:67-80` has `MEETING_INVITED` and `MEETING_UPDATED`. Nothing for "notes ready", "bot joined", "generation failed". |

---

## Proposed solution

### Meeting state machine

Replace the silent process with a visible state machine on `Meeting`:

```
ai_status: pending → bot_scheduled → bot_recording → transcribing
                                                      ↓
                                                   summarizing
                                                      ↓
                                                    ready
              ↓
            failed (with ai_error_message)
```

Every state transition:
- Updates `Meeting.ai_status`
- Fires a Web Push + in-app notification to attendees (configurable granularity — by default: only "ready" and "failed" notify; transitions just update status silently)
- Surfaces in a badge on the meeting card

### New fields on `Meeting`

```python
AI_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("bot_scheduled", "Bot scheduled"),
    ("bot_recording", "Recording"),
    ("transcribing", "Transcribing"),
    ("summarizing", "Generating summary"),
    ("ready", "Notes ready"),
    ("failed", "Failed"),
]
ai_status = models.CharField(max_length=20, choices=AI_STATUS_CHOICES, default="pending")
ai_error_message = models.TextField(blank=True)
bot_joined_at = models.DateTimeField(null=True, blank=True)
bot_left_at = models.DateTimeField(null=True, blank=True)
```

### New `Notification.Type` values

```python
MEETING_NOTES_READY = "meeting_notes_ready", _("Meeting notes ready")
MEETING_NOTES_FAILED = "meeting_notes_failed", _("Meeting notes failed")
```

### New `TaskAudit`-equivalent for meetings

Optional. For now, state transitions on `ai_status` are enough. If detailed audit is wanted later, add `MeetingAudit` model with same structure as `TaskAudit`.

### Webhook handler rework

**Currently:** synchronous pipeline inside the webhook handler.

**New shape:** webhook returns 200 immediately, kicks off background work.

Without Celery (interim):
```python
def recall_webhook(request):
    # ... HMAC check, parse payload ...
    event = payload["event"]
    bot_id = extract_bot_id(payload)
    meeting = Meeting.objects.filter(recall_bot_id=bot_id).first()
    if not meeting:
        return Response({"received": True})

    if event == "bot.joining":
        meeting.ai_status = "bot_recording"
        meeting.bot_joined_at = timezone.now()
        meeting.save(update_fields=["ai_status", "bot_joined_at"])
    elif event == "bot.done":
        meeting.ai_status = "transcribing"
        meeting.bot_left_at = timezone.now()
        meeting.save(update_fields=["ai_status", "bot_left_at"])
        # Kick off background work — returns 200 immediately
        threading.Thread(
            target=_run_summary_pipeline, args=(meeting.id,), daemon=True,
        ).start()

    return Response({"received": True})


def _run_summary_pipeline(meeting_id):
    meeting = Meeting.objects.get(pk=meeting_id)
    try:
        transcript = get_transcript_text(meeting.recall_bot_id)
        if not transcript:
            _mark_failed(meeting, "Empty transcript from Recall.ai")
            return
        meeting.ai_status = "summarizing"
        meeting.save(update_fields=["ai_status"])
        _process_transcript(meeting, transcript)  # existing OpenAI/Claude call
        meeting.ai_status = "ready"
        meeting.save(update_fields=["ai_status"])
        _notify_attendees_notes_ready(meeting)
    except Exception as e:
        _mark_failed(meeting, str(e)[:500])


def _mark_failed(meeting, reason):
    meeting.ai_status = "failed"
    meeting.ai_error_message = reason
    meeting.save(update_fields=["ai_status", "ai_error_message"])
    _notify_attendees_notes_failed(meeting, reason)
```

**With Celery (proper):** replace the `threading.Thread` with a `.delay()` call on a Celery task.

### Frontend UX changes

**Meeting detail page** (`src/pages/meetingDetails.tsx`):

- Add an `AIStatusBadge` component that renders based on `meeting.ai_status`:
  - `pending` / `bot_scheduled` → small grey "🎙 Linq AI will attend"
  - `bot_recording` → green pulsing "🔴 Recording now"
  - `transcribing` → amber "⏳ Transcribing — typically 2-5 min"
  - `summarizing` → amber "✨ Generating summary..."
  - `ready` → hidden (summary itself is shown)
  - `failed` → red "⚠ Note generation failed. [Retry] or [paste transcript manually]"

- Auto-refresh the meeting detail page every 10s while `ai_status in (transcribing, summarizing)`.

**Generate AI Notes dialog:**

- If `meeting.recall_bot_id` is set → hide the button entirely for users who aren't admins. The bot is doing the work.
- If no `recall_bot_id` (meeting had no link) → keep the manual-paste dialog as the only option. Label it clearly: "Paste transcript manually" not "Generate AI Notes".
- If `ai_status == "failed"` → show "Retry" button on the detail page (re-kicks the pipeline).

### LLM migration (optional, bundle with this work or defer)

Swap OpenAI `gpt-4o-mini` for Anthropic `claude-sonnet-4-5` via tool use:
- No manual JSON fence stripping (tool use guarantees structured output)
- Cheaper prompt caching on the instruction block
- Streaming support (if we later want to show summary appearing live)

Not essential. Keep OpenAI for now if easier. The infrastructure is the important change.

---

## Rollout — proposed 2 PRs

### PR 1 — Visible state machine + non-blocking webhook

1. Migration: add `ai_status`, `ai_error_message`, `bot_joined_at`, `bot_left_at` on `Meeting`
2. Migration: add new `Notification.Type` values
3. `meetings/views.py::recall_webhook` — return 200 immediately, kick off thread
4. `_run_summary_pipeline` + `_mark_failed` helpers
5. Notification fires on `ready` and `failed`
6. Frontend: `AIStatusBadge` component + slot it into meeting list and detail pages
7. Frontend: auto-refresh while generating
8. Frontend: update Generate AI Notes dialog visibility logic

Ships without Celery. Uses `threading.Thread` as an interim. Recall.ai webhook no longer times out. User sees every stage. Failures become visible.

**Size:** ~400 lines backend, ~150 lines frontend, 2 migrations.

### PR 2 — Celery + Anthropic (deferred, needs infra)

1. Celery + Redis setup (this is the gatekeeper — must land first as a separate infra PR, same as Tasks spec §PR 3)
2. Replace `threading.Thread(...)` with `@shared_task` + `.delay()`
3. Retry on transient failures (3x exponential backoff, then mark failed)
4. Swap OpenAI for `claude-sonnet-4-5` with tool use + prompt caching
5. Stream summary to frontend for UX polish (optional)

---

## Open questions

1. **Notification granularity** — default proposed: fire for `ready` and `failed` only. Should every state change also fire a silent update (no push but status update)? The frontend can poll, so probably not.
2. **Who gets the notification?** Proposed: all meeting attendees. Should the meeting creator always get it even if not attending?
3. **Retry on failure** — should the "Retry" button just re-POST to the webhook handler, or fetch transcript + regenerate from scratch?
4. **Generate AI Notes button** — keep it always visible as a manual fallback for meetings without bots? Or hide it whenever `recall_bot_id` is set? My proposal hides it in the bot case.
5. **Meeting status flow** — currently `Meeting.status` is `scheduled | held | cancelled`. Should `ai_status` replace this or live alongside? They're orthogonal — `status` is about whether the meeting happened, `ai_status` is about the AI pipeline. Proposal: keep both, separate concerns.

---

## Dependencies

- `fix/recall-transcription-provider` (already open) — should land before this; it's the cheap fix that makes the new flow visibly fast
- Celery + Redis infra PR — required for PR 2 (this spec's PR 2), also for Task Alerts PR 3
- Anthropic SDK — already in `requirements.txt` but not used

---

## File map

Backend:
- `meetings/models.py` — new fields
- `meetings/migrations/00XX_add_ai_status.py`
- `notification/models.py` — new Type values
- `meetings/views.py::recall_webhook` — rework
- `meetings/views.py::_run_summary_pipeline` — new
- `meetings/tasks.py` — future Celery task (PR 2)
- `meetings/llm.py` — refactor _process_transcript into reusable helper, maybe swap to Anthropic

Frontend:
- `src/components/meetings/AIStatusBadge.tsx` — new
- `src/pages/meetingDetails.tsx` — render badge + auto-refresh
- `src/components/meetings/meetingList.tsx` — badge on card
- `src/components/meetings/generateAiNotesDialog.tsx` — visibility rules
- `src/types/notification.ts` — new types

---

## Appendix — attendee RSVP (added 24 Apr)

**Client ask (24 Apr):** *"we need a accept and decline when users are added to a meeting, and a scroll over on users attending or declined so people can see who is attending the meeting"*

### Backend

```python
class MeetingAttendee(models.Model):
    class Response(models.TextChoices):
        PENDING = "pending", _("Pending")
        ACCEPTED = "accepted", _("Accepted")
        DECLINED = "declined", _("Declined")
        TENTATIVE = "tentative", _("Tentative")

    meeting = models.ForeignKey(Meeting, on_delete=CASCADE, related_name="attendee_records")
    user = models.ForeignKey(User, on_delete=CASCADE)
    response = models.CharField(max_length=16, choices=Response.choices, default=Response.PENDING)
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("meeting", "user")]
```

Endpoints:
- `POST /api/meetings/{id}/respond/` — body `{response: "accepted"|"declined"|"tentative"}`
- `GET /api/meetings/{id}/attendees/` — returns `[{user, response, responded_at}, ...]`

Notification type:
- `meeting_response_received` — fires to creator when someone responds

Migration: back-fill existing `Meeting.attendees` M2M into new `MeetingAttendee` rows with `response=pending`.

### Frontend
- Meeting list card: hover on "N users" → popover listing each attendee + icon/colour per response state
- Meeting detail: Accept / Decline / Tentative buttons for current user, shown when they're an attendee and haven't responded yet
- Attendee list section shows tally "3 accepted · 1 declined · 2 pending"

**Size:** ~200 lines backend + migration, ~250 lines frontend, 1 new notification type.
