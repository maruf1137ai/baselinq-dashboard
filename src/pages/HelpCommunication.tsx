/**
 * Help / Communication reference page.
 *
 * One section per Communication area (Channels, To & CC, Sending Messages &
 * Attachments, Channel Membership) showing who can do what in plain
 * English. Written for non-technical users — uses role display names, not
 * role codes. Mirrors HelpTasks.tsx / HelpFinance.tsx / HelpProgramme.tsx /
 * HelpMeetings.tsx's shape and styling deliberately, so this reads as the
 * same reference family rather than a second design.
 *
 * IMPORTANT — read before editing: this feature has no dedicated
 * permission codes at all (no "channel.", "communication.", or "message."
 * code exists anywhere in the permission matrix) — access is entirely
 * hand-rolled logic in channel/permissions.py, not the standard has_perm
 * system Tasks/Finance/Programme use. Also: the app still contains UI copy
 * (a "you're CC'd — view only" banner) describing a restriction that was
 * deliberately removed on the server — see the To & CC section below.
 * Don't reintroduce that stale framing without re-checking
 * channel/permissions.py::user_can_post_to_channel first.
 *
 * Source of truth:
 *   - Channel / Message models       → channel/models.py (Channel.task is
 *     optional; channel_type: public|private|announcement|safety_critical)
 *   - Auto-created channel per task  → tasks/views.py
 *     (_create_channel_for_task) — frontend task forms must never POST to
 *     channels/ themselves (see the identical comment in every task form)
 *   - Direct/ad-hoc channel creation → channel/views.py (ChannelViewSet,
 *     permission_classes = [IsAuthenticated, ChannelPostPermission] — but
 *     ChannelPostPermission only checks object permission, which create()
 *     never triggers, so creation itself only requires being logged in)
 *   - To / CC semantics               → components/header/forms/
 *     TaskMetaFields.tsx (to/cc → Task.assigned_to/response_by),
 *     channel/serializers.py (ChannelMember.role is a display-only tag),
 *     channel/permissions.py (user_can_post_to_channel — To and CC have
 *     identical posting rights), channel/tests_cc_view_only.py (the
 *     regression test documenting that change)
 *   - Posting / access gate           → channel/permissions.py
 *     (user_can_access_channel, user_can_post_to_channel)
 *   - Attachments                     → channel/views.py (presigned S3
 *     upload, MessageAttachmentPreviewView — same-origin signed proxy, not
 *     /media/)
 *   - Channel membership              → channel/views.py (add_member — no
 *     remove-member endpoint exists anywhere)
 *   - Real-time delivery              → channel/consumers.py (ChatConsumer
 *     — ping-only, no write path, reuses user_can_access_channel)
 *
 * Update this page whenever those rules change.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface CommunicationSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: CommunicationSection[] = [
  {
    type: "CHANNELS",
    title: "Channels",
    description:
      "Every conversation in Communications happens inside a channel. Most channels exist because a task exists — but you can also start one from scratch.",
    rows: [
      {
        action: "A channel appears automatically for a task",
        who: "Nobody has to do anything — it happens the moment an RFI, SI, VO, GI, IC, DC, or CPI is created.",
        when: "Immediately on task creation.",
        note:
          "This channel is named after the task's reference number (e.g. RFI-001) and starts as a normal channel anyone with access to the task can post in.",
      },
      {
        action: "Start a new, ad-hoc channel (\"New Message\")",
        who: "Any authenticated user — there is no project-membership check on creating a channel itself, only on who you're allowed to add as a member.",
        when: "Anytime, from the Communications page.",
        note:
          "You give it a name, an optional description, and pick members from the project's team. This is separate from task channels and is the only case where the app itself creates a channel directly, rather than as a side effect of something else.",
      },
      {
        action: "Post in an Announcement or Safety-Critical channel",
        who: "The project's owner, or a team member whose role is Project Manager, Client Project Manager, or Client/Owner (or an equivalent \"Manager\"/\"Owner\"-tier role).",
        when: "Anytime, for channels created as that type.",
        note:
          "Everyone else with access to the channel can still read it — this restriction is only about posting, and it applies to the channel type, not to who's on a task's To/CC list.",
      },
    ],
  },
  {
    type: "TOCC",
    title: "To & CC",
    description:
      "Set once, when a task is created — this decides who's on the task's channel and, historically, was meant to decide who could reply. That second part has changed.",
    rows: [
      {
        action: "Set To / CC when creating a task",
        who: "Whoever is creating the task. To is a single primary recipient; CC is a list, and picking someone for one removes them from the other.",
        when: "At task creation. There's no separate screen to change To/CC afterward — it changes only if the task itself is edited.",
        note:
          "To and CC aren't a message field — they're the task's own assigned_to and response_by fields. The task's channel just reads them to decide who has access.",
      },
      {
        action: "Post a reply in a task's channel",
        who: "Anyone in To or CC — today, both have exactly the same posting rights.",
        when: "Anytime while you're on the task.",
        note:
          "You may still see UI text somewhere claiming CC is \"view only, replies are disabled\" — that described an older rule that was deliberately removed on the server (there's a dedicated backend test confirming this). If you're CC'd and can't actually post, that's the platform not matching this page, not an intended restriction.",
      },
      {
        action: "Choose a \"Recipient\" when replying from a task's detail page",
        who: "Whoever is replying, from the project's team.",
        when: "Each time you send a reply.",
        note:
          "This is a different, smaller thing from To/CC — it only decides who gets notified about that one reply. It doesn't change the task's assignment, and there's no CC option here at all.",
      },
    ],
  },
  {
    type: "MESSAGES",
    title: "Sending Messages & Attachments",
    description:
      "Posting, editing, and attaching files to a message.",
    rows: [
      {
        action: "Post a message in a channel",
        who: "For a task channel: anyone in To, CC, or the task's creator. For a private channel: only its members. For an ordinary project channel: any active project team member.",
        when: "Anytime you have access to the channel.",
      },
      {
        action: "Edit or delete a message",
        who: "Only the message's own sender.",
        when: "Anytime after sending.",
      },
      {
        action: "Attach a file, image, or voice note",
        who: "Anyone who can post in the channel.",
        when: "Anytime.",
        note:
          "Files upload straight from your browser to storage — they never pass through the app's own server. Viewing or downloading them later goes through a secure, time-limited link tied to your access, not a plain file URL, so a link stops working if you lose access to the channel.",
      },
    ],
  },
  {
    type: "MEMBERS",
    title: "Channel Membership",
    description:
      "Who's considered \"on\" a channel, and how that's decided.",
    rows: [
      {
        action: "Add members to an ad-hoc (private) channel",
        who: "Whoever creates it, from the project's team, at creation time.",
        when: "Only when the channel is first created.",
        note:
          "There's no button to add or remove someone from a private channel afterward, anywhere in the app.",
      },
      {
        action: "Membership of a task channel or ordinary project channel",
        who: "Nobody manages this directly — it's automatic.",
        when: "Always kept in sync.",
        note:
          "A task channel's membership is just whoever is currently in To, CC, or is the task's creator. An ordinary (non-task) project channel is open to every active member of the project's team. Neither has an \"add\" or \"remove member\" action, because there's nothing to add — it's derived.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Communication has no dedicated permission settings of its own — there's nothing to configure in Settings → Permissions for it, unlike Tasks, Finance, or Programme. Every rule on this page is built directly into how channels and tasks work, not a role you can be granted or denied.",
  "To and CC currently behave identically for posting — the only real posting restriction on this page is the Announcement/Safety-Critical channel rule, which is about the channel itself, not about anyone's To/CC status.",
  "Real-time updates (new messages appearing without refreshing) are just a notification to \"go check again\" — every actual read, post, edit, or delete still goes through the same access rules described above, so there's no separate, looser path for live updates.",
];

export default function HelpCommunication() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/communications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Communications
        </Link>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Communication reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to Channels, To & CC, Sending Messages &
          Attachments, and Channel Membership. This area works a bit
          differently from the rest of the app — most of what's below comes
          from how tasks and channels are built, not from a permission you
          can be granted, and this page says so wherever that's the case.
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Communication</h2>
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
