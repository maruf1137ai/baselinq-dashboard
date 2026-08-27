/**
 * Help / Programme reference page.
 *
 * One section per Programme area (Schedule & Milestones, Milestone Fees,
 * Programme Baseline, Risk Forecast) showing who can do what in plain
 * English. Written for non-technical users — uses role display names, not
 * role codes. Mirrors HelpTasks.tsx / HelpFinance.tsx's shape and styling
 * deliberately, so this reads as the same reference family rather than a
 * second design.
 *
 * Source of truth:
 *   - Base Programme view gate       → user/migrations/0016_seed_phase2_permissions.py,
 *                                       widened by 0046_grant_programme_view_to_missing_roles.py
 *   - Discipline picker / visibility → project/discipline.py (visibility_context,
 *                                       own_discipline_for), hooks/usePermissions.ts
 *                                       (canViewOtherDisciplines = other.view OR fees.view_all —
 *                                       this OR is why Principal/PM gets the picker despite not
 *                                       being directly granted other.view below),
 *                                       components/programme/window.tsx
 *   - Discipline permission grants   → user/migrations/0045_seed_programme_discipline_permissions.py
 *   - Create a milestone / phase     → project/views.py (MilestoneListCreateView.post)
 *   - Milestone fee visibility       → project/discipline.py (visibility_context),
 *                                       project/serializers.py (MilestoneSerializer)
 *   - Accept / compare a baseline    → risk/views_baseline.py (ProgrammeBaselineListCreateView,
 *                                       ProgrammeBaselineDiffView) — project-membership only,
 *                                       no role/permission gate
 *   - Risk Forecast                  → same programme.view gate, no separate permission code
 *
 * Update this page whenever those rules change.
 */
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface ProgrammeSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: ProgrammeSection[] = [
  {
    type: "SCHEDULE",
    title: "Schedule & Milestones",
    description:
      "Phases and milestones grouped by discipline (Construction, Architectural, Engineering, Quantity Surveying, Other). The Schedule tab shows the timeline; the Milestones tab shows the list.",
    rows: [
      {
        action: "View the Programme page at all",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Consultant Quantity Surveyor, Architect, Structural Engineer, Mechanical Engineer, Electrical Engineer, Quantity Surveyor, Principal / PM, Principal Agent, Contractor.",
        when: "Anytime on the project.",
        note:
          "Not granted to Site Engineer, Site Supervisor, Foreman, Planner, Consultant Planner, Legal, or Administrator/Project Administrator — being an organisation admin does not grant it either, unlike Settings or Finance. A small number of legacy Contractor accounts created before the current onboarding flow are still on an older role code that never received this permission — if you're a Contractor and don't see Programme at all, that's most likely why; ask an admin to check your role.",
      },
      {
        action: "Switch the discipline picker to see another discipline's phases",
        who:
          "Everyone above except Contractor — Contractor is deliberately excluded, so a Contractor only ever sees Construction, with no picker shown at all.",
        when: "Anytime, once the page is open.",
        note: "Without this permission, only your own discipline's data is requested — there's no way to even ask the server for another discipline's. Principal/PM reaches this not through a direct grant, but automatically through holding full fee visibility (see Milestone Fees below), which always carries the picker with it.",
      },
      {
        action: "Add a phase / milestone",
        who: "Anyone viewing the page, but only into their own discipline.",
        when: "Anytime on the project.",
        note:
          "Whoever also holds full discipline visibility (see Milestone Fees below) can add a phase into any discipline. Everyone else gets a 403 from the server if they try to add outside their own discipline — this is enforced server-side, not just hidden in the UI.",
      },
    ],
  },
  {
    type: "FEES",
    title: "Milestone Fees",
    description:
      "Each milestone can carry a fee amount. Your own discipline's fees are visible the moment you can view Programme at all — seeing every discipline's fees is a separate, narrower permission.",
    rows: [
      {
        action: "View your own discipline's milestone fees",
        who: "Anyone who can view the Programme page.",
        when: "Anytime.",
      },
      {
        action: "View milestone fees across every discipline",
        who:
          "Project Manager, Client Project Manager, Principal / PM, Consultant Quantity Surveyor, Quantity Surveyor, Client/Owner, Principal Agent.",
        when: "Anytime.",
        note: "This also implies the discipline-picker permission above — seeing every discipline's fees would be meaningless without being able to list those disciplines' milestones too.",
      },
    ],
  },
  {
    type: "BASELINE",
    title: "Programme Baseline",
    description:
      "Freezes every phase's current dates as the agreed plan, sealed as a new version so slippage can be measured against it later. A baseline is never overwritten — accepting again just adds the next version.",
    rows: [
      {
        action: "Accept & seal a new baseline",
        who: "Any active member of the project team.",
        when: "Anytime.",
        note:
          "This is the one action on this page with no role permission gate — unlike everything else here, it only checks that you're an active team member (or the project's creator), not your role.",
      },
      {
        action: "View version history / compare two versions",
        who: "Any active member of the project team.",
        when: "Anytime, once at least one baseline has been accepted (comparison needs at least two versions).",
      },
    ],
  },
  {
    type: "RISK",
    title: "Risk Forecast",
    description:
      "Read-only AI analysis of the programme: delay risks, financial impact, compliance gates, and recommended actions. There is nothing to create or approve here.",
    rows: [
      {
        action: "View the Risk Forecast tab",
        who: "Anyone who can view the Programme page.",
        when: "Anytime.",
        note: "No separate permission — same gate as the rest of the page.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Programme access is entirely project-scoped — the roles listed above are per-project team roles, not account-level roles. Being an organisation admin does not by itself grant Programme access; the admin still needs a project role that holds programme.view.",
  "The discipline picker, fee visibility, and \"add phase into another discipline\" permissions are three separate checks — holding one doesn't automatically grant the others, except that full fee visibility always implies the discipline picker.",
  "Contractor is deliberately restricted to the Construction discipline everywhere on this page — it's not an oversight, it's the intended behaviour.",
  "The roles listed on this page are the platform's default grants. A project admin can override any of them — grant or revoke Programme access, the discipline picker, or full fee visibility — for a specific role on a specific project, in Settings → Permissions. If your access doesn't match what's listed here, a project-level override is the most likely reason.",
];

export default function HelpProgramme() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/programme"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Programme
        </Link>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Programme reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to who can do what in Schedule & Milestones,
          Milestone Fees, Programme Baseline and Risk Forecast. If a button
          isn't showing for you, this page explains why — every action is
          gated by your role and, for phases and fees, your discipline.
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Programme</h2>
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
