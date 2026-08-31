/**
 * Help / Compliance reference page.
 *
 * One section per Compliance area (Opening the Page, Viewing Obligations,
 * Acting on Obligations, The "compliance.edit" Permission) showing who can
 * do what in plain English. Written for non-technical users — uses role
 * display names, not role codes. Mirrors HelpTasks.tsx / HelpFinance.tsx /
 * HelpProgramme.tsx / HelpMeetings.tsx / HelpCommunication.tsx /
 * HelpDocumentation.tsx's shape and styling deliberately, so this reads as
 * the same reference family rather than a second design.
 *
 * IMPORTANT — read before editing, this is the whole point of this page:
 * "compliance.view" and "compliance.edit" do NOT gate the data or actions
 * on the Compliance page, despite the obvious-looking name match.
 * - compliance.view only gates whether the /compliance ROUTE opens at all
 *   (RoleRoute permission="viewCompliance", App.tsx). The obligations list
 *   itself is served by documents/views.py::ObligationListView, which
 *   checks document.view — a completely different permission, granted to
 *   a different (though overlapping) set of roles.
 * - compliance.edit is real and enforced, but for an unrelated feature:
 *   Project Health's insurer-disclosure admin surface (risk policy,
 *   insurer API tokens, disclosure log) in the risk app. It has nothing to
 *   do with anything on this page.
 * Do not simplify this into "compliance.view/edit control Compliance" —
 * that is the exact wrong assumption this page exists to correct.
 * Also: there is no dedicated Compliance app/model — this page is a
 * project-wide roll-up view over documents.DocumentObligation /
 * ObligationEvidence (plus risk.TimeBarClock for notice deadlines).
 *
 * Source of truth:
 *   - Route gate (compliance.view)    → App.tsx (RoleRoute
 *     permission="viewCompliance"), hooks/usePermissions.ts
 *   - Real data gate (document.view)  → documents/views.py
 *     (ObligationListView.get), documents/permissions.py (visible_folder_q)
 *   - compliance.view/.edit grants    → user/migrations/
 *     0016_seed_phase2_permissions.py (compliance.view),
 *     0042_seed_compliance_edit_permission.py (compliance.edit — explicitly
 *     for risk/insurer administration, not this page)
 *   - Per-project override            → project/models.py
 *     (ProjectRolePermission), permissions/core.py (Layer 3)
 *   - Create/complete an obligation   → documents/views.py
 *     (DocumentViewSet.obligations, update_obligation — document.view
 *     only, a real gap, same class as the Documentation page's)
 *   - Evidence / notice actions       → documents/views.py
 *     (ObligationEvidenceView — document.upload;
 *     ObligationGenerateNoticeView — document.edit, draft-only)
 *   - compliance.edit's real target   → risk/views.py (may_administer_risk),
 *     risk/views_insurer.py
 *   - Hidden from Settings UI         → pages/settings/permissions.tsx
 *     (hiddenGroups includes "compliance")
 *   - AI extraction                   → documents/ai_analysis.py,
 *     documents/views.py (DocumentViewSet.analyze — document.view only;
 *     a stricter can_retrigger_ai_analysis exists but is never called)
 *
 * Update this page whenever those rules change.
 *
 * Rows listed in ROW_PERMISSION have a LIVE "who" — computed from the
 * matching permission code's current grants (Roles & Permissions), via
 * GrantedRolesView (backend/permissions/auto_cc.py) and useGrantedRoles.
 * "Open the Compliance page" (compliance.view) and the "Analyse with AI"
 * button stay static on purpose — compliance.view only gates the frontend
 * route (no backend check exists for it, see the IMPORTANT note above), and
 * the AI button's real target doesn't cleanly map to a single code either.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useGrantedRoles } from "@/hooks/useGrantedRoles";
import { useRoles } from "@/hooks/useRolePermissions";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import { formatRoleList } from "@/lib/formatRoleList";

type Row = { action: string; who: string; when: string; note?: string };

interface ComplianceSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

/** Row action -> permission code + how to render the dynamic list into that row's sentence. */
const ROW_PERMISSION: Record<string, { code: string; render: (list: string) => string }> = {
  "See an obligation on the list": {
    code: "document.view",
    render: (list) => `Anyone who can view documents on the project — anyone holding: ${list}.`,
  },
  "Add a new obligation, or mark one Complete / In Progress": {
    code: "document.view",
    render: (list) => `Anyone who can view the source document — anyone holding: ${list}.`,
  },
  "Attach evidence to an obligation": {
    code: "document.upload",
    render: (list) => `Anyone who can upload documents on the project — anyone holding: ${list}.`,
  },
  "Generate a notice for an obligation": {
    code: "document.edit",
    render: (list) => `Anyone who can edit documents on the project — anyone holding: ${list}.`,
  },
  "What compliance.edit actually controls": {
    code: "compliance.edit",
    render: (list) => `Anyone holding: ${list}.`,
  },
};
const ROW_CODES = [...new Set(Object.values(ROW_PERMISSION).map((c) => c.code))];

