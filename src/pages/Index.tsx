/**
 * Home.
 *
 * ── The two questions ────────────────────────────────────────────────────
 *
 * A project manager opens this screen to answer two things, and should be able
 * to answer both in about two seconds without scrolling:
 *
 *   1. **Is anything on fire?**            → the position strip, first.
 *   2. **Do I personally have to do        → "What needs you", top-left.
 *      something today?**
 *
 * Everything that answers neither has been demoted or removed. The previous
 * revision put eight panels of equal weight in one column — queue, key
 * indicators, risk, contract time, commercial position, certificate run,
 * current certificate, then meetings/programme/documents — so the page had no
 * answer to "where do I look first", and ran to 3,904px on a 1440px screen
 * while half the horizontal space sat empty.
 *
 * ── The layout ───────────────────────────────────────────────────────────
 *
 *   Preconditions   ONE bounded block of hairline rows, above everything, and
 *                   nothing at all in the usual case where none apply.
 *   Position strip  full width, six figures in one row. The summary.
 *   ├── LEFT  50%   THE WORK — what needs you, and only what a person can do.
 *   └── RIGHT 50%   THE POSITION — open risk (as condition), contract time.
 *
 * **Why the work is on the left.** In a left-to-right reading order the left
 * column is where the eye lands and where it returns. The queue is the only
 * thing on this page that asks the user to move, so it gets that position and
 * that is the whole justification. The right column is what is true about the
 * project whether or not anybody acts today: standing risk conditions and the
 * contract clock. Work on the left, state on the right.
 *
 * The columns collapse to one below `lg`, the breakpoint the app already uses
 * (this file's own three-up reference band used `lg:grid-cols-3`).
 * `items-start` so a short queue does not stretch to the height of the risk
 * panel beside it — an empty "What needs you" is a good answer and should look
 * like a small one.
 *
 * ── What was removed from this page, and why ─────────────────────────────
 *
 *   Certificate run     the whole certificate series with a bar per row —
 *                       562px of history. Reference, not condition. /finance.
 *   Current certificate its only action ("certify PC-006") is already the
 *                       first row of the queue, and its figures are /finance's.
 *   Meetings            each has its own page one click away in the sidebar,
 *   Programme           each was a panel of four rows, and none of the three
 *   Documents           answers either question above. Their ACTIONABLE parts
 *                       are untouched: an unanswered invitation and a meeting
 *                       action awaiting a decision are still queue rows.
 *
 * Nothing removed here was removed from the product; every one of them is a
 * sidebar entry.
 *
 * ── Where the eye goes, and the one conflict in this brief ───────────────
 *
 * The 50/50 split is an explicit request. NN/g's eyetracking puts roughly
 * 80% of fixations in the left half of a page, so the right column is held to
 * PASSIVE REFERENCE only — open risk as a standing condition, and the
 * contract clock. Neither asks anyone to do anything today; both are things
 * that are true about the project whether or not anybody acts.
 *
 * Everything that asks for a move is on the left: the queue, and the
 * precondition block above it, which is full-width and therefore begins in
 * the left half. Nothing actionable was moved right to balance the columns.
 *
 * ── The severity rule ────────────────────────────────────────────────────
 *
 * Stated in full at the top of `blocks.tsx`, and it governs this whole page:
 * only a breach that has already happened may carry colour; a tier is named
 * once at the head of its rows rather than repeated on each; only the worst
 * tier present is drawn; one coloured element per statement. Everything else
 * is ranked by position.
 *
 * ── What has not changed ─────────────────────────────────────────────────
 *
 * No figure, no fetch and no permission gate. `useHomeData` still requests
 * exactly what it requested — the money endpoints are still not REQUESTED
 * without `finance.view`, risk is still gated on `compliance.view`, and
 * `resolveFinanceAccess` still fails closed while the permission map loads.
 * Risk signals moved OUT of the queue and into their own grouped panel, but
 * they pass through `visibleRiskSignals`, which applies exactly the gates the
 * queue rows used to declare. Elapsed calendar time is still not shown as
 * progress, and there is still no invented data anywhere on it.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, ShieldAlert } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { InsuranceBanner } from "@/components/InsuranceBanner";
import { PrimaryContractAlert } from "@/components/documents/PrimaryContractAlert";
import { ProjectSetupDialog } from "@/components/home/ProjectSetupDialog";
import {
  ActionQueueBlock,
  LoadIssueBanner,
  RiskConditionBlock,
  SetupLineBlock,
  VerdictLine,
} from "@/components/home/blocks";
import { StatusBandBlock } from "@/components/home/StatusBand";
import { WhatChangedBlock } from "@/components/home/WhatChanged";
import { useHomeData } from "@/hooks/useHomeData";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";

// Real signups get CIDB rather than CONTRACTOR (see user/serializers.py's
// ROLE_MAP), so both are listed — CONTRACTOR alone missed most of them.
const CLIENT_ROLE_CODES = ["CLIENT", "OWNER", "CONTRACTOR", "CIDB"];

const Index = () => {
  const navigate = useNavigate();
  const projectId = useSelectedProjectId();
  const data = useHomeData(projectId);

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupSection, setSetupSection] = useState<string | null>(null);

  const openSetup = (section: string | null) => {
    setSetupSection(section);
    setSetupOpen(true);
  };

  const isClientOrContractor = CLIENT_ROLE_CODES.includes(data.currentUser?.role?.code ?? "");

  // ── State 1: no project ────────────────────────────────────────────────
  // "No projects at all" and "none selected" are different problems with
  // different fixes, so they get different screens.
  if (!projectId) {
    const hasNoProjects = data.allProjects.length === 0;
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Home" />
          {hasNoProjects ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="A project is where contract administration lives — instructions, variations, certificates and the documents behind them."
              action={
                <Button size="sm" onClick={() => navigate("/create-project")}>
                  Create your first project
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="No project selected"
              description="Choose a project to see what is waiting on you."
            />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── State 2: total outage ──────────────────────────────────────────────
  // Falling through to the ordinary empty state would render an outage as
  // "Nothing is waiting on you" — on a page whose whole purpose is telling
  // someone what is outstanding, that is the most expensive thing we could
  // say. State the outage instead.
  if (data.loadIssue.level === "total") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Home" />
          <EmptyState
            icon={ShieldAlert}
            title="This project's data could not be loaded"
            description={data.loadIssue.message}
            action={
              <Button variant="outline" size="sm" onClick={data.retryFailed}>
                Try again
              </Button>
            }
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* DashboardLayout owns the p-6 page padding; a page is a plain
          space-y-6 wrapper — the one page-top rule, documented on
          `PageHeader`. Home ran at space-y-4 while it was being built to a
          one-screen budget; it is on the app-wide 24px band gap now. */}
      <div className="space-y-6">
        {/*
          ── No description, and both halves of it were removed for a reason ──

          It read `${project.name} · ${project.location}`, and on the seeded
          project that rendered:

            "Hatfield Street Refurbishment · Nine Flowers Guest House, 133,
             Hatfield Street, Cape Town Ward 115, Cape Town, City of Cape
             Town, Western Cape, 8001, South Africa"

          **The name was already on screen.** `DashboardSidebar` renders
          `selectedProject?.name` in the project switcher, in a fixed `h-16`
          block that lines up with the page header's own row — so the same
          string appeared twice, about 200px apart, on the same horizontal
          band. The switcher is the better of the two places for it: it is
          where the name is also the control that changes it.

          **The location was not an address.** `Project.location` is one free
          text column holding a reverse geocoder's full display string.
          "Nine Flowers Guest House" is the nearest named building the
          geocoder matched and is not the project; "Cape Town Ward 115" is an
          electoral ward; and the tail is municipality, province, postcode and
          country. A Cape Town principal agent was being told, on their own
          project's homepage, that the job is in South Africa.

          **And it could not be shortened honestly.** `Project` carries
          `location`, `latitude` and `longitude` and no structured address —
          no suburb, city or postcode column — so there is nothing to select a
          better component from. Every rule for trimming the display string is
          a positional guess against a format whose segment count varies with
          what the geocoder matched: taking the first two segments yields
          "Nine Flowers Guest House, 133", which is worse than silence, and
          counting from the end is arbitrary in the same way on a string with
          fewer segments. A heuristic that cannot be defended on a
          differently-shaped string is not shipped.

          The full address is not lost: it is on the project record, and on
          issued notices, where the complete legal description is the point.
          What this bought back is roughly two lines of the one screen this
          page is held to.
        */}
        {/*
          ── The verdict, on the title row ─────────────────────────────────

          The page states one thing outright before any panel: the single
          worst fact that is true right now, or the plain statement that there
          is not one. See `VerdictLine`.

          It rides in the header's `actions` slot rather than on a line of its
          own, and that is a height decision rather than a layout preference:
          the page is held to one screen at 1440px, the title row is already
          drawn, and a line of its own costs the line plus a 16px stack gap for
          a sentence the header has room to carry. `actions` is a flex row that
          shrinks nothing, and the verdict is one short clause.

          `data.verdict` is null while the page is loading and `VerdictLine`
          renders nothing for it, so the header never carries an all-clear
          about data that has not arrived. See the guard in `useHomeData`.
        */}
        <PageHeader title="Home" actions={<VerdictLine data={data} />} />

        {/*
          ── The precondition stack: ONE block, not four ────────────────────

          These four are the same kind of thing — "something about this
          project is not set up yet" — and each one used to draw its own
          full-width bordered block. On a fresh project a user met a setup
          line, then a yellow contract banner, then possibly an insurance
          banner, then possibly a load banner: four containers, four borders,
          three 12px gaps and roughly 190px of chrome standing between the
          page header and the first thing anyone came here to read.

          The fix is the one the app already uses everywhere else: a list of
          related things is ONE bounded container with hairline-divided rows.
          The Xero finding holds — the container is still visibly bounded, it
          is just one container instead of four. `divide-y` supplies the rules
          between rows, and `empty:hidden` means the usual case, where every
          precondition is satisfied and all four children render null, draws
          nothing at all rather than a 2px empty box.

          `SetupLineBlock` and `LoadIssueBanner` were changed to draw no
          chrome of their own. `PrimaryContractAlert` and `InsuranceBanner`
          are owned elsewhere, so their card, border and radius are stripped
          here at the composition layer — see the note in the report about
          the amber fill that properly belongs in their own files.
        */}
        <div
          className={[
            "empty:hidden bg-card border border-border rounded-xl overflow-hidden",
            "divide-y divide-border",
            // Foreign children flatten into rows. `!` because these fight the
            // child's own utilities at equal specificity, where source order
            // would otherwise decide. They target only the child's ROOT, and
            // `divide-y` above is untouched because it applies to the
            // container, not to a child class.
            "[&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-card",
            // Restores the row hover the flattening removes, in the same
            // token every other list row on this page uses.
            "[&>*]:hover:!bg-muted/50 [&>*]:transition-colors",
          ].join(" ")}
        >
          <SetupLineBlock
            data={data}
            onOpen={() => openSetup(null)}
            onOpenSection={(s) => openSetup(s)}
          />
          <PrimaryContractAlert projectId={projectId} visibleToCurrentUser={data.canEditProject} />
          <InsuranceBanner />
          {/* State 3: partial outage — one line, one action. */}
          <LoadIssueBanner data={data} />
        </div>

        {/* State 4: loading */}
        {data.isLoading ? (
          <AwesomeLoader message="Reading what needs you" />
        ) : (
          <>
            {/* Question 1: is anything on fire. */}
            <StatusBandBlock data={data} />

            <div className="grid gap-4 lg:grid-cols-2 items-start">
              {/* Question 2: what do I have to do. */}
              <div className="space-y-4">
                <ActionQueueBlock data={data} />
              </div>
              {/* What is true whether or not anybody acts today. */}
              <div className="space-y-4">
                <RiskConditionBlock data={data} />
                <WhatChangedBlock feed={data.changeFeed} />
              </div>
            </div>
          </>
        )}
      </div>

      <ProjectSetupDialog
        open={setupOpen}
        section={setupSection}
        onClose={() => { setSetupOpen(false); setSetupSection(null); }}
        projectId={projectId}
        projectStats={data.projectStats}
        canEditProject={data.canEditProject}
        isClientOrContractor={isClientOrContractor}
      />
    </DashboardLayout>
  );
};

export default Index;
