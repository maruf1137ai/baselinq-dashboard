/**
 * Help / Project Health reference page.
 *
 * One section per Project Health area (Opening the Page, Risk Signals,
 * Notice Deadlines, Insurer Tab, Commercial Position & Risk Summary)
 * showing who can do what in plain English. Written for non-technical
 * users — uses role display names, not role codes. Mirrors HelpTasks.tsx /
 * HelpFinance.tsx / HelpProgramme.tsx / HelpMeetings.tsx /
 * HelpCommunication.tsx / HelpDocumentation.tsx / HelpCompliance.tsx's
 * shape and styling deliberately, so this reads as the same reference
 * family rather than a second design.
 *
 * IMPORTANT — read before editing: this is the least permission-gated
 * page in the whole Help family, and that's a verified fact, not a bug in
 * this page's writing. compliance.view (RoleRoute) only gates whether
 * /project-health opens at all. Once inside: viewing risk signals,
 * acknowledging/resolving/muting one, and viewing/creating/serving/
 * cancelling a notice deadline all have NO permission-code check
 * whatsoever server-side — only IsAuthenticated + active project
 * membership (risk/views.py::RiskSignalListView/RiskSignalActionView,
 * risk/views_evidence.py::TimeBarListCreateView/TimeBarActionView). The
 * frontend's own SignalFeed.tsx carries an explicit comment that this is
 * deliberate and reported, not silently patched — don't describe it as
 * fixed or as "requires the same permission as opening the page."
 * The ONLY two genuinely permission-gated actions anywhere on this page
 * both require compliance.edit (risk/views.py::may_administer_risk):
 * editing risk policy, and issuing/listing insurer tokens + reading the
 * disclosure log. Even those have NO frontend indication — InsurerTab.tsx
 * imports no usePermissions() flag at all; a canEditCompliance-style flag
 * does not exist anywhere in hooks/usePermissions.ts. Don't imply the UI
 * hides these controls from unauthorized users — it doesn't; the server
 * rejects the request after the fact.
 *
 * Source of truth:
 *   - Route gate (compliance.view)     → App.tsx (RoleRoute
 *     permission="viewCompliance", same permission/wrapper as /compliance)
 *   - Risk signals view/act            → risk/views.py
 *     (RiskSignalListView, RiskSignalActionView — no permission check on
 *     acknowledge/resolve/mute)
 *   - Risk policy                      → risk/views.py
 *     (ProjectRiskPolicyView — GET membership-only by design, PATCH
 *     requires compliance.edit via may_administer_risk)
 *   - Insurer tokens / disclosure log  → risk/views_insurer.py
 *     (InsurerTokenManageView, InsurerDisclosureLogView — compliance.edit)
 *   - Notice deadlines (time bars)     → risk/views_evidence.py
 *     (TimeBarListCreateView, TimeBarActionView — membership only),
 *     risk/timebars.py (deadline calculation, never serves a notice)
 *   - compliance.view/.edit grants     → user/migrations/
 *     0016_seed_phase2_permissions.py, 0042_seed_compliance_edit_permission.py
 *   - Principal Agent role exclusion   → user/migrations/
 *     0044_seed_principal_agent_role.py (no compliance.view/.edit granted)
 *   - Per-project override             → project/models.py
 *     (ProjectRolePermission), permissions/core.py (Layer 3)
 *   - Risk Forecast summary sentence   → project/views.py
 *     (RiskForecastView — same endpoint Programme's Risk Forecast tab
 *     uses in full via useRiskForecast; Project Health only reads
 *     ai_summary)
 *   - Unrelated same-named endpoints   → project/views.py
 *     (ProjectHealthView "/health/", ProjectHealthSummaryView
 *     "/health-summary/" — neither called by this page)
 *   - Notification fan-out filter      → risk/engine.py (notify_project_members
 *     require_permission="compliance.view", untargeted rules only)
 *
 * Update this page whenever those rules change.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface ProjectHealthSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: ProjectHealthSection[] = [
  {
    type: "OPENING",
    title: "Opening the Page",
    description:
      "Project Health shares its entry permission with Compliance — the same setting decides whether you can open either page.",
    rows: [
      {
        action: "Open the Project Health page",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Architect, Consultant Quantity Surveyor, Consultant Planning Engineer, Planning Engineer.",
        when: "Anytime on the project.",
        note:
          "Administrator, Project Administrator, Principal/PM, Quantity Surveyor, and Principal Agent are all excluded by default — including Principal Agent, despite that role sounding exactly like the person who should be handling contractual risk. This is a known, unresolved gap in the platform's own permission setup, not a deliberate design choice. If someone in one of these roles can't see the page, this is why — and they also won't be notified when a new risk signal appears, for the same reason.",
      },
    ],
  },
  {
    type: "SIGNALS",
    title: "Risk Signals",
    description:
      "Automated flags raised against the project (delay, financial, compliance, claim risk). This is the most open part of the whole page.",
    rows: [
      {
        action: "View the risk signal feed",
        who: "Anyone on the project team.",
        when: "Anytime — it's not limited to whoever can open Project Health in the first place.",
        note:
          "This is checked independently of the page's own entry permission — the underlying data has no extra gate beyond being on the project.",
      },
      {
        action: "Acknowledge a risk signal",
        who: "Anyone on the project team.",
        when: "Anytime.",
        note:
          "This is genuinely open to anyone — there's no permission that specifically controls it, on the server or in the interface. That's a deliberate, documented gap in the platform, flagged as a decision still to be made about which permission should govern it — not something quietly fixed here. A read-only viewer can write a note into the record and mute a signal out of the feed entirely.",
      },
    ],
  },
  {
    type: "TIMEBARS",
    title: "Notice Deadlines",
    description:
      "Contractual notice-period countdowns (JBCC, NEC4, FIDIC, GCC) calculated from a confirmed awareness date — this page tracks the deadline, it never sends anything on your behalf.",
    rows: [
      {
        action: "View, track, serve, or cancel a notice deadline",
        who: "Anyone on the project team.",
        when: "Anytime.",
        note:
          "Same as risk signals — none of these actions require any specific permission, only being on the project. The date that starts the countdown always has to be a date a person confirmed, never one the system guesses. Serving or cancelling a deadline always records who did it.",
      },
    ],
  },
  {
    type: "INSURER",
    title: "Insurer Tab",
    description:
      "The one part of this page that's actually restricted. Controls whether an insurer can be given limited, read-only access to this project's risk data.",
    rows: [
      {
        action: "View the disclosure consent setting, and other risk-policy fields",
        who: "Anyone who can open Project Health.",
        when: "Anytime.",
        note:
          "This is intentionally left open to everyone who can reach the page — restricting it further would have shut out roles (like Principal/PM) who need to see it but don't hold the stricter permission below.",
      },
      {
        action: "Turn insurer disclosure on/off, or issue/view insurer API keys and the disclosure log",
        who: "Client/Owner, Client Project Manager, Project Manager, Construction Manager.",
        when: "Anytime.",
        note:
          "This is the real, server-enforced restriction — but nothing in the interface hides these controls from anyone else. If you're not on this list and you try, the switch and buttons are still visible and clickable; you'll just get an error after clicking, not before. An insurer key only ever grants read-only access to risk signals explicitly marked visible to insurers, and to specific evidence it's been shared — never a full account, and every use of it is recorded in the disclosure log.",
      },
    ],
  },
  {
    type: "COMMERCIAL",
    title: "Commercial Position & Risk Summary",
    description:
      "The one tab that's actually hidden from people without access, and the one-sentence risk summary shown at the top of the page.",
    rows: [
      {
        action: "See the Commercial Position tab",
        who: "Anyone who can view Finance on the project.",
        when: "Anytime.",
        note:
          "This is the only tab on this whole page that's genuinely hidden — not just restricted after the fact — from someone without access.",
      },
      {
        action: "See the AI risk summary sentence at the top of the page",
        who: "Anyone who can open Project Health.",
        when: "Anytime.",
        note:
          "This one sentence comes from the same underlying analysis that powers Programme's full \"Risk Forecast\" tab — but Project Health only shows the summary line, not the detailed delay-risk, financial-impact, or compliance-gate lists. For the full picture, see Programme. Also worth knowing: this page is unrelated to two similarly-named backend endpoints (\"project health\" and \"health summary\") used elsewhere for dashboard status colours — this page doesn't use either of them.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "This page is, by a wide margin, the least permission-restricted page described anywhere in this Help section. Opening it is gated by one permission (compliance.view); acting on almost everything inside it — acknowledging a risk signal, serving a notice deadline — isn't gated by any permission at all, only by being on the project team. Only the Insurer tab's two admin actions, and the Commercial Position tab, are genuinely restricted.",
  "The role lists on this page are organisation-wide defaults. A project admin can grant or revoke compliance.view or compliance.edit for a specific role on a specific project, even though — as on the Compliance page — there's no Settings screen in the app to do that from directly.",
  "Real-time updates here only mean \"something changed, go check again\" — a new risk signal pings your unread-notifications badge, but the signal feed itself only refreshes when you load the page or press Refresh, not automatically as things happen.",
];

export default function HelpProjectHealth() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/project-health"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project Health
        </Link>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Project Health reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to Risk Signals, Notice Deadlines, the
          Insurer tab, and Commercial Position. This page is more open than
          you might expect — most of what's here isn't restricted by role
          at all, and this page explains exactly where the real
          restrictions actually are.
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Project Health</h2>
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
