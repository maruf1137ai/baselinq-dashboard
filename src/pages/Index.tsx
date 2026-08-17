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
 *   Preconditions   one hairline strip each, above everything. Usually none.
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
  ContractTimeBlock,
  LoadIssueBanner,
  PositionStripBlock,
  RiskConditionBlock,
  SetupLineBlock,
} from "@/components/home/blocks";
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
          space-y-4 wrapper. */}
      <div className="space-y-4">
        <PageHeader
          title="Home"
          description={
            data.project?.name
              ? `${data.project.name}${data.project.location ? ` · ${data.project.location}` : ""}`
              : undefined
          }
        />

        {/* Preconditions for the rest of the screen being trustworthy, so they
            sit above it — as hairline strips, and usually one line or none. */}
        <div className="space-y-3">
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
            <PositionStripBlock data={data} />

            <div className="grid gap-4 lg:grid-cols-2 items-start">
              {/* Question 2: what do I have to do. */}
              <div className="space-y-4">
                <ActionQueueBlock data={data} />
              </div>
              {/* What is true whether or not anybody acts today. */}
              <div className="space-y-4">
                <RiskConditionBlock data={data} />
                <ContractTimeBlock data={data} />
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
