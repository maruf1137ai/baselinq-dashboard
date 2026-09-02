/**
 * Help / task workflow reference page.
 *
 * One section per Werner doc type (RFI, SI, VO, IC, DC, GI) showing
 * who can take each action (create / reply / sign / approve / close /
 * escalate) in plain English. Written for non-technical users — uses
 * role display names, not role codes.
 *
 * Rows listed in ROW_PERMISSION have a LIVE "who" — computed from the
 * matching permission code's current grants (Roles & Permissions), via
 * GrantedRolesView (backend/permissions/auto_cc.py) and useGrantedRoles:
 * the five "Create ..." rows (task.<type>.create), RFI's "Turn it into a
 * Site Instruction" (task.rfi.escalate_to_si), SI's "Turn it into a
 * Variation Order" (task.si.escalate_to_vo), SI's "Close the SI"
 * (task.approve_si, with a static "issuer, always" clause alongside the
 * dynamic list — see CloseOutView in tasks/views_werner.py), and VO's
 * "Recommend for Approval" / "Approve and sign" (task.vo.recommend /
 * task.vo.approve — see VariationOrderViewSet's _recommend_transition_guard
 * and views_signing.py's _can_sign in tasks/views.py /
 * tasks/views_signing.py, and the matching split in
 * src/pages/TaskDetails.tsx's canApprove). All six non-create rows were
 * added once those actions got real permissions instead of hardcoded
 * PROFESSIONAL_CODES/PM_CODES/SIGNING_ROLES role-code sets; task.approve_si/
 * task.vo.recommend/task.vo.approve's grants were realigned to match what
 * was actually enforced before each was wired in (user/migrations/0055,
 * 0056, 0057) — their previous grants (from 0017, back when nothing read
 * them) didn't match. DC's "File the formal Claim" row is deliberately
 * excluded/left static: its text describes the identity-based
 * escalate-from-IC path (only the IC's original filer, once mitigation
 * rules pass), not the separate task.dc.create grant, so giving it a
 * create-grant list would change what the row actually claims.
 *
 * Every other row (reply / sign, RFI/GI/VO/DC close-out, IC→Claim
 * escalation, "Approve a Variation Order (older route)" i.e. task.approve_vo,
 * and so on) stays static — none of them are actually governed by the
 * Permission/RolePermission/ProjectRolePermission tables today; toggling
 * the matching permission code in Roles & Permissions (where one even
 * exists, e.g. task.approve_rfi) has no effect on real behaviour. Their
 * source of truth:
 *   - Create perms        → user/migrations/0032_realign_task_create_perms.py
 *   - Sign perms (SI/Claim) → tasks/views_signing.py (SIGNING_ROLES)
 *   - Close-out perms     → tasks/views_werner.py (CloseOutView)
 *   - Escalation chain    → tasks/views_werner.py (chain-escalate)
 *
 * Update this page whenever those rules change.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useGrantedRoles } from "@/hooks/useGrantedRoles";
import { useRoles } from "@/hooks/useRolePermissions";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import { formatRoleList } from "@/lib/formatRoleList";

type Row = { action: string; who: string; when: string; note?: string };

interface DocSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

/** Row action -> permission code + how to render the dynamic list into that row's sentence. DC's create-adjacent row excluded — see header comment. */
const ROW_PERMISSION: Record<string, { code: string; render: (list: string) => string }> = {
  "Create a new RFI": { code: "task.rfi.create", render: (list) => `Anyone holding: ${list}.` },
  "Turn it into a Site Instruction": {
    code: "task.rfi.escalate_to_si",
    render: (list) => `Anyone holding: ${list}.`,
  },
  "Create a new SI": { code: "task.si.create", render: (list) => `Anyone holding: ${list}.` },
  "Turn it into a Variation Order": {
    code: "task.si.escalate_to_vo",
    render: (list) => `Anyone holding: ${list}.`,
  },
  "Close the SI": {
    code: "task.approve_si",
    render: (list) =>
      `The architect or engineer who issued it — always. Anyone else needs to hold: ${list}.`,
  },
  "Create a new VO": { code: "task.vo.create", render: (list) => `Anyone holding: ${list}.` },
  "Recommend for Approval": {
    code: "task.vo.recommend",
    render: (list) => `Anyone holding: ${list}.`,
  },
  "Approve and sign": {
    code: "task.vo.approve",
    render: (list) => `Anyone holding: ${list}.`,
  },
  "File an Intention to Claim": {
    code: "task.ic.create",
    render: (list) => `Anyone holding: ${list}.`,
  },
  "Create a General Instruction": {
    code: "task.gi.create",
    render: (list) => `Anyone holding: ${list}.`,
  },
};
const ROW_CODES = Object.values(ROW_PERMISSION).map((c) => c.code);

