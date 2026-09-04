/**
 * Help / Home reference page.
 *
 * One section per Home area (Opening the Page, Setup & Preconditions, the
 * Project Summary strip, My Actions, Recent Activity, Contract Watch, the
 * Status Band, Construction vs Professional, and Where the Data Comes From)
 * written for non-technical users — role display names, not role codes.
 * Mirrors HelpTasks.tsx / HelpFinance.tsx / HelpProgramme.tsx /
 * HelpMeetings.tsx / HelpCommunication.tsx / HelpDocumentation.tsx /
 * HelpCompliance.tsx / HelpProjectHealth.tsx / HelpSettings.tsx's shape and
 * styling deliberately, so this reads as the same reference family.
 *
 * ── The one deliberate departure from the family ─────────────────────────
 *
 * Every other page in this family uses the columns "Action / Who can do it /
 * When", because every other page documents things a person DOES. Home is a
 * read-only dashboard: it has no create, no approve, no sign, no close. The
 * only interactive controls on it are dismissing the setup nag, retrying a
 * failed load, switching a Contract watch segment, and following a link to
 * the page that actually owns the record.
 *
 * Forcing this page into an "Action" column would mean inventing verbs for
 * things that are figures, so the columns here are "What you see / Who can
 * see it / Where it comes from" — which is also exactly what was asked for.
 * The table, the section shape, the quick-jump nav, the live-roles mechanism
 * and every style token are unchanged, so it still reads as one family.
 *
 * IMPORTANT — read before editing:
 *
 *  1. **Home has no permission of its own.** `/` is wrapped in
 *     ProtectedRoute + ProjectProtectedRoute (App.tsx) and nothing else.
 *     Anyone signed in with a project selected can open it. Do not describe
 *     a "home.view" or similar — no such permission exists.
 *
 *  2. **Money and risk are NOT fetched-then-hidden.** `useHomeData` does not
 *     REQUEST the finance endpoints without `finance.view`, and does not
 *     request risk signals or obligations without `compliance.view`. This
 *     distinction matters and is stated on the page: hiding a card still
 *     puts the employer's commercial position on a contractor's landing
 *     page in the network tab. Don't soften this to "is hidden".
 *
 *  3. **`resolveFinanceAccess` fails closed while permissions load**, so a
 *     viewer never briefly sees money they aren't entitled to.
 *
 *  4. **Recent activity is not a history log.** There is no project-scoped
 *     transition endpoint. It reports each task's CURRENT state ordered by
 *     when it was last touched. Don't describe it as an audit trail.
 *
 *  5. **The actor on an activity row is omitted when unknown.** The previous
 *     implementation cycled a hardcoded list of people who do not exist in
 *     the database ("Sarah Chen", "Maruf M.", …) whenever the payload
 *     carried no `assignedBy`. That was removed deliberately. Don't
 *     reintroduce a fallback, and don't describe the actor as always shown.
 *
 *  6. **"Setup % complete" measures the PROJECT RECORD, not site progress.**
 *     Baselinq holds no measure of physical work done. This is the single
 *     most misread number on the page.
 *
 * Source of truth:
 *   - Route (no permission)        → App.tsx (ProtectedRoute +
 *     ProjectProtectedRoute on "/", element Index)
 *   - Page layout and section order → src/pages/Index.tsx
 *   - Every read the page makes     → src/hooks/useHomeData.ts
 *   - Queue construction / ranking  → src/lib/homeSignals.ts
 *     (buildTaskQueue, buildCertificateQueue, buildTimeBarQueue,
 *     buildObligationQueue, buildMeetingActionQueue, buildRsvpQueue,
 *     buildPaymentOverdueQueue, rankQueue, filterQueueByPermission)
 *   - Finance gate resolution       → src/lib/homeSignals.ts
 *     (resolveFinanceAccess — fails closed while permissions load)
 *   - Setup ring / summary strip    → src/components/home/blocks.tsx
 *     (ProjectSummaryBlock, SetupLineBlock, LoadIssueBanner)
 *   - My actions                    → src/components/home/MyActions.tsx
 *   - Recent activity               → src/components/home/RecentActivity.tsx
 *   - Contract watch segments       → src/components/home/ContractWatch.tsx
 *   - Status band zones             → src/components/home/StatusBand.tsx
 *   - Cost vs progress curves       → src/components/home/PhaseCostProgress.tsx,
 *     src/lib/homeProgress.ts (buildCostProgressCurve)
 *   - Primary contract alert        → project/views.py
 *     (ProjectViewSet.primary_contract, url_path "primary-contract")
 *
 * Update this page whenever those rules change.
 *
 * Rows listed in ROW_PERMISSION have a LIVE "who" — computed from the
 * matching permission code's current grants (Roles & Permissions), via
 * GrantedRolesView (backend/permissions/auto_cc.py) and useGrantedRoles.
 * Everything else stays static, because it genuinely has no permission gate:
 * it is visible to anyone on the project team.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useGrantedRoles } from "@/hooks/useGrantedRoles";
import { useRoles } from "@/hooks/useRolePermissions";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import { formatRoleList, unionRoleCodes } from "@/lib/formatRoleList";

type Row = { action: string; who: string; when: string; note?: string };

interface HomeSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

/** Row -> permission code(s) whose grants decide its "who". Multiple codes = OR. */
const ROW_PERMISSION: Record<string, string[]> = {
  "Budget, certified and remaining": ["finance.view"],
  "The Money and Change zones": ["finance.view"],
  "The Project risk segment": ["compliance.view"],
  "Payment certificates, variations and the payment position": ["finance.view"],
  "Risk signals and contract obligations": ["compliance.view"],
};
const ROW_CODES = [...new Set(Object.values(ROW_PERMISSION).flat())];

