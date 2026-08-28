/**
 * Mock data for the Roles & Permissions page — UI ONLY.
 *
 * Mirrors the real shape so the page can be wired to the API by deleting this
 * file and swapping the two selectors at the bottom:
 *
 *   49 permissions  ×  29 system roles  =  1,421 possible cells
 *   364 global defaults, 14 org overrides, 7 project overrides
 *
 * The three layers are the reason this page exists. An answer is resolved
 * global → organisation → project, last one that is SET wins, and a project
 * override can silently reverse a global grant (permissions/core.py
 * ::_compute_effective_permissions). That is the failure the UI has to show
 * rather than hide, so `resolve()` returns the whole trace, not just a boolean.
 */

export type Layer = "global" | "org" | "project";
export type LayerValue = true | false | null; // null = not set at this layer

export interface Permission {
  code: string;
  /** Plain English — what a person would call this. */
  label: string;
  /**
   * When the action is available, lifted from the matching Help row's
   * `when` (plus its `note` where both fit). This is what the row shows
   * under the label — the dotted code is a developer detail and lives in
   * the row's title attribute instead.
   */
  description: string;
  /** Project-scoped permissions can be overridden per project (107 of 109). */
  projectScoped: boolean;
}

/** A named slice of an area, with the plain-English intro the Help pages use. */
export interface PermissionPart {
  title: string;
  /** Mirrors the tone of the matching Help section — written for non-technical users. */
  explain: string;
  permissions: Permission[];
}

export interface PermissionGroup {
  key: string;
  title: string;
  /** One line describing the area. */
  blurb: string;
  /** Route of the matching Help reference, or null where none exists yet. */
  help: string | null;
  parts: PermissionPart[];
  /** Flat list of every permission in the area. Derived from `parts`. */
  permissions: Permission[];
}

export interface Role {
  code: string;
  name: string;
  group: string;
  /** How many users currently hold this role. 0 = defined but unused. */
  users: number;
  description: string;
}

