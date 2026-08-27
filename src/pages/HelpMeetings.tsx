/**
 * Help / Meetings reference page.
 *
 * One section per Meetings area (Scheduling, Attendees, Updating &
 * Cancelling, AI Notes & Transcripts) showing who can do what in plain
 * English. Written for non-technical users — uses role display names, not
 * role codes. Mirrors HelpTasks.tsx / HelpFinance.tsx / HelpProgramme.tsx's
 * shape and styling deliberately, so this reads as the same reference
 * family rather than a second design.
 *
 * IMPORTANT — read before editing: unlike Tasks/Finance/Programme, almost
 * none of the role distinctions below are enforced by the Django backend.
 * MeetingViewSet (meetings/views.py) uses permission_classes =
 * [IsAuthenticated] only for create/update/cancel/attendee changes; the
 * real server-side boundary is "you created it or you're an attendee," not
 * role. Don't upgrade any "who" cell below to sound more restrictive than
 * that without re-checking the view first.
 *
 * Source of truth:
 *   - Meeting model / status fields → meetings/models.py (Meeting.Status:
 *     scheduled|live|completed|cancelled|no_show — there is no "held"
 *     status; Meeting.ArtefactStatus: none|processing|transcribed|
 *     notes_ready — this is the real transcription/notes progress field)
 *   - Create / update permission classes → meetings/views.py
 *     (MeetingViewSet, permission_classes = [IsAuthenticated] only;
 *     get_queryset() = creator or attendee)
 *   - Frontend button gating (UI-only, DB/override-aware via
 *     useEffectivePermissions, not the static roleUtils.ts arrays) →
 *     hooks/usePermissions.ts (canScheduleMeeting, canUpdateMeeting —
 *     isOrgAdmin always bypasses both), user/migrations/
 *     0025_simplify_meeting_permissions.py (meeting.schedule /
 *     meeting.update org-level default role grants)
 *   - Per-project override of the above → project/models.py
 *     (ProjectRolePermission), permissions/core.py
 *     (_compute_effective_permissions Layer 3)
 *   - Attendees / RSVP                → meetings/serializers.py
 *     (attendees field on the update serializer), meetings/views.py
 *     (rsvp action — self-scoped only)
 *   - Bot / transcription pipeline    → meetings/recall.py (schedule_bot,
 *     verify_signature), meetings/gladia.py (actual speech-to-text),
 *     meetings/views.py (recall_webhook, generate_ai_notes)
 *   - AI notes generation              → meetings/notetaker/ (OpenAI
 *     gpt-4o pipeline), meetings/views.py (generate_ai_notes — requires
 *     OPENAI_API_KEY)
 *   - Action item approval (the one real role check) → meetings/views.py
 *     (_can_approve_action_item), project/role_permissions.py
 *     (FULL_CONTROL_ROLES = CLIENT, CPM, PM)
 *
 * Update this page whenever those rules change.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface MeetingSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: MeetingSection[] = [
  {
    type: "SCHEDULING",
    title: "Scheduling",
    description:
      "Creating a new meeting: title, date/time, priority, an optional video link, and who's invited.",
    rows: [
      {
        action: "Schedule a new meeting",
        who:
          "The \"Schedule Meeting\" button is shown to Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Consultant Quantity Surveyor, and Architect.",
        when: "Anytime on the project.",
        note:
          "This is a UI-only restriction, and even that is just a default. The server accepts a meeting-creation request from any authenticated project member regardless of role — there is no role check in the backend for this action, only for whether the button is shown. A project admin can also change which roles see the button for a specific project, and an organisation admin always sees it no matter their project role.",
      },
    ],
  },
  {
    type: "ATTENDEES",
    title: "Attendees",
    description:
      "Who gets invited, and what they can do about it. Attendees are picked once, when the meeting is created.",
    rows: [
      {
        action: "Add attendees",
        who: "Whoever is creating the meeting, choosing from the project's team members.",
        when: "Only at creation time.",
        note:
          "The creator is automatically added and can't be removed. There is no button anywhere to add or remove attendees after the meeting is created — the meetings list shows who's attending, and the meeting's own detail page shows who's attending too, but neither one lets you change it.",
      },
      {
        action: "Accept or decline an invite (RSVP)",
        who: "Only the invited person, for their own invite.",
        when: "Anytime before or during the meeting.",
        note: "This is the one attendee action that's properly scoped to \"you\" — you can never RSVP on someone else's behalf.",
      },
    ],
  },
  {
    type: "UPDATING",
    title: "Updating & Cancelling",
    description:
      "Changing meeting details, cancelling, or marking a meeting completed / no-show once it's passed.",
    rows: [
      {
        action: "Cancel a meeting, or mark it Completed / No Show",
        who:
          "These buttons are shown to the same roles as scheduling: Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Consultant Quantity Surveyor, Architect.",
        when: "Anytime the meeting exists (cancel), or once it's in the past (mark outcome).",
        note:
          "Also UI-only, and also just a default — same caveats as scheduling above. The server actually allows the meeting's creator, or any invited attendee, to cancel or update it — not just the roles above. There's no separate \"edit meeting details\" screen; only status changes and cancellation exist as actions after creation.",
      },
      {
        action: "See a meeting at all (it shows up in your list)",
        who: "Only the meeting's creator and its invited attendees.",
        when: "Always, for as long as you're on the meeting.",
        note:
          "Worth knowing: an earlier permission specifically for \"view a meeting\" was removed, with the intent (per that change's own notes) that meetings become visible to the whole project team by default. That's not what the current code does — visibility is still limited to the creator and attendees, not every team member.",
      },
    ],
  },
  {
    type: "NOTES",
    title: "AI Notes & Transcripts",
    description:
      "How a transcript and AI-generated notes get created for a meeting, and who can see them once they exist.",
    rows: [
      {
        action: "Get notes automatically (join a video call)",
        who: "The meeting's creator or any attendee — whoever clicks Join Meeting.",
        when: "When the meeting has a video link and hasn't already been recorded.",
        note:
          "Joining triggers a recording bot. Once the call ends, the recording is transcribed and summarized automatically — no manual step needed. This can take a few minutes; the page polls for progress and updates itself once notes are ready.",
      },
      {
        action: "Paste a transcript manually to generate notes",
        who: "The meeting's creator or any attendee.",
        when: "Once the meeting is in the past and no notes exist yet from the automatic path.",
        note:
          "This is the fallback for a meeting that didn't use the built-in recording bot (e.g. held on a tool the bot can't join). It requires a non-empty transcript pasted in, and the server needs an AI key configured — if that's missing, generating notes will fail with an error rather than silently doing nothing.",
      },
      {
        action: "View the transcript (raw or AI-cleaned)",
        who: "The meeting's creator or any attendee.",
        when: "Once a transcript exists.",
        note:
          "Two read-only views: a speaker-resolved \"AI Transcript\" and a verbatim \"Raw Transcript.\" Neither can be edited from the app.",
      },
      {
        action: "Approve or decline an AI-suggested action item",
        who:
          "The person the item is assigned to, OR the meeting's creator, OR a project team member who is Client/Owner, Client Project Manager, or Project Manager.",
        when: "Once AI notes have generated action items from the transcript.",
        note:
          "This is the one action on this whole page that's genuinely role-checked by the server, not just hidden in the UI — everything else above is enforced only by \"you created it or you're on it.\"",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Unlike Tasks, Finance, and Programme, most of the role restrictions on this page are enforced only by the interface, not by the server. For scheduling, updating, cancelling, and attendee changes, the real rule the backend applies is: you created the meeting, or you're one of its attendees — your project role doesn't change what you're allowed to do beyond that. The one exception is approving AI action items, which does check your actual role.",
  "A meeting's status is one of: Scheduled, Live, Completed, Cancelled, or No Show. There's no \"Held\" status — if you see that term used elsewhere, it doesn't match what the system actually tracks.",
  "AI processing progress (none → processing → transcribed → notes ready) is tracked separately from the meeting's own status, so a meeting can show as \"Completed\" while its notes are still being generated in the background.",
  "The role lists for Scheduling and Updating/Cancelling are organisation-wide defaults, not guarantees. A project admin can grant or revoke either one for a specific role on a specific project via Settings → Permissions, and an organisation admin always sees both buttons regardless of their role on the project.",
];

export default function HelpMeetings() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Link>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Meetings reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to who can do what in Scheduling, Attendees,
          Updating & Cancelling, and AI Notes & Transcripts. Meetings work
          differently from other areas of the app — most of what's below is
          enforced by the interface, not the server, and this page says so
          wherever that's the case.
        </p>

        {/* Quick jump nav */}
        <div className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.type}
              href={`#${s.type.toLowerCase()}`}
              className="text-xs px-2.5 py-1 rounded-full border border-border text-foreground hover:bg-muted transition-colors"
            >
              {s.title}
            </a>
          ))}
        </div>

        {/* Per-area sections */}
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.type} id={s.type.toLowerCase()} className="scroll-mt-6">
              <h2 className="text-lg font-normal text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left font-normal px-4 py-2.5 w-1/4">Action</th>
                      <th className="text-left font-normal px-4 py-2.5 w-2/5">Who can do it</th>
                      <th className="text-left font-normal px-4 py-2.5">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="px-4 py-3 text-foreground">{r.action}</td>
                        <td className="px-4 py-3 text-foreground leading-relaxed">{r.who}</td>
                        <td className="px-4 py-3 text-foreground leading-relaxed">
                          {r.when}
                          {r.note && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              {r.note}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* Cross-cutting rules */}
        <section className="mt-12">
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Meetings</h2>
          <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
            <ul className="space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-5">
              {GLOBAL_NOTES.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated 2026-08-27. If the platform behaves differently from
          what's described here, the platform's behaviour is the bug — please
          let the team know.
        </p>
      </div>
    </div>
  );
}