/** The fallback shown until the live grants arrive. Never invents role names. */
const GATED = "Anyone holding the permission — see Roles & Permissions.";
const EVERYONE = "Anyone on the project team.";

const STATIC_SECTIONS: HomeSection[] = [
  {
    type: "OPENING",
    title: "Opening the Page",
    description:
      "Home is the only main page in the app with no permission of its own. What changes between one person and another is not whether the page opens — it is how much of it has anything in it.",
    rows: [
      {
        action: "Open Home",
        who: "Anyone signed in, once a project is selected.",
        when: "Anytime.",
        note:
          "There is no view permission for Home, and no role is excluded from it. If you have no projects at all you get a \"No projects yet\" screen with a Create project button; if you have projects but none is selected, a \"No project selected\" screen. Neither is an error.",
      },
      {
        action: "How much of the page you see",
        who: "Decided by two permissions only: finance and compliance.",
        when: "Every time the page loads.",
        note:
          "Without the finance permission the money figures are not shown — and are never even requested from the server. Without the compliance permission the same is true of risk signals and contract obligations. Everything else on the page is the same for everyone on the project.",
      },
    ],
  },
  {
    type: "SETUP",
    title: "Setup & Preconditions",
    description:
      "The block at the very top, above everything else. It is one bounded panel with a row per outstanding item — and on a project that is fully set up it draws nothing at all, not an empty box.",
    rows: [
      {
        action: "The setup ring, and \"Project setup — N of M\"",
        who: EVERYONE,
        when: "While any record field is still blank.",
        note:
          "Counts completed fields on the PROJECT RECORD — name, dates, contract sum, retention rate and so on. The ring shows the same figure as a percentage. It sits here, beside the list of what is still missing, rather than next to the project name, where a bare percentage reads as build progress. It does not measure work done on site: Baselinq holds no measure of physical progress, so a project can read 100% set up on its first day.",
      },
      {
        action: "\"Upload your primary contract\"",
        who: "Only people who can edit the project.",
        when: "Until a document on the project is marked as the primary contract.",
        note:
          "Comes from the project's own documents, looking for one marked with the primary-contract role. It is shown only to people who could actually act on it — someone who cannot upload a contract is not nagged about one. The AI pipeline uses this same marking to decide which document is authoritative.",
      },
      {
        action: "The insurance banner",
        who: EVERYONE,
        when: "While the project's insurance details are outstanding.",
      },
      {
        action: "\"Part of this page could not be loaded\"",
        who: EVERYONE,
        when: "When one of the page's sources fails.",
        note:
          "Each source on Home loads independently, so one failing endpoint costs only its own panel. This row names what is missing and offers a retry, rather than letting the page render a confident, empty \"nothing needs you\" that happens to be a network error.",
      },
    ],
  },
  {
    type: "SUMMARY",
    title: "The Project Summary Strip",
    description:
      "One row directly under the page title: which project this is, and the two or three figures that frame everything below it.",
    rows: [
      {
        action: "Project name and location",
        who: EVERYONE,
        when: "Always.",
        note: "Read from the project record itself.",
      },
      {
        action: "\"N days remaining\" / \"N days overdue\"",
        who: EVERYONE,
        when: "When the project has both a start and an end date recorded.",
        note:
          "Calendar days against the recorded contract end date. It is not a measure of how much work is left — elapsed time is deliberately never presented as progress anywhere on this page.",
      },
      {
        action: "Budget, certified and remaining",
        who: GATED,
        when: "When the project has a contract sum recorded.",
        note:
          "Budget is the contract sum as recorded, revised by approved variation orders. Certified is the value of certificates signed to date, with that figure as a percentage of the budget. Remaining is the difference. All three are ex-VAT. Certified is NOT the same as paid — it is the point at which money becomes payable, not the point at which it moves. A project with nothing certified says so in words rather than showing a zero. Without the finance permission none of it is displayed, and none of it is requested.",
      },
    ],
  },
  {
    type: "MYACTIONS",
    title: "My Actions",
    description:
      "Top-left, beside the activity feed. The narrow, personal list: things assigned to the person reading the page.",
    rows: [
      {
        action: "Tasks assigned to you",
        who: EVERYONE,
        when: "While the task is open and assigned to you.",
        note:
          "Comes from the project's task list, filtered to the signed-in user. Shows the subject, priority, description and due date — nothing else.",
      },
      {
        action: "Why this is separate from \"What needs you\"",
        who: EVERYONE,
        when: "Always.",
        note:
          "They answer two different questions. Contract watch ranks by consequence to the CONTRACT, so a notice deadline outranks your paperwork — correctly, but it meant an RFI genuinely addressed to you sorted below rows addressed to nobody in particular. \"What have I been asked to do\" needed its own list, so it has one.",
      },
      {
        action: "Why it is never restricted",
        who: EVERYONE,
        when: "Always.",
        note:
          "This panel has no permission gate at all, deliberately and permanently. Most people using this product hold no finance permission — an architect, an engineer, a site agent — and every one of them still answers RFIs and receives site instructions. Nothing on these rows is sensitive: a subject, a priority, a due date. The list is also uncapped; the panel scrolls rather than saying \"3 more not shown\".",
      },
    ],
  },
  {
    type: "ACTIVITY",
    title: "Recent Activity",
    description:
      "Top-right, beside My actions. What has been happening on this project lately.",
    rows: [
      {
        action: "The activity rows",
        who: EVERYONE,
        when: "Always.",
        note:
          "The project's most-recently-touched tasks, each turned into a sentence by its current status — \"Created RFI: …\", and so on.",
      },
      {
        action: "What it can and cannot tell you",
        who: EVERYONE,
        when: "Always.",
        note:
          "It is NOT an audit trail. There is no project history endpoint, so this reports each task's state as it is NOW, ordered by when it was last touched — not a log of transitions. If a task changed twice today you see where it ended up, not the journey.",
      },
      {
        action: "Rows with no name against them",
        who: EVERYONE,
        when: "When the record does not say who acted.",
        note:
          "Not a bug. Where the actor is not recorded the name is left out and the sentence starts with the verb, with no avatar. An earlier version filled these gaps from a hardcoded list of people who do not exist in the database — on the panel that claims to log who instructed what. A shorter true sentence beats a complete invented one.",
      },
    ],
  },
  {
    type: "WATCH",
    title: "Contract Watch",
    description:
      "One panel with a segmented switcher, below the two panels above it. Three lists answering one question: what is standing on this contract right now.",
    rows: [
      {
        action: "\"What needs you\"",
        who: EVERYONE,
        when: "Always.",
        note:
          "A single ranked queue assembled from several sources at once: unsigned and rejected payment certificates, certificates past their contractual due date, notice deadlines, contract obligations, meeting actions awaiting a decision, unanswered meeting invitations, and tasks. Ranked by consequence to the contract, not by date. Rows you have no permission to see are filtered out of it.",
      },
      {
        action: "The Project risk segment",
        who: GATED,
        when: "When open risk signals exist.",
        note:
          "Without the compliance permission this segment is ABSENT — not greyed out, not an empty tab. A disabled tab labelled \"Risk\" would leak the very fact the panel is withholding: whether there is anything to worry about.",
      },
      {
        action: "\"My meetings\"",
        who: EVERYONE,
        when: "For upcoming meetings you have not declined.",
        note: "Cancelled meetings, declined invitations and meetings already past are excluded.",
      },
      {
        action: "Which segment opens first",
        who: EVERYONE,
        when: "Every load.",
        note:
          "Your last choice is remembered per project — unless the queue is holding something graver than that segment can show, in which case the worst thing present wins. A live forfeiture clock must never sit behind a tab you have to think to press. Each segment carries its own count, so you can tell whether pressing it is worth the click.",
      },
    ],
  },
  {
    type: "STATUS",
    title: "The Status Band",
    description:
      "Toward the foot of the page. Where the contract stands — the question you ask after the lists above have told you whether anything is on fire today.",
    rows: [
      {
        action: "The Time zone",
        who: EVERYONE,
        when: "When contract dates are recorded.",
        note: "The contract rail with today marked on it, and the milestone position.",
      },
      {
        action: "The Money and Change zones",
        who: GATED,
        when: "When there are certificates or variations to plot.",
        note:
          "Certified-to-date and the certified curve, retention held, the balance, and the approved/pending split of variations. All of it is built from the finance sources, so without that permission these two zones are absent and the Programme zone expands to take the width — carrying milestone baseline-versus-actual detail in more depth than the three-zone layout has room for. A viewer without finance sees a fuller programme picture, not a gap.",
      },
      {
        action: "An empty zone",
        who: EVERYONE,
        when: "When a zone has no figure to show.",
        note:
          "Reads as a state in words rather than drawing a dash where the number should be. A zone that cannot plot something says why.",
      },
      {
        action: "The colours",
        who: EVERYONE,
        when: "Always.",
        note:
          "Purple is identity, not severity — it marks the main data series on every chart and appears just as much on a healthy project. Red means a breach that has ALREADY happened, and nothing else. If nothing is red, nothing has been breached.",
      },
    ],
  },
  {
    type: "PHASE",
    title: "Construction vs Professional",
    description:
      "The last block on the page: one card for each discipline group, each asking the same question.",
    rows: [
      {
        action: "The two lines on each card",
        who: EVERYONE,
        when: "When the project has milestones with costs and progress recorded.",
        note:
          "Not \"how much has been spent\" and not \"% complete\" — both of those live elsewhere. This is which of the two is AHEAD of the other within that discipline group: cumulative recorded cost against cumulative cost-weighted physical progress, both read as a share of the same fixed total. The solid line with the fill is money; the dashed line is progress.",
      },
      {
        action: "Breaks in a line",
        who: EVERYONE,
        when: "Where a milestone has no cost or no progress recorded.",
        note:
          "A genuine gap in the data is drawn as a gap, with a small tick on the baseline marking where it fell. The line is never carried across a missing point, and neither line is assumed to start at zero — that is not something this data can support.",
      },
    ],
  },
  {
    type: "SOURCES",
    title: "Where the Data Comes From",
    description:
      "Every read this page makes, and what each one feeds. Nothing on Home is entered on Home — every figure is owned by another page, and Home only reports it.",
    rows: [
      {
        action: "The project record",
        who: EVERYONE,
        when: "Feeds the name, location, dates, contract sum, retention rate and the setup ring.",
      },
      {
        action: "Tasks",
        who: EVERYONE,
        when: "Feeds My actions, Recent activity, and the task rows of What needs you.",
      },
      {
        action: "Meetings",
        who: EVERYONE,
        when: "Feeds My meetings, unanswered invitations, and meeting actions awaiting a decision.",
        note:
          "Meeting action items live only on a meeting's own detail record, so those are fetched only for the few meetings whose notes have landed — never for the whole history.",
      },
      {
        action: "Notice deadlines",
        who: EVERYONE,
        when: "Feeds the notice-deadline rows of What needs you.",
        note:
          "These rows are project-wide — they are not addressed to any one person, which is why their heading says so.",
      },
      {
        action: "Milestones",
        who: EVERYONE,
        when: "Feeds the Programme zone and both cost-vs-progress cards.",
      },
      {
        action: "Risk signals and contract obligations",
        who: GATED,
        when: "Feed the Project risk segment and the obligation rows of What needs you.",
        note:
          "Obligations are extracted from the project's own contract documents. Both carry the compliance permission and neither is requested without it.",
      },
      {
        action: "Payment certificates, variations and the payment position",
        who: GATED,
        when: "Feed every money figure on the page.",
        note:
          "The payment position is where \"19 days past due\" comes from — the server works the due date out from the project's own payment terms, applying the South African working-day calendar where the period is counted in working days.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Home is a reporting surface, not a place where anything is entered. Every figure on it belongs to another page — Finance, Programme, Tasks, Meetings, Compliance — and Home only reads it. If a number here looks wrong, it is wrong on the page that owns it, and that is where it must be corrected.",
  "Two permissions decide everything you see: finance and compliance. Neither of them merely hides a card — without them the data is never requested from the server at all. This is the difference between a contractor not seeing the employer's commercial position and a contractor's browser having been sent it.",
  "While your permissions are still loading, the page assumes you have none and shows nothing sensitive. You may briefly see less than you are entitled to; you will never briefly see more.",
  "Every source on this page loads on its own. One of them failing costs its own panel and says so at the top — it never leaves the rest of the page looking confidently empty.",
  "Nothing on this page is invented. Where a fact is not in the record — who acted on a task, the cost of a milestone, whether work has physically progressed — the page leaves a gap and says so rather than filling it with a plausible-looking value.",
  "\"Setup N% complete\" is about the project RECORD being filled in, not about work done on site. Baselinq holds no measure of physical progress, and no figure anywhere on this page should be read as one — including days remaining, which is calendar time and nothing more.",
];

export default function HelpHome() {
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
        const codes = ROW_PERMISSION[row.action];
        if (!codes) return row;
        const roleCodes = unionRoleCodes(...codes.map((c) => grants[c]));
        return { ...row, who: `Anyone holding: ${formatRoleList(roleCodes, roleNamesByCode)}.` };
      }),
    }));
  }, [grants, roleNamesByCode]);

  // Back goes to wherever the user actually came from — the Help hub, a deep
  // link out of Home, anywhere — rather than always dumping them on "/".
  // history.state.idx is React Router's history index: 0 (or undefined) means
  // this page is the first entry, so there is nothing to pop.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/", { replace: true });
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
          Home reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to every section of the Home page — what each one
          shows, who can see it, and which part of the system the figure
          actually comes from. Home is the one main page with no permission of
          its own: everyone can open it, and what differs is how much of it has
          anything in it.
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
                      <th className="text-left font-normal px-4 py-2.5 w-1/4">What you see</th>
                      <th className="text-left font-normal px-4 py-2.5 w-2/5">Who can see it</th>
                      <th className="text-left font-normal px-4 py-2.5">Where it comes from</th>
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
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Home</h2>
          <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
            <ul className="space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-5">
              {GLOBAL_NOTES.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated 2026-09-04. If the platform behaves differently from
          what's described here, the platform's behaviour is the bug — please
          let the team know.
        </p>
      </div>
    </div>
  );
}