/* ── Permissions, grouped as the codes already group themselves ─────────── */

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "tasks",
    title: "Tasks",
    blurb:
      "RFI, SI, VO, IC, DC, GI, CPI — who can create, reply, sign, approve, close, or escalate each one.",
    help: "/help/tasks",
    parts: [
      {
        title: "RFI — Request for Information",
        explain:
          "The contractor asks the design team a question. Lives until the team replies and the contractor is happy with the answer.",
        permissions: [
          {
            code: "tasks.rfi_request.create_rfi",
            label: "Create a new RFI",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "tasks.rfi_request.reply_rfi",
            label: "Reply to the RFI",
            description:
              "Until the RFI is closed. The first reply moves the RFI from Open to Sent for Review. Anyone granted this is suggested in the CC field when a reply is drafted, and is added to the task once selected.",
            projectScoped: true,
          },
          {
            code: "tasks.rfi_request.turn_site_instruction",
            label: "Turn it into a Site Instruction",
            description:
              "Before the RFI is closed. The new Site Instruction will automatically link back to this RFI.",
            projectScoped: true,
          },
          {
            code: "tasks.rfi_request.close_rfi",
            label: "Close the RFI",
            description:
              "Once the answer is acceptable. Hidden if the RFI is already Closed or Answered.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "SI — Site Instruction",
        explain:
          "A design professional tells the contractor to do something on site. Becomes contractually binding once it's signed.",
        permissions: [
          {
            code: "tasks.si_site.create_si",
            label: "Create a new SI",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "tasks.si_site.reply_si",
            label: "Reply to the SI",
            description:
              "While the SI is still active (Issued, Acknowledged, Actioned, or In Progress). Ticking Time or Cost is the signal that a Variation Order may be needed. Anyone granted this is suggested in the CC field when a reply is drafted, and is added to the task once selected.",
            projectScoped: true,
          },
          {
            code: "tasks.si_site.sign_issue",
            label: "Sign and issue",
            description:
              "Before the SI is Verified. Signing requires a 4-digit PIN if you've set one in Settings → Security. Otherwise click-confirm is enough.",
            projectScoped: true,
          },
          {
            code: "tasks.si_site.turn_variation_order",
            label: "Turn it into a Variation Order",
            description:
              "Before the SI is Verified. Usually triggered when the contractor's reply showed cost or time impact.",
            projectScoped: true,
          },
          {
            code: "tasks.si_site.close_si",
            label: "Close the SI",
            description:
              "Once the work is done. Hidden if the SI is already Verified.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "VO — Variation Order",
        explain:
          "A formal change to the contract — scope, cost or time. The contractor prices it, the Principal Agent recommends it, the Client approves the big ones. A signed VO automatically updates the project's contract value and end date.",
        permissions: [
          {
            code: "tasks.vo_variation.create_vo",
            label: "Create a new VO",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "tasks.vo_variation.price_vo",
            label: "Price the VO",
            description:
              "While the VO is still a Draft or Submitted. Submitting pricing moves the VO to Priced.",
            projectScoped: true,
          },
          {
            code: "tasks.vo_variation.recommend_approval",
            label: "Recommend for Approval",
            description:
              "VO is Priced AND the total is above the Principal Agent's mandate. Only shows when the VO is too big for the PA to approve alone. Within the mandate, the same person sees 'Approve & Sign' instead.",
            projectScoped: true,
          },
          {
            code: "tasks.vo_variation.approve_sign",
            label: "Approve and sign",
            description:
              "VO is Priced (within mandate) or Recommended (over mandate). Signing requires a 4-digit PIN if set. Once signed, the contract value and end date on the project are updated automatically.",
            projectScoped: true,
          },
          {
            code: "tasks.vo_variation.close_vo",
            label: "Close the VO",
            description:
              "Hidden once the VO is Approved, Rejected or Closed.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "IC — Intention to Claim",
        explain:
          "The contractor's early warning that a claim may be coming. The Project Manager assesses how serious it is and rates the risk. High-risk claims automatically notify the respondent's insurance broker.",
        permissions: [
          {
            code: "tasks.ic_intention.file_intention_claim",
            label: "File an Intention to Claim",
            description:
              "As soon as something happens that could cause a claim later.",
            projectScoped: true,
          },
          {
            code: "tasks.ic_intention.rate_risk_low",
            label: "Rate the risk (Low / Medium / High)",
            description:
              "While the IC is Sent or Acknowledged. Rating it High triggers an email to the respondent's insurance broker.",
            projectScoped: true,
          },
          {
            code: "tasks.ic_intention.resend_broker_email",
            label: "Resend the broker email",
            description:
              "If the IC is High-risk but the broker email never went out — usually because no broker email was on file at the time.",
            projectScoped: true,
          },
          {
            code: "tasks.ic_intention.escalate_formal_claim",
            label: "Escalate to a formal Claim",
            description:
              "After at least 7 days have passed since the IC was filed AND the contractor has written at least 20 characters describing what they did to try to resolve it.",
            projectScoped: true,
          },
          {
            code: "tasks.ic_intention.close_ic",
            label: "Close the IC",
            description:
              "Hidden once the IC is Closed or already Escalated to Claim.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Claim — Delay or Cost Claim",
        explain:
          "The formal claim that grows out of an Intention to Claim. The Project Manager assesses it, may grant an extension of time, or determine the cost. Signed by the PM once decided.",
        permissions: [
          {
            code: "tasks.claim_delay.file_formal_claim",
            label: "File the formal Claim",
            description:
              "Through the 'Escalate to Claim' button on the IC — the mitigation rules must pass first. Direct create is also possible for contractor-side roles, but the IC-then-Claim path is the spec-compliant flow.",
            projectScoped: true,
          },
          {
            code: "tasks.claim_delay.reply_assess_claim",
            label: "Reply / assess the claim",
            description:
              "While the claim is at Notice Issued or Under Assessment. Submitting the PM's determination moves the claim to EOT Awarded (extension of time) or Determination Made. Anyone granted this is suggested in the CC field when a reply is drafted, and is added to the task once selected.",
            projectScoped: true,
          },
          {
            code: "tasks.claim_delay.sign_issue_determination",
            label: "Sign and issue the determination",
            description:
              "Once the PM has written their determination response. Signing requires a 4-digit PIN if set.",
            projectScoped: true,
          },
          {
            code: "tasks.claim_delay.close_claim",
            label: "Close the claim",
            description:
              "Hidden once the claim is at EOT Awarded, Determination Made or Closed.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "GI — General Instruction",
        explain:
          "A general note between professionals, or from the Main Contractor to a subcontractor. Lighter than a Site Instruction — not contractually binding the same way.",
        permissions: [
          {
            code: "tasks.gi_general.create_general_instruction",
            label: "Create a General Instruction",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "tasks.gi_general.reply_gi",
            label: "Reply to the GI",
            description:
              "While the GI is Sent or Replied. The first reply moves the GI from Sent to Replied. Anyone granted this is suggested in the CC field when a reply is drafted, and is added to the task once selected.",
            projectScoped: true,
          },
          {
            code: "tasks.gi_general.close_gi",
            label: "Close the GI",
            description:
              "Hidden once the GI is already Closed.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "CPI — Critical Path Item",
        explain:
          "A programme / schedule item on the project's critical path. Tracked through statuses — there's no formal signing for this type.",
        permissions: [
          {
            code: "tasks.cpi_critical.create_critical_path",
            label: "Create a Critical Path Item",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "tasks.cpi_critical.update_status_progress",
            label: "Update the status / progress",
            description:
              "While the item is Open, In Progress or Blocked.",
            projectScoped: true,
          },
          {
            code: "tasks.cpi_critical.close_item",
            label: "Close the item",
            description:
              "Move the item to Done or Cancelled instead.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "finance",
    title: "Finance",
    blurb:
      "Cost Ledger, Variation Orders, Payment Certificates, Platform Fees — who can do what, and when.",
    help: "/help/finance",
    parts: [
      {
        title: "Cost Ledger",
        explain:
          "The running record of what's been committed as cost (Debit) and what's been certified or offset against it (Credit). Most entries appear automatically — this is a record, not something you usually type into by hand.",
        permissions: [
          {
            code: "finance.cost_ledger.view_cost_ledger",
            label: "View the Cost Ledger",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "finance.cost_ledger.add_entry_manually",
            label: "Add an entry manually",
            description:
              "Anytime — for costs that don't come from a Variation Order or Payment Certificate. A Variation Order or Payment Certificate can only be linked to a manual entry once it's Approved / Posted respectively.",
            projectScoped: true,
          },
          {
            code: "finance.cost_ledger.export_csv",
            label: "Export to CSV",
            description:
              "Anytime.",
            projectScoped: true,
          },
          {
            code: "finance.cost_ledger.entries_created_automatically",
            label: "Entries created automatically",
            description:
              "A Debit appears the moment a Variation Order is Approved. A Credit appears the moment a Payment Certificate is Posted — not when it's created, submitted, or anywhere earlier in the chain, and never at all if it's Rejected or Cancelled first.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Variation Orders (Finance)",
        explain:
          "A formal change to the contract's cost. This page covers the Finance tab's own actions — for the full task workflow (pricing, recommending, the contractor's side) see the Task workflow reference.",
        permissions: [
          {
            code: "finance.variation_orders.create_edit_delete",
            label: "Create, edit or delete a Variation Order",
            description:
              "Anytime on the project. There's no \"New Variation Order\" button on this page by design — a VO is always escalated from a Site Instruction or task.",
            projectScoped: true,
          },
          {
            code: "finance.variation_orders.sign_issue_approval",
            label: "Sign & Issue (the approval)",
            description:
              "Once the VO has been priced. Signing requires a 4-digit PIN if you've set one in Settings → Security. This is what puts the Debit in the Cost Ledger.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Payment Certificates",
        explain:
          "The document that makes a payment legally due. Deliberately split across several roles — under JBCC the person who values and prepares a claim is never the same person who has final say over certifying it, so this page enforces that split rather than just recommending it.",
        permissions: [
          {
            code: "finance.payment_certificates.create_certificate",
            label: "Create a new certificate",
            description:
              "Anytime on the project. Creates the certificate as a Draft.",
            projectScoped: true,
          },
          {
            code: "finance.payment_certificates.edit_delete_draft",
            label: "Edit or delete a Draft",
            description:
              "While the certificate is a Draft. Once it's Submitted, nobody — not even the creator — can edit or delete it.",
            projectScoped: true,
          },
          {
            code: "finance.payment_certificates.submit_certification",
            label: "Submit for Certification",
            description:
              "While the certificate is a Draft.",
            projectScoped: true,
          },
          {
            code: "finance.payment_certificates.approve_reject",
            label: "Approve / Reject",
            description:
              "Once it's been Submitted.",
            projectScoped: true,
          },
          {
            code: "finance.payment_certificates.cancel",
            label: "Cancel",
            description:
              "At any stage before it's Posted. Withdrawal by whoever raised the claim, not a certifier's decision — that's why it needs the same permission as Submit, not the same as Reject.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Platform Fees",
        explain:
          "A read-only statement of Baselinq's own platform fee on the project's certified work. There is nothing to create or approve here.",
        permissions: [
          {
            code: "finance.platform_fees.view_platform_fees",
            label: "View Platform Fees",
            description:
              "Anytime. If your role isn't in that list, the tab shows \"Platform fees are not visible to your role\" rather than an error.",
            projectScoped: true,
          },
          {
            code: "finance.platform_fees.change_fee_rate",
            label: "Change the fee rate, cap, or basis",
            description:
              "Never, from this app. Only Baselinq's own staff can change these terms.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "programme",
    title: "Programme",
    blurb:
      "Schedule & Milestones, Milestone Fees, Programme Baseline, Risk Forecast — who can do what, and when.",
    help: "/help/programme",
    parts: [
      {
        title: "Schedule & Milestones",
        explain:
          "Phases and milestones grouped by discipline (Construction, Architectural, Engineering, Quantity Surveying, Other). The Schedule tab shows the timeline; the Milestones tab shows the list.",
        permissions: [
          {
            code: "programme.schedule_milestones.view_programme_page",
            label: "View the Programme page at all",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "programme.schedule_milestones.switch_discipline_picker",
            label: "Switch the discipline picker to see another discipline's phases",
            description:
              "Anytime, once the page is open.",
            projectScoped: true,
          },
          {
            code: "programme.schedule_milestones.add_phase_milestone",
            label: "Add a phase / milestone",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Milestone Fees",
        explain:
          "Each milestone can carry a fee amount. Your own discipline's fees are visible the moment you can view Programme at all — seeing every discipline's fees is a separate, narrower permission.",
        permissions: [
          {
            code: "programme.milestone_fees.view_own_discipline",
            label: "View your own discipline's milestone fees",
            description:
              "Anytime.",
            projectScoped: true,
          },
          {
            code: "programme.milestone_fees.view_milestone_fees",
            label: "View milestone fees across every discipline",
            description:
              "Anytime. This also implies the discipline-picker permission above — seeing every discipline's fees would be meaningless without being able to list those disciplines' milestones too.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Programme Baseline",
        explain:
          "Freezes every phase's current dates as the agreed plan, sealed as a new version so slippage can be measured against it later. A baseline is never overwritten — accepting again just adds the next version.",
        permissions: [
          {
            code: "programme.programme_baseline.accept_seal_baseline",
            label: "Accept & seal a new baseline",
            description:
              "Anytime. This is the one action on this page with no role permission gate — unlike everything else here, it only checks that you're an active team member (or the project's creator), not your role.",
            projectScoped: true,
          },
          {
            code: "programme.programme_baseline.view_version_history",
            label: "View version history / compare two versions",
            description:
              "Anytime, once at least one baseline has been accepted (comparison needs at least two versions).",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Risk Forecast",
        explain:
          "Read-only AI analysis of the programme: delay risks, financial impact, compliance gates, and recommended actions. There is nothing to create or approve here.",
        permissions: [
          {
            code: "programme.risk_forecast.view_risk_forecast",
            label: "View the Risk Forecast tab",
            description:
              "Anytime. No separate permission — same gate as the rest of the page.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "meetings",
    title: "Meetings",
    blurb:
      "Scheduling, Attendees, Updating & Cancelling, AI Notes & Transcripts — who can do what, and when.",
    help: "/help/meetings",
    parts: [
      {
        title: "Scheduling",
        explain:
          "Creating a new meeting: title, date/time, priority, an optional video link, and who's invited.",
        permissions: [
          {
            code: "meetings.scheduling.schedule_meeting",
            label: "Schedule a new meeting",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Attendees",
        explain:
          "Who gets invited, and what they can do about it. Attendees are picked once, when the meeting is created.",
        permissions: [
          {
            code: "meetings.attendees.add_attendees",
            label: "Add attendees",
            description:
              "Only at creation time.",
            projectScoped: true,
          },
          {
            code: "meetings.attendees.accept_decline_invite",
            label: "Accept or decline an invite (RSVP)",
            description:
              "Anytime before or during the meeting. This is the one attendee action that's properly scoped to \"you\" — you can never RSVP on someone else's behalf.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Updating & Cancelling",
        explain:
          "Changing meeting details, cancelling, or marking a meeting completed / no-show once it's passed.",
        permissions: [
          {
            code: "meetings.updating_cancelling.cancel_meeting_mark",
            label: "Cancel a meeting, or mark it Completed / No Show",
            description:
              "Anytime the meeting exists (cancel), or once it's in the past (mark outcome).",
            projectScoped: true,
          },
          {
            code: "meetings.updating_cancelling.see_meeting_all",
            label: "See a meeting at all (it shows up in your list)",
            description:
              "Always, for as long as you're on the meeting.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "AI Notes & Transcripts",
        explain:
          "How a transcript and AI-generated notes get created for a meeting, and who can see them once they exist.",
        permissions: [
          {
            code: "meetings.ai_notes.get_notes_automatically",
            label: "Get notes automatically (join a video call)",
            description:
              "When the meeting has a video link and hasn't already been recorded.",
            projectScoped: true,
          },
          {
            code: "meetings.ai_notes.paste_transcript_manually",
            label: "Paste a transcript manually to generate notes",
            description:
              "Once the meeting is in the past and no notes exist yet from the automatic path.",
            projectScoped: true,
          },
          {
            code: "meetings.ai_notes.view_transcript_raw",
            label: "View the transcript (raw or AI-cleaned)",
            description:
              "Once a transcript exists. Two read-only views: a speaker-resolved \"AI Transcript\" and a verbatim \"Raw Transcript.\" Neither can be edited from the app.",
            projectScoped: true,
          },
          {
            code: "meetings.ai_notes.approve_decline_ai",
            label: "Approve or decline an AI-suggested action item",
            description:
              "Once AI notes have generated action items from the transcript.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "communication",
    title: "Communication",
    blurb:
      "Channels, To & CC, Sending Messages & Attachments, Channel Membership — who can do what, and when.",
    help: "/help/communication",
    parts: [
      {
        title: "Channels",
        explain:
          "Every conversation in Communications happens inside a channel. Most channels exist because a task exists — but you can also start one from scratch.",
        permissions: [
          {
            code: "communication.channels.channel_appears_automatically",
            label: "A channel appears automatically for a task",
            description:
              "Immediately on task creation. This channel is named after the task's reference number (e.g. RFI-001) and starts as a normal channel anyone with access to the task can post in.",
            projectScoped: true,
          },
          {
            code: "communication.channels.start_ad_hoc",
            label: "Start a new, ad-hoc channel (\"New Message\")",
            description:
              "Anytime, from the Communications page.",
            projectScoped: true,
          },
          {
            code: "communication.channels.post_announcement_safety",
            label: "Post in an Announcement or Safety-Critical channel",
            description:
              "Anytime, for channels created as that type. Everyone else with access to the channel can still read it — this restriction is only about posting, and it applies to the channel type, not to who's on a task's To/CC list.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "To & CC",
        explain:
          "Set once, when a task is created — this decides who's on the task's channel and, historically, was meant to decide who could reply. That second part has changed.",
        permissions: [
          {
            code: "communication.cc.set_cc_when",
            label: "Set To / CC when creating a task",
            description:
              "At task creation. There's no separate screen to change To/CC afterward — it changes only if the task itself is edited.",
            projectScoped: true,
          },
          {
            code: "communication.cc.post_reply_task",
            label: "Post a reply in a task's channel",
            description:
              "Anytime while you're on the task.",
            projectScoped: true,
          },
          {
            code: "communication.cc.choose_recipient_when",
            label: "Choose a \"Recipient\" when replying from a task's detail page",
            description:
              "Each time you send a reply. This is a different, smaller thing from To/CC — it only decides who gets notified about that one reply. It doesn't change the task's assignment, and there's no CC option here at all.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Sending Messages & Attachments",
        explain:
          "Posting, editing, and attaching files to a message.",
        permissions: [
          {
            code: "communication.sending_messages.post_message_channel",
            label: "Post a message in a channel",
            description:
              "Anytime you have access to the channel.",
            projectScoped: true,
          },
          {
            code: "communication.sending_messages.edit_delete_message",
            label: "Edit or delete a message",
            description:
              "Anytime after sending.",
            projectScoped: true,
          },
          {
            code: "communication.sending_messages.attach_file_image",
            label: "Attach a file, image, or voice note",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Channel Membership",
        explain:
          "Who's considered \"on\" a channel, and how that's decided.",
        permissions: [
          {
            code: "communication.channel_membership.add_members_ad",
            label: "Add members to an ad-hoc (private) channel",
            description:
              "Only when the channel is first created. There's no button to add or remove someone from a private channel afterward, anywhere in the app.",
            projectScoped: true,
          },
          {
            code: "communication.channel_membership.membership_task_channel",
            label: "Membership of a task channel or ordinary project channel",
            description:
              "Always kept in sync.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "documentation",
    title: "Documentation",
    blurb:
      "Viewing Documents, Uploading & Folders, Downloading & Previewing, Editing / Versioning / Deleting — who can do what, and when.",
    help: "/help/documentation",
    parts: [
      {
        title: "Viewing Documents",
        explain:
          "Two things have to both be true for you to see a document: your role has to be allowed to view documents at all, and the folder it's filed in has to be visible to you.",
        permissions: [
          {
            code: "documentation.viewing_documents.view_documents_all",
            label: "View documents at all (the Documents page)",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "documentation.viewing_documents.see_document_filed",
            label: "See a document filed inside a restricted folder",
            description:
              "Anytime, as long as you match the folder's visibility.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Uploading & Folders",
        explain:
          "Adding a new document, and the folders documents get filed into.",
        permissions: [
          {
            code: "documentation.uploading_folders.upload_document",
            label: "Upload a document",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
          {
            code: "documentation.uploading_folders.create_folder_drawings",
            label: "Create a new folder (Drawings / Documents tabs)",
            description:
              "During the upload flow, when filing into a new folder.",
            projectScoped: true,
          },
          {
            code: "documentation.uploading_folders.delete_folder",
            label: "Delete a folder",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Downloading & Previewing",
        explain:
          "Opening or saving a document's file.",
        permissions: [
          {
            code: "documentation.downloading_previewing.preview_download_document",
            label: "Preview or download a document",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Editing, Versioning & Deleting",
        explain:
          "Changing a document's details, adding a new version, or removing it — three different rules, not one.",
        permissions: [
          {
            code: "documentation.editing_versioning.edit_document_s",
            label: "Edit a document's details",
            description:
              "Anytime.",
            projectScoped: true,
          },
          {
            code: "documentation.editing_versioning.upload_version_document",
            label: "Upload a new version of a document",
            description:
              "Anytime. A new version is treated more like \"another upload\" than \"an edit\" — worth knowing if you're wondering why someone can add a revision but not edit the document's other details.",
            projectScoped: true,
          },
          {
            code: "documentation.editing_versioning.delete_document",
            label: "Delete a document",
            description:
              "Anytime, subject to the above. This is narrower than \"you uploaded it, you can delete it\" — once something references your document, only the roles above can remove it, and you'll be asked to confirm.",
            projectScoped: true,
          },
          {
            code: "documentation.editing_versioning.change_document_s",
            label: "Change a document's status (Active / Finance Gated / Archived)",
            description:
              "Anytime, following the allowed status transitions.",
            projectScoped: true,
          },
          {
            code: "documentation.editing_versioning.add_remove_document",
            label: "Add or remove a document's links to other records, or add/edit its compliance obligations",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "compliance",
    title: "Compliance",
    blurb:
      "Obligations, evidence, and notices — who can open the page, and (separately) who can see and act on what's inside it.",
    help: "/help/compliance",
    parts: [
      {
        title: "Opening the Page",
        explain:
          "Compliance is a project-wide view of contractual obligations (extracted from your documents by AI, or added by hand) and notice deadlines — deliberately with no single \"compliance score.\" There's no separate Compliance database behind it; it's built entirely on the same data as Documents.",
        permissions: [
          {
            code: "compliance.opening_page.open_compliance_page",
            label: "Open the Compliance page",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Viewing Obligations",
        explain:
          "Getting past the page's front door is one thing. Seeing any actual obligation on it is governed by a completely different permission.",
        permissions: [
          {
            code: "compliance.viewing_obligations.see_obligation_list",
            label: "See an obligation on the list",
            description:
              "Anytime, for obligations whose source document you're allowed to see.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Acting on Obligations",
        explain:
          "Adding an obligation, marking one resolved, attaching evidence, or drafting a notice.",
        permissions: [
          {
            code: "compliance.acting_obligations.add_obligation_mark",
            label: "Add a new obligation, or mark one Complete / In Progress",
            description:
              "Anytime.",
            projectScoped: true,
          },
          {
            code: "compliance.acting_obligations.attach_evidence_obligation",
            label: "Attach evidence to an obligation",
            description:
              "Anytime.",
            projectScoped: true,
          },
          {
            code: "compliance.acting_obligations.generate_notice_obligation",
            label: "Generate a notice for an obligation",
            description:
              "Anytime. This only ever drafts text onto the obligation — the platform never sends or serves a notice on your behalf. There's no dispatch step; someone still has to take the drafted wording and issue it themselves.",
            projectScoped: true,
          },
          {
            code: "compliance.acting_obligations.analyse_ai_button",
            label: "\"Analyse with AI\" button on this page",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "The \"compliance.edit\" Permission",
        explain:
          "There's a permission literally called compliance.edit — but it has nothing to do with anything on this page.",
        permissions: [
          {
            code: "compliance.compliance_edit.what_compliance_edit",
            label: "What compliance.edit actually controls",
            description:
              "—",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "project_health",
    title: "Project Health",
    blurb:
      "Risk Signals, Notice Deadlines, the Insurer tab, Commercial Position — who can open the page, and where the real restrictions actually are.",
    help: "/help/project-health",
    parts: [
      {
        title: "Opening the Page",
        explain:
          "Project Health shares its entry permission with Compliance — the same setting decides whether you can open either page.",
        permissions: [
          {
            code: "project_health.opening_page.open_project_health",
            label: "Open the Project Health page",
            description:
              "Anytime on the project.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Risk Signals",
        explain:
          "Automated flags raised against the project (delay, financial, compliance, claim risk). This is the most open part of the whole page.",
        permissions: [
          {
            code: "project_health.risk_signals.view_risk_signal",
            label: "View the risk signal feed",
            description:
              "Anytime — it's not limited to whoever can open Project Health in the first place. This is checked independently of the page's own entry permission — the underlying data has no extra gate beyond being on the project.",
            projectScoped: true,
          },
          {
            code: "project_health.risk_signals.acknowledge_risk_signal",
            label: "Acknowledge a risk signal",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Notice Deadlines",
        explain:
          "Contractual notice-period countdowns (JBCC, NEC4, FIDIC, GCC) calculated from a confirmed awareness date — this page tracks the deadline, it never sends anything on your behalf.",
        permissions: [
          {
            code: "project_health.notice_deadlines.view_track_serve",
            label: "View, track, serve, or cancel a notice deadline",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Insurer Tab",
        explain:
          "The one part of this page that's actually restricted. Controls whether an insurer can be given limited, read-only access to this project's risk data.",
        permissions: [
          {
            code: "project_health.insurer_tab.view_disclosure_consent",
            label: "View the disclosure consent setting, and other risk-policy fields",
            description:
              "Anytime. This is intentionally left open to everyone who can reach the page — restricting it further would have shut out roles (like Principal/PM) who need to see it but don't hold the stricter permission below.",
            projectScoped: false,
          },
          {
            code: "project_health.insurer_tab.turn_insurer_disclosure",
            label: "Turn insurer disclosure on/off, or issue/view insurer API keys and the disclosure log",
            description:
              "Anytime.",
            projectScoped: false,
          },
        ],
      },
      {
        title: "Commercial Position & Risk Summary",
        explain:
          "The one tab that's actually hidden from people without access, and the one-sentence risk summary shown at the top of the page.",
        permissions: [
          {
            code: "project_health.commercial_position.see_commercial_position",
            label: "See the Commercial Position tab",
            description:
              "Anytime. This is the only tab on this whole page that's genuinely hidden — not just restricted after the fact — from someone without access.",
            projectScoped: true,
          },
          {
            code: "project_health.commercial_position.see_ai_risk",
            label: "See the AI risk summary sentence at the top of the page",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    blurb:
      "User Management (add/edit/remove) and Security (signing PIN, insurance broker) — who can do what, and when.",
    help: "/help/settings",
    parts: [
      {
        title: "User Management",
        explain:
          "Adding, editing, and removing people on the current project's team. This is scoped to whichever project you have selected — it's separate from your organisation's own member list, found elsewhere in Settings.",
        permissions: [
          {
            code: "settings.user_management.add_who_already",
            label: "Add someone who already has an account",
            description:
              "Anytime. They're added to the project immediately, no invitation or acceptance step needed.",
            projectScoped: true,
          },
          {
            code: "settings.user_management.invite_by_email",
            label: "Invite someone new by email",
            description:
              "Anytime.",
            projectScoped: true,
          },
          {
            code: "settings.user_management.who_can_add",
            label: "Who can actually add or remove whom (the real rule)",
            description:
              "Always — enforced by the server on every add, remove, and role change.",
            projectScoped: true,
          },
          {
            code: "settings.user_management.change_s_project",
            label: "Change someone's project role",
            description:
              "Anytime, with one exception below.",
            projectScoped: true,
          },
          {
            code: "settings.user_management.remove_from_project",
            label: "Remove someone from the project",
            description:
              "Anytime, except you can't remove the project's last remaining Client/Owner or its last remaining Administrator.",
            projectScoped: true,
          },
          {
            code: "settings.user_management.cancel_pending_invitation",
            label: "Cancel a pending invitation (before it's accepted)",
            description:
              "Anytime before the invite is accepted or expires.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Security — Signing PIN",
        explain:
          "A 4-digit PIN you can set for yourself, used to confirm you really mean it when you sign a Site Instruction, Variation Order, or Delay Claim.",
        permissions: [
          {
            code: "settings.security_signing.set_change_clear",
            label: "Set, change, or clear your PIN",
            description:
              "Anytime, from Settings → Security.",
            projectScoped: true,
          },
          {
            code: "settings.security_signing.sign_site_instruction",
            label: "Sign a Site Instruction without a PIN set",
            description:
              "Anytime. Site Instructions are the one type that still offers a simple \"yes, I confirm\" checkbox if you haven't set a PIN.",
            projectScoped: true,
          },
          {
            code: "settings.security_signing.sign_variation_order",
            label: "Sign a Variation Order or Delay Claim without a PIN set",
            description:
              "—",
            projectScoped: true,
          },
          {
            code: "settings.security_signing.reach_security_page",
            label: "Reach the Security page at all",
            description:
              "Anytime.",
            projectScoped: true,
          },
        ],
      },
      {
        title: "Security — Insurance Broker",
        explain:
          "A personal contact on your own profile — your insurance broker's name and email — used to automatically notify them if a claim against you gets marked high-risk.",
        permissions: [
          {
            code: "settings.security_insurance.add_update_broker",
            label: "Add or update your broker's contact details",
            description:
              "Anytime, from Settings → Security.",
            projectScoped: true,
          },
          {
            code: "settings.security_insurance.trigger_notification_s",
            label: "Trigger a notification to someone's broker",
            description:
              "Whenever one of those roles makes that judgment call.",
            projectScoped: true,
          },
          {
            code: "settings.security_insurance.resend_broker_notification",
            label: "Resend the broker notification",
            description:
              "Only if the first attempt found no broker email on file — for example if the person adds their broker's details after the claim was already marked high-risk.",
            projectScoped: true,
          },
        ],
      },
    ],
  },
].map((g) => ({ ...g, permissions: g.parts.flatMap((p) => p.permissions) }));

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.permissions);

/* ── Roles, grouped the way the business thinks about them ──────────────── */

export const ROLE_GROUPS = [
  "Client side",
  "Project management",
  "Design professionals",
  "Cost",
  "Planning",
  "Contractor",
  "Other",
  "System access",
] as const;

export const ROLES: Role[] = [
  { code: "CLIENT", name: "Client / Owner", group: "Client side", users: 1, description: "Project owner and final decision-making authority." },
  { code: "CPM", name: "Client Project Manager", group: "Client side", users: 0, description: "Client-side project manager overseeing delivery." },

  { code: "PM", name: "Project Manager", group: "Project management", users: 1, description: "Overall project control and coordination." },
  { code: "PRINCIPAL_PM", name: "Principal / PM", group: "Project management", users: 0, description: "Principal project manager or lead." },
  { code: "PRINCIPAL_AGENT", name: "Principal Agent", group: "Project management", users: 0, description: "Contractually appointed principal agent." },
  { code: "PROJECT_ADMIN", name: "Project Administrator", group: "Project management", users: 0, description: "Project-level administration." },

  { code: "ARCH", name: "Architect", group: "Design professionals", users: 0, description: "Design and specification authority." },
  { code: "STRUCT_ENG", name: "Structural Engineer", group: "Design professionals", users: 0, description: "Structural design and review." },
  { code: "MECH_ENG", name: "Mechanical Engineer", group: "Design professionals", users: 0, description: "Mechanical systems engineering." },
  { code: "ELEC_ENG", name: "Electrical Engineer", group: "Design professionals", users: 0, description: "Electrical systems engineering." },
  { code: "CE", name: "Civil Engineer", group: "Design professionals", users: 0, description: "Civil works engineering." },
  { code: "MEP", name: "MEP Engineer", group: "Design professionals", users: 0, description: "Combined mechanical, electrical and plumbing." },

  { code: "QS", name: "Quantity Surveyor", group: "Cost", users: 1, description: "Cost and quantity surveying (contractor side)." },
  { code: "CQS", name: "Consultant Quantity Surveyor", group: "Cost", users: 1, description: "Cost management and quantity surveying." },

  { code: "PLANNER", name: "Planning Engineer", group: "Planning", users: 0, description: "Internal project scheduling and planning." },
  { code: "CONS_PLANNER", name: "Consultant Planning Engineer", group: "Planning", users: 0, description: "Programme and planning consultant." },

  { code: "CONTRACTOR", name: "Contractor", group: "Contractor", users: 1, description: "Main building contractor." },
  { code: "CIDB", name: "Contractor (CIDB)", group: "Contractor", users: 0, description: "CIDB-registered contractor — what most signups receive." },
  { code: "MC", name: "Main Contractor", group: "Contractor", users: 0, description: "Appointed main contractor." },
  { code: "CM", name: "Construction Manager", group: "Contractor", users: 1, description: "On-site construction oversight." },
  { code: "CONTRACTS_MGR", name: "Contracts Manager", group: "Contractor", users: 0, description: "Contract administration and compliance." },
  { code: "SM", name: "Site Manager", group: "Contractor", users: 0, description: "Site-level management." },
  { code: "SE", name: "Site Engineer", group: "Contractor", users: 0, description: "Technical engineering on site." },
  { code: "SS", name: "Site Supervisor", group: "Contractor", users: 0, description: "Day-to-day site supervision." },
  { code: "FOREMAN", name: "Foreman", group: "Contractor", users: 0, description: "Direct labour management on site." },

  { code: "LEGAL", name: "Legal", group: "Other", users: 0, description: "Legal and compliance access." },
  { code: "SO", name: "Safety Officer", group: "Other", users: 0, description: "Health and safety oversight." },

  { code: "ADMIN", name: "Administrator", group: "System access", users: 0, description: "Full system administrator access." },
  { code: "VIEWER", name: "Viewer", group: "System access", users: 0, description: "Read-only access." },
];

/* ── Effective state ─────────────────────────────────────────────────────── */

export interface Resolution {
  /** What the user can actually do, after all three layers. */
  effective: boolean;
  /** Which layer produced that answer. */
  origin: Layer;
  global: LayerValue;
  org: LayerValue;
  project: LayerValue;
  /** True when a later layer reverses what an earlier one granted. */
  conflict: boolean;
}

/**
 * Hand-authored exceptions. Everything else falls out of the baseline rules
 * below. Keyed `ROLE|permission.code`.
 */
const OVERRIDES: Record<string, { org?: LayerValue; project?: LayerValue }> = {
  // Org has widened the client's authority beyond the shipped default.
  "CLIENT|finance.platform_fees.change_fee_rate": { org: true },
  // The conflict case: granted globally, revoked on THIS project, which
  // leaves a certificate nobody on the project can action.
  "CLIENT|finance.payment_certificates.approve_reject": { project: false },
  // A QS given recommend rights org-wide.
  "QS|tasks.vo_variation.recommend_approval": { org: true },
  // Contractor locked out of deleting documents on this project.
  "CONTRACTOR|documentation.editing_versioning.delete_document": { project: false },
};

const PROFESSIONAL = ["ARCH", "STRUCT_ENG", "MECH_ENG", "ELEC_ENG", "CE", "MEP"];
const CONTRACTOR_SIDE = ["CONTRACTOR", "CIDB", "MC", "CM", "CONTRACTS_MGR", "SM", "SE", "SS", "FOREMAN"];
const PM_SIDE = ["PM", "CPM", "PRINCIPAL_PM", "PRINCIPAL_AGENT", "PROJECT_ADMIN"];
const COST = ["QS", "CQS"];

/** Label by code — the rule set below classifies on the Help page's wording. */
const LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => [p.code, p.label])),
);

/**
 * The shipped default for a role/permission pair — Layer 1.
 *
 * Design-only. Rather than hand-author 109 x 29 cells, this classifies the
 * permission by the area it lives in and the verb its label starts with, which
 * is enough to produce a believable, self-consistent matrix to design against.
 * Replacing this with the real RolePermission table is the whole backend job.
 */
function globalDefault(role: string, code: string): LayerValue {
  if (role === "ADMIN") return true;

  const area = code.split(".")[0];
  const isPro = PROFESSIONAL.includes(role);
  const isCon = CONTRACTOR_SIDE.includes(role);
  const isPm = PM_SIDE.includes(role);
  const isCost = COST.includes(role);
  const isClient = role === "CLIENT";

  // Reading is broad, acting is not. The verb the Help page used to describe
  // the action is what decides which bucket it lands in.
  const READ = /^(view|see|open|preview|reach|switch|track)/i;
  const DECIDE = /(approve|sign|recommend|certif|seal|determin|authoris|reject)/i;
  const DESTROY = /(delete|remove|cancel|clear|revoke)/i;
  const label = LABEL_BY_CODE[code] ?? "";
  const isRead = READ.test(label);
  const isDecide = DECIDE.test(label);
  const isDestroy = DESTROY.test(label);

  if (role === "VIEWER") return isRead && area !== "settings";

  // Anyone on the project can read most things.
  if (isRead) {
    if (area === "settings") return isClient || isPm;
    if (area === "finance" || area === "project_health") return isClient || isPm || isCost;
    return true;
  }

  if (isDecide) {
    if (area === "finance") return isClient || isPm || isCost;
    return isClient || isPm;
  }

  if (isDestroy) return isClient || isPm;

  switch (area) {
    case "communication":
      return true;
    case "documentation":
      return isClient || isPm || isPro || isCon;
    case "tasks":
      return isClient || isPm || isPro || isCon;
    case "meetings":
      return isClient || isPm || isPro;
    case "programme":
      return isClient || isPm || ["PLANNER", "CONS_PLANNER"].includes(role);
    case "finance":
      return isClient || isPm || isCost;
    case "compliance":
      return isClient || isPm || role === "SO" || role === "LEGAL";
    case "project_health":
      return isClient || isPm;
    case "settings":
      return isClient || isPm;
    default:
      return false;
  }
}

/** Resolve one role/permission pair through all three layers. */
export function resolve(roleCode: string, code: string): Resolution {
  const global = globalDefault(roleCode, code);
  const ov = OVERRIDES[`${roleCode}|${code}`] ?? {};
  const org = ov.org ?? null;
  const project = ov.project ?? null;

  let effective = global === true;
  let origin: Layer = "global";
  if (org !== null) {
    effective = org;
    origin = "org";
  }
  if (project !== null) {
    effective = project;
    origin = "project";
  }

  // A conflict is a later layer reversing an earlier, explicitly-set one.
  const conflict =
    (project !== null && global !== null && project !== global) ||
    (org !== null && global !== null && org !== global && project === null);

  return { effective, origin, global, org, project, conflict };
}

export interface RoleSummary {
  granted: number;
  total: number;
  overrides: number;
  conflicts: number;
}

export function summarise(roleCode: string): RoleSummary {
  let granted = 0;
  let overrides = 0;
  let conflicts = 0;
  for (const p of ALL_PERMISSIONS) {
    const r = resolve(roleCode, p.code);
    if (r.effective) granted += 1;
    if (r.origin !== "global") overrides += 1;
    if (r.conflict) conflicts += 1;
  }
  return { granted, total: ALL_PERMISSIONS.length, overrides, conflicts };
}

export const CURRENT_PROJECT = { name: "Spider House", number: "PRJ-042" };
export const CURRENT_ORG = "Base Architects and Associates";