const STATIC_SECTIONS: DocSection[] = [
  {
    type: "RFI",
    title: "RFI — Request for Information",
    description:
      "The contractor asks the design team a question. Lives until the team replies and the contractor is happy with the answer.",
    rows: [
      {
        action: "Create a new RFI",
        who: "Anyone on the contractor side: Contractor, Main Contractor, Construction Manager, Contracts Manager, Foreman, Site Supervisor. Client and Administrator can also create one on anyone's behalf.",
        when: "Anytime on the project.",
      },
      {
        action: "Reply to the RFI",
        who: "Anyone the RFI was addressed to (To or CC). Usually the architect or engineer being asked the question.",
        when: "Until the RFI is closed.",
        note: "The first reply moves the RFI from Open to Sent for Review.",
      },
      {
        action: "Turn it into a Site Instruction",
        who: "Architect, any engineer (Structural, Mechanical, Electrical, Civil), Quantity Surveyor, Project Manager or Principal Agent.",
        when: "Before the RFI is closed.",
        note: "The new Site Instruction will automatically link back to this RFI.",
      },
      {
        action: "Close the RFI",
        who: "The person who raised it, or any contractor-side user.",
        when: "Once the answer is acceptable. Hidden if the RFI is already Closed or Answered.",
      },
    ],
  },
  {
    type: "SI",
    title: "SI — Site Instruction",
    description:
      "A design professional tells the contractor to do something on site. Becomes contractually binding once it's signed.",
    rows: [
      {
        action: "Create a new SI",
        who: "Architect or any engineer (Structural, Mechanical, Electrical). Client and Administrator can also create one.",
        when: "Anytime on the project.",
      },
      {
        action: "Reply to the SI",
        who: "The contractor side. If the contractor ticks 'Time impact' or 'Cost impact' on the reply, the Project Manager and QS are automatically added to the conversation.",
        when: "While the SI is still active (Issued, Acknowledged, Actioned, or In Progress).",
        note: "Ticking Time or Cost is the signal that a Variation Order may be needed.",
      },
      {
        action: "Sign and issue",
        who: "Architect or any engineer (Structural, Mechanical, Electrical). Principal Agent can also sign.",
        when: "Before the SI is Verified.",
        note: "Signing requires a 4-digit PIN if you've set one in Settings → Security. Otherwise click-confirm is enough.",
      },
      {
        action: "Turn it into a Variation Order",
        who: "Project Manager, Principal Project Manager or Principal Agent.",
        when: "Before the SI is Verified.",
        note: "Usually triggered when the contractor's reply showed cost or time impact.",
      },
      {
        action: "Close the SI",
        who: "The architect or engineer who issued it, or any other professional on the project.",
        when: "Once the work is done. Hidden if the SI is already Verified.",
      },
    ],
  },
  {
    type: "VO",
    title: "VO — Variation Order",
    description:
      "A formal change to the contract — scope, cost or time. The contractor prices it, the Principal Agent recommends it, the Client approves the big ones. A signed VO automatically updates the project's contract value and end date.",
    rows: [
      {
        action: "Create a new VO",
        who: "Project Manager, Client Project Manager, Principal Project Manager, Principal Agent. Client and Administrator can also create one.",
        when: "Anytime on the project.",
      },
      {
        action: "Price the VO",
        who: "The contractor side. They reply with the line items and total cost.",
        when: "While the VO is still a Draft or Submitted.",
        note: "Submitting pricing moves the VO to Priced.",
      },
      {
        action: "Recommend for Approval",
        who: "Project Manager, Client Project Manager, Principal Project Manager, Principal Agent.",
        when: "VO is Priced AND the total is above the Principal Agent's mandate.",
        note: "Only shows when the VO is too big for the PA to approve alone. Within the mandate, the same person sees 'Approve & Sign' instead.",
      },
      {
        action: "Approve and sign",
        who:
          "If it was Recommended (over the mandate): Client or Client Project Manager does the final sign-off.",
        when: "VO is Priced (within mandate) or Recommended (over mandate).",
        note: "Signing requires a 4-digit PIN if set. Once signed, the contract value and end date on the project are updated automatically.",
      },
      {
        action: "Close the VO",
        who: "The person who created it, or any Project Manager / Principal Agent.",
        when: "Hidden once the VO is Approved, Rejected or Closed.",
      },
    ],
  },
  {
    type: "IC",
    title: "IC — Intention to Claim",
    description:
      "The contractor's early warning that a claim may be coming. The Project Manager assesses how serious it is and rates the risk. High-risk claims automatically notify the respondent's insurance broker.",
    rows: [
      {
        action: "File an Intention to Claim",
        who: "Anyone on the contractor side: Contractor, Main Contractor, Construction Manager, Contracts Manager, Foreman, Site Supervisor.",
        when: "As soon as something happens that could cause a claim later.",
      },
      {
        action: "Rate the risk (Low / Medium / High)",
        who: "Project Manager, Client Project Manager or Principal Project Manager.",
        when: "While the IC is Sent or Acknowledged.",
        note: "Rating it High triggers an email to the respondent's insurance broker.",
      },
      {
        action: "Resend the broker email",
        who: "The Project Manager or the respondent themselves.",
        when: "If the IC is High-risk but the broker email never went out — usually because no broker email was on file at the time.",
      },
      {
        action: "Escalate to a formal Claim",
        who: "Only the contractor who originally filed the IC.",
        when:
          "After at least 7 days have passed since the IC was filed AND the contractor has written at least 20 characters describing what they did to try to resolve it.",
        note: "The 7-day wait is the contractual notice period. It's configurable per deployment — set to 0 to skip it on demo / staging.",
      },
      {
        action: "Close the IC",
        who: "The person who filed it, or any contractor-side user.",
        when: "Hidden once the IC is Closed or already Escalated to Claim.",
      },
    ],
  },
  {
    type: "DC",
    title: "Claim — Delay or Cost Claim",
    description:
      "The formal claim that grows out of an Intention to Claim. The Project Manager assesses it, may grant an extension of time, or determine the cost. Signed by the PM once decided.",
    rows: [
      {
        action: "File the formal Claim",
        who: "Only the contractor who filed the matching Intention to Claim.",
        when: "Through the 'Escalate to Claim' button on the IC — the mitigation rules must pass first.",
        note: "Direct create is also possible for contractor-side roles, but the IC-then-Claim path is the spec-compliant flow.",
      },
      {
        action: "Reply / assess the claim",
        who: "The Project Manager (who becomes the assignee after escalation) and the contractor.",
        when: "While the claim is at Notice Issued or Under Assessment.",
        note: "Submitting the PM's determination moves the claim to EOT Awarded (extension of time) or Determination Made.",
      },
      {
        action: "Sign and issue the determination",
        who: "Project Manager, Client Project Manager, Principal Project Manager or Principal Agent.",
        when: "Once the PM has written their determination response.",
        note: "Signing requires a 4-digit PIN if set.",
      },
      {
        action: "Close the claim",
        who: "The contractor who filed it, or any contractor-side user.",
        when: "Hidden once the claim is at EOT Awarded, Determination Made or Closed.",
      },
    ],
  },
  {
    type: "GI",
    title: "GI — General Instruction",
    description:
      "A general note between professionals, or from the Main Contractor to a subcontractor. Lighter than a Site Instruction — not contractually binding the same way.",
    rows: [
      {
        action: "Create a General Instruction",
        who: "Project Manager, Client Project Manager, Principal Project Manager, Principal Agent or Architect. Client and Administrator can also create one.",
        when: "Anytime on the project.",
      },
      {
        action: "Reply to the GI",
        who: "Anyone it was addressed to (To or CC).",
        when: "While the GI is Sent or Replied.",
        note: "The first reply moves the GI from Sent to Replied.",
      },
      {
        action: "Close the GI",
        who: "The person who issued it, or any other professional.",
        when: "Hidden once the GI is already Closed.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "After every reply, the task automatically moves back to the person who originally raised the document — the contractor who filed the RFI, the architect who issued the SI, etc. The Recipient field on the reply form only decides who gets notified about the reply; it doesn't move the assignment.",
  "Client and Administrator are super-users — they can create any task type, on top of the rules above. They're hidden from the Recipient list because they're not usually addressees.",
  "Signing: Variation Orders and Claims always require a 4-digit PIN if you've set one in Settings → Security. Site Instructions can also accept a click-confirm if no PIN is set.",
  "Closing or signing a document writes an entry in the Audit Trail and sends an in-app notification to everyone involved.",
];

export default function HelpTasks() {
  const navigate = useNavigate();
  const projectId = useSelectedProjectId();
  const grants = useGrantedRoles(ROW_CODES, projectId);
  const { data: roles } = useRoles();

  const roleNamesByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles ?? []) map[r.code] = r.name;
    return map;
  }, [roles]);

  // Falls back to the static prose until both the grants and the role names
  // have arrived — never renders a half-computed sentence.
  const sections = useMemo(() => {
    if (!grants || Object.keys(roleNamesByCode).length === 0) return STATIC_SECTIONS;
    return STATIC_SECTIONS.map((section) => ({
      ...section,
      rows: section.rows.map((row) => {
        const cfg = ROW_PERMISSION[row.action];
        if (!cfg) return row;
        const who = cfg.render(formatRoleList(grants[cfg.code] ?? [], roleNamesByCode));
        return { ...row, who };
      }),
    }));
  }, [grants, roleNamesByCode]);

  // Back goes to wherever the user actually came from — the Help hub, a
  // deep link out of /tasks, anywhere — rather than always dumping them on
  // /tasks. history.state.idx is React Router's history index: 0 (or
  // undefined) means this page is the first entry, so there is nothing to
  // pop and we fall back to /tasks.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/tasks", { replace: true });
  };

  return (
    <div className="help-reference-page min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Task workflow reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to who can do what on each task type. If a
          button isn't showing for you, this page explains why — every action
          is gated by your role and the task's current stage.
        </p>

        {/* Quick jump nav */}
        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.type}
              href={`#${s.type.toLowerCase()}`}
              className="text-xs px-2.5 py-1 rounded-full border border-border text-foreground hover:bg-muted transition-colors"
            >
              {s.type}
            </a>
          ))}
        </div>

        {/* Per-doc-type sections */}
        <div className="mt-10 space-y-10">
          {sections.map((s) => (
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply to every task type</h2>
          {/* Same surface as the per-type tables above — this list was the one
              block on the page floating loose on the page background. */}
          <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
            <ul className="space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-5">
              {GLOBAL_NOTES.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated 2026-05-26. If the platform behaves differently from
          what's described here, the platform's behaviour is the bug —
          please let the team know.
        </p>
      </div>
    </div>
  );
}