const STATIC_SECTIONS: ComplianceSection[] = [
  {
    type: "OPENING",
    title: "Opening the Page",
    description:
      "Compliance is a project-wide view of contractual obligations (extracted from your documents by AI, or added by hand) and notice deadlines — deliberately with no single \"compliance score.\" There's no separate Compliance database behind it; it's built entirely on the same data as Documents.",
    rows: [
      {
        action: "Open the Compliance page",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Architect, Consultant Quantity Surveyor, Consultant Planning Engineer, Planning Engineer.",
        when: "Anytime on the project.",
        note:
          "Administrator, Project Administrator, and Principal/PM are notably NOT on this list by default — that's a known gap in the platform's own permission setup, not a deliberate design choice, and it's never been fixed. If you're an admin and can't see Compliance, this is why.",
      },
    ],
  },
  {
    type: "VIEWING",
    title: "Viewing Obligations",
    description:
      "Getting past the page's front door is one thing. Seeing any actual obligation on it is governed by a completely different permission.",
    rows: [
      {
        action: "See an obligation on the list",
        who:
          "Anyone who can view documents on the project (the same document.view permission described on the Documentation reference page) — not the compliance.view permission that got you onto this page.",
        when: "Anytime, for obligations whose source document you're allowed to see.",
        note:
          "This is worth understanding clearly: the permission that opens Compliance and the permission that fills it with data are two different things, and they don't have to line up for a given person. Someone could open this page and see nothing, or (if they went through Documents directly) see data on documents without ever being allowed onto this page. Each obligation is also only visible if its source document's folder is visible to you — the same rule used throughout Documentation.",
      },
    ],
  },
  {
    type: "ACTING",
    title: "Acting on Obligations",
    description:
      "Adding an obligation, marking one resolved, attaching evidence, or drafting a notice.",
    rows: [
      {
        action: "Add a new obligation, or mark one Complete / In Progress",
        who: "Anyone who can view the source document.",
        when: "Anytime.",
        note:
          "This is more open than it probably should be — creating or resolving an obligation currently only requires being able to view the document, not edit it. Treat this as a known gap rather than an intentional \"anyone can resolve anything\" design.",
      },
      {
        action: "Attach evidence to an obligation",
        who: "Anyone who can upload documents on the project.",
        when: "Anytime.",
      },
      {
        action: "Generate a notice for an obligation",
        who: "Anyone who can edit documents on the project.",
        when: "Anytime.",
        note:
          "This only ever drafts text onto the obligation — the platform never sends or serves a notice on your behalf. There's no dispatch step; someone still has to take the drafted wording and issue it themselves.",
      },
      {
        action: "\"Analyse with AI\" button on this page",
        who: "Anyone who can open the page.",
        when: "Anytime.",
        note:
          "This doesn't run any analysis here — it takes you to Documents instead, since there's no project-wide analysis action. Actually re-running AI extraction on a document (which is where obligations really come from) only requires being able to view that document, even though the codebase itself defines a stricter check for this that would require edit access — that stricter check exists but is never actually used.",
      },
    ],
  },
  {
    type: "COMPLIANCEEDIT",
    title: "The \"compliance.edit\" Permission",
    description:
      "There's a permission literally called compliance.edit — but it has nothing to do with anything on this page.",
    rows: [
      {
        action: "What compliance.edit actually controls",
        who: "Client/Owner, Client Project Manager, Project Manager, Construction Manager.",
        when: "—",
        note:
          "It governs the Project Health page's risk-and-insurer administration: changing the project's risk policy, issuing or listing insurer API access tokens, and viewing the insurer disclosure log. It does not control creating, editing, or resolving anything on the Compliance page you're reading about right now — despite the name.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "The single most important thing on this page: compliance.view decides whether you can open Compliance at all, but document.view decides whether you actually see anything once you're there. They are two separate permissions, granted to overlapping but different sets of roles, and nothing keeps them in sync.",
  "Neither compliance.view nor compliance.edit can currently be viewed or changed from the app's own Settings → Permissions screen — that page deliberately hides the \"compliance\" group. A change to either still has to go through the underlying permissions system directly, not this app's own admin UI.",
  "Like every permission described across these Help pages, compliance.view, compliance.edit, and document.view/upload/edit can all be overridden per project by an admin, even without a Settings screen for the first two — so the role lists here are organisation-wide defaults, not guarantees for any specific project.",
];

export default function HelpCompliance() {
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
        return { ...row, who: cfg.render(formatRoleList(grants[cfg.code] ?? [], roleNamesByCode)) };
      }),
    }));
  }, [grants, roleNamesByCode]);

  // Back goes to wherever the user actually came from — the Help hub, a
  // deep link out of /compliance, anywhere — rather than always dumping them on
  // /compliance. history.state.idx is React Router's history index: 0 (or
  // undefined) means this page is the first entry, so there is nothing to
  // pop and we fall back to /compliance.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/compliance", { replace: true });
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
          Compliance reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to Compliance: what it actually is, who can
          open it, and — separately — who can see and act on what's inside
          it. Those turn out to be different questions with different
          answers, and this page exists mainly to explain why.
        </p>

        {/* Quick jump nav */}
        <div className="mt-6 flex flex-wrap gap-2">
          {sections.map((s) => (
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Compliance</h2>
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
