/**
 * Help / Settings reference page.
 *
 * Scoped deliberately narrow, per explicit request: only User Management
 * (add/edit/remove a team member) and Security (the signing PIN and the
 * insurance broker escalation feature) — not the rest of Settings
 * (Billing, Integrations, Role Permissions, Custom Roles, Approval
 * Chains, AI Routing, Audit, Data Management, Associated Companies, Org
 * Team). Written for non-technical users — uses role display names, not
 * role codes. Mirrors HelpProjectHealth.tsx's shape and styling
 * deliberately, so this reads as the same reference family rather than a
 * second design.
 *
 * IMPORTANT — read before editing:
 * - The frontend's Add/Edit/Remove buttons on the Users tab are only
 *   gated by settings.edit — that flag has NO relationship to the real
 *   backend restriction (project/role_permissions.py's role hierarchy).
 *   Don't describe button visibility as if it were the real rule; the
 *   "who" columns below describe the backend rule, which is what actually
 *   determines the outcome.
 * - Editing a team member's role fires TWO backend calls: the project-
 *   scoped role PATCH (properly gated) and a second PATCH to the user's
 *   GLOBAL account role (auth/users/{id}/) that has no permission check
 *   beyond being logged in. Don't undersell this — it's a real gap.
 * - The "PIN required" block shown for VO/Claim signing is UI-only.
 *   SignAndIssueView (backend/tasks/views_signing.py) applies identical
 *   logic to SI/VO/Claim alike; it never distinguishes entity type. Don't
 *   describe VO/Claim's PIN requirement as server-enforced without this
 *   caveat.
 * - Principal Agent can sign VOs and Claims but is never granted
 *   settings.view/.edit/project.edit in any migration, so it can never
 *   open Settings at all — including the PIN page that signing those
 *   effectively requires. Flag this plainly.
 *
 * Source of truth:
 *   - User Management page      → components/settings/teamMembersTable.tsx
 *   - Add existing / invite new → project/views.py (team_members action),
 *     user/views.py (invite_personnel, accept_invitation)
 *   - Real add/remove/reassign gate → project/role_permissions.py
 *     (can_add_member, can_remove_member, can_assign_role,
 *     FULL_CONTROL_ROLES, CM_MANAGEABLE_ROLES,
 *     CONTRACTS_MGR_MANAGEABLE_ROLES, NO_MANAGE_ROLES)
 *   - Edit role (two-PATCH gap)  → components/settings/teamMembersTable.tsx
 *     (handleEditRole), user/user_views.py (UserViewSet, IsAuthenticated only)
 *   - Remove / deactivate        → project/views.py (team_member_detail
 *     DELETE — is_active=False, last-Owner/last-Administrator guards)
 *   - Signing PIN                → tasks/views_signing.py (SignAndIssueView,
 *     SigningPinViewSet), user/models.py (User.signing_pin_hash),
 *     components/TaskComponents/WernerTaskActions.tsx, VOApprovalModal.tsx
 *   - Insurance broker           → user/models.py (insurance_broker_name/
 *     email on User), tasks/models_werner.py (IntentionToClaim.risk_level,
 *     broker_notified), tasks/broker.py (notify_broker_on_high_risk_ic),
 *     tasks/views_werner.py (set_risk_level, resend_broker_email)
 *   - Settings route gate        → App.tsx (RoleRoute permission="viewSettings"),
 *     user/migrations/0023_clarify_settings_permissions.py
 *
 * Update this page whenever those rules change.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface SettingsSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: SettingsSection[] = [
  {
    type: "USERS",
    title: "User Management",
    description:
      "Adding, editing, and removing people on the current project's team. This is scoped to whichever project you have selected — it's separate from your organisation's own member list, found elsewhere in Settings.",
    rows: [
      {
        action: "Add someone who already has an account",
        who: "Depends on your own role and theirs — see the row below.",
        when: "Anytime.",
        note:
          "They're added to the project immediately, no invitation or acceptance step needed.",
      },
      {
        action: "Invite someone new by email",
        who: "Any logged-in user with access to this screen.",
        when: "Anytime.",
        note:
          "This only sends an invite — nothing about them exists on the project until they open the link and accept it (the invite expires after 7 days). If that email already has an account elsewhere, that account is reused, not duplicated.",
      },
      {
        action: "Who can actually add or remove whom (the real rule)",
        who:
          "Client/Owner can manage anyone. Client Project Manager can manage anyone except Client/Owner. Project Manager can manage anyone below Project Manager, except Client/Owner. Construction Manager can only add or remove Site Engineer, Site Supervisor, or Foreman. Contracts Manager can only add or remove those three plus Planning Engineer. Every other role — Architect, Consultant Quantity Surveyor, Consultant Planning Engineer, Planning Engineer, Site Engineer, Structural/Mechanical/Electrical Engineer, Site Supervisor, Foreman — cannot add or remove anyone at all, regardless of what buttons they see.",
        when: "Always — enforced by the server on every add, remove, and role change.",
        note:
          "This is the actual rule, and it has nothing to do with whether the Add/Edit/Remove buttons are visible to you. Those buttons only check a separate, broader \"can edit settings\" permission — so a Construction Manager may well see an \"Add User\" button and then get rejected by the server for most roles they try to add. Only Client/Owner can hand someone the Client/Owner role itself.",
      },
      {
        action: "Change someone's project role",
        who: "Same rule as adding/removing above.",
        when: "Anytime, with one exception below.",
        note:
          "Editing a role actually makes two separate changes behind the scenes: the person's role on this project, and — separately — their role on their account overall. The second one currently has no permission check beyond being logged in, so in principle any signed-in user could change anyone's account-wide role through that path, not just their project role. The one person who can never demote themselves is the project's sole remaining Administrator — that's blocked until a second Administrator is assigned.",
      },
      {
        action: "Remove someone from the project",
        who: "Same rule as adding above.",
        when:
          "Anytime, except you can't remove the project's last remaining Client/Owner or its last remaining Administrator.",
        note:
          "This never deletes anyone's account — it just deactivates their membership on this project. Their history stays on record, and if they're added back later, that history is still there. There's no rule stopping you from removing yourself, unlike your organisation's own member list, which does block that.",
      },
      {
        action: "Cancel a pending invitation (before it's accepted)",
        who: "Any active member of the project.",
        when: "Anytime before the invite is accepted or expires.",
        note:
          "Unlike removing an actual team member, cancelling a pending invite has no role restriction at all — anyone currently on the project can cancel anyone else's pending invite.",
      },
    ],
  },
  {
    type: "PIN",
    title: "Security — Signing PIN",
    description:
      "A 4-digit PIN you can set for yourself, used to confirm you really mean it when you sign a Site Instruction, Variation Order, or Delay Claim.",
    rows: [
      {
        action: "Set, change, or clear your PIN",
        who: "Anyone — this is entirely self-service, on your own account only.",
        when: "Anytime, from Settings → Security.",
        note:
          "Your PIN is stored the same secure way your account password is — never in plain text, never visible to anyone including staff. There's no limit on how many times you can try an incorrect PIN when signing something, so treat it as a confirmation step rather than a strong security barrier.",
      },
      {
        action: "Sign a Site Instruction without a PIN set",
        who: "Anyone who can sign Site Instructions in the first place.",
        when: "Anytime.",
        note:
          "Site Instructions are the one type that still offers a simple \"yes, I confirm\" checkbox if you haven't set a PIN.",
      },
      {
        action: "Sign a Variation Order or Delay Claim without a PIN set",
        who: "Nobody — the app blocks this in the interface and directs you to set a PIN first.",
        when: "—",
        note:
          "Worth knowing plainly: that block is enforced by the app's interface, not by the server underneath it. The server itself treats Site Instructions, Variation Orders, and Delay Claims identically for PIN purposes — it's only the on-screen form that refuses to offer the no-PIN option for the latter two.",
      },
      {
        action: "Reach the Security page at all",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Administrator, Project Administrator, Principal/PM, Super User (full access), plus Construction Manager, Contracts Manager, Architect, Consultant Quantity Surveyor, Consultant Planning Engineer, and Quantity Surveyor (view-only elsewhere in Settings, but this still gets them into Security).",
        when: "Anytime.",
        note:
          "Principal Agent is missing from this list entirely, despite being one of the roles allowed to sign Variation Orders and Delay Claims — meaning a Principal Agent can never open this page to set up the PIN that signing those two effectively requires them to have.",
      },
    ],
  },
  {
    type: "BROKER",
    title: "Security — Insurance Broker",
    description:
      "A personal contact on your own profile — your insurance broker's name and email — used to automatically notify them if a claim against you gets marked high-risk.",
    rows: [
      {
        action: "Add or update your broker's contact details",
        who: "Anyone — self-service, on your own profile only.",
        when: "Anytime, from Settings → Security.",
        note:
          "This is just a name and an email on your own account — there's no separate \"broker\" record in the system, and each person keeps only one, for themselves. It isn't shared per project or per company.",
      },
      {
        action: "Trigger a notification to someone's broker",
        who:
          "Project Manager, Client Project Manager, Principal/PM, or Principal Agent — by marking an Intention to Claim against that person as high-risk.",
        when: "Whenever one of those roles makes that judgment call.",
        note:
          "There's no formula or automatic scoring behind \"high-risk\" — it's a professional decision one of those roles makes directly. The moment it's made, the system automatically emails the broker on file (if there is one), notifies the person the claim is against, tells the project's Client/Owner and Client Project Manager, and raises a signal that also shows up on Project Health. This only ever fires once per claim.",
      },
      {
        action: "Resend the broker notification",
        who: "The Project Manager who raised the risk level, or the person the claim is against.",
        when:
          "Only if the first attempt found no broker email on file — for example if the person adds their broker's details after the claim was already marked high-risk.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "The buttons you see on the Users tab reflect only whether you can edit Settings in general — they don't reflect the real, narrower rule about who you're actually allowed to add, edit, or remove. Expect to see a button and then get turned away by the server for most people, unless your role is Client/Owner, Client Project Manager, or Project Manager.",
  "Changing someone's project role also quietly changes their account-wide role through a second request that isn't restricted to any particular role at all — worth knowing if you're relying on role changes being tightly controlled.",
  "The signing PIN and the insurance broker contact are both entirely self-service — nobody needs anyone else's permission to set, change, or clear either one for their own account.",
  "Signing PINs are checked identically for Site Instructions, Variation Orders, and Delay Claims by the server — the interface is what makes Variation Orders and Delay Claims look stricter by refusing to offer the no-PIN fallback that Site Instructions still has.",
];

export default function HelpSettings() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/settings/team-management"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Settings reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to User Management and the Security page's
          Signing PIN and Insurance Broker settings. This covers only
          those two areas, not the rest of Settings.
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Settings</h2>
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
