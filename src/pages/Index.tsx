/**
 * Home.
 *
 * Rebuilt from a 1,615-line page into role-aware composed blocks, with three
 * layout directions behind a switch so they can be compared side by side.
 *
 * ── What changed, and why ────────────────────────────────────────────────
 *
 * **Fabrication removed.** The previous page shipped `progress={65}` and
 * `progress={45}` as literals, a five-name array of invented people used to
 * sign activity ("Sarah Chen approved VO: …" for a VO nobody named Sarah had
 * touched), and four commented-out health cards with hardcoded values. All
 * gone. Every figure below traces to a response.
 *
 * **Elapsed time is not progress.** The progress ring was
 * `(now - start) / (end - start)` — a project where nothing had been built
 * read 50% at its halfway date, and the same bug drove every milestone bar.
 * Baselinq holds no physical-progress data, so none is shown. What replaces
 * it is certified value against contract sum, which is real and is labelled
 * as a commercial measure.
 *
 * **Role-awareness.** The page had no permission branching at all: a Client,
 * a PM and a Contractor saw identical sections, so a contractor without
 * `finance.view` was reading contract sums and certified values on their
 * landing page. Money blocks now declare `finance.view` and the endpoints
 * behind them are not even requested without it; certification actions
 * declare `finance.approve_payment`.
 *
 * **An outage never reads as "you are clear."** The six-state machine is
 * copied from `src/pages/Compliance.tsx` — no project, total outage, partial
 * outage, loading, empty and empty-of-work are six designed states.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Inbox, ShieldAlert } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { InsuranceBanner } from "@/components/InsuranceBanner";
import { PrimaryContractAlert } from "@/components/documents/PrimaryContractAlert";
import { FilePreviewModal } from "@/components/TaskComponents/FilePreviewModal";
import { ProjectSetupDialog } from "@/components/home/ProjectSetupDialog";
import {
  ActionQueueBlock,
  CurrentCertificateBlock,
  DocumentsBlock,
  KeyIndicatorsBlock,
  LoadIssueBanner,
  MeetingsBlock,
  MilestonesBlock,
  MoneyLineBlock,
  MoneyPanelBlock,
  RiskStripBlock,
  SetupLineBlock,
} from "@/components/home/blocks";
import { useHomeData } from "@/hooks/useHomeData";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";
import { cn } from "@/lib/utils";

// ── Direction switch ──────────────────────────────────────────────────────
//
// Three arrangements of the SAME blocks. They differ in layout and priority
// only — not in colour, radius, type scale or spacing. If two of them can be
// told apart by their palette, that is a bug.

const DIRECTIONS = [
  { key: "A", label: "A · The queue", hint: "One ranked list of what needs you, then risk, then money on a line." },
  { key: "B", label: "B · Two columns", hint: "Queue above the fold, then finance left, certificate and indicators right." },
  { key: "C", label: "C · Certificate first", hint: "The live certificate leads, with the queue and alerts docked beside it." },
] as const;

type DirectionKey = (typeof DIRECTIONS)[number]["key"];

const DIRECTION_STORAGE_KEY = "homeLayoutDirection";

// Real signups get CIDB rather than CONTRACTOR (see user/serializers.py's
// ROLE_MAP), so both are listed — CONTRACTOR alone missed most of them.
const CLIENT_ROLE_CODES = ["CLIENT", "OWNER", "CONTRACTOR", "CIDB"];

const Index = () => {
  const navigate = useNavigate();
  const projectId = useSelectedProjectId();
  const data = useHomeData(projectId);

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupSection, setSetupSection] = useState<string | null>(null);
  const [direction, setDirection] = useState<DirectionKey>(() => {
    const stored = localStorage.getItem(DIRECTION_STORAGE_KEY);
    return stored === "B" || stored === "C" ? stored : "A";
  });

  const chooseDirection = (key: DirectionKey) => {
    setDirection(key);
    localStorage.setItem(DIRECTION_STORAGE_KEY, key);
  };

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
              description="A project is where contract administration lives — instructions, variations, certificates and the documents behind them, all auditable in one place."
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
              description="Choose a project to see what is waiting on you — certificates to certify, notices inside their deadline window, and instructions assigned to you."
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

  const activeDirection = DIRECTIONS.find((d) => d.key === direction)!;

  // Setup, insurance and primary-contract sit together, BELOW the queue.
  // Previously three permanent non-dismissible amber banners could stack
  // above a seven-row setup card — roughly 480px of chrome before the user's
  // actual work. They are all still here and still non-dismissible; they are
  // simply no longer the first thing on the page.
  const setupSectionNode = (
    <div className="space-y-3">
      <SetupLineBlock
        data={data}
        onOpen={() => openSetup(null)}
        onOpenSection={(s) => openSetup(s)}
      />
      <PrimaryContractAlert projectId={projectId} visibleToCurrentUser={data.canEditProject} />
      <InsuranceBanner />
    </div>
  );

  const everyoneElse = (
    <>
      <MeetingsBlock data={data} />
      <MilestonesBlock data={data} />
      <DocumentsBlock data={data} onOpen={setSelectedDoc} />
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Home"
          description={
            data.project?.name
              ? `${data.project.name}${data.project.location ? ` · ${data.project.location}` : ""}`
              : undefined
          }
        />

        {/* Layout direction switch — the same underline tab strip Finance,
            Programme and Project Health already use. */}
        <div>
          <div className="flex items-center gap-2 border-b border-border" role="tablist">
            {DIRECTIONS.map((d) => (
              <button
                key={d.key}
                role="tab"
                aria-selected={direction === d.key}
                onClick={() => chooseDirection(d.key)}
                className={cn(
                  "text-sm py-4 px-6 border-b-2 -mb-px transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
                  direction === d.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{activeDirection.hint}</p>
        </div>

        {/* State 3: partial outage — one line, one action. */}
        <LoadIssueBanner data={data} />

        {/* State 4: loading */}
        {data.isLoading ? (
          <AwesomeLoader message="Reading what needs you" />
        ) : (
          <>
            {/* ── A — The queue ──────────────────────────────────────────
                One ranked list, then risk, then money on a single line,
                then setup as one line. Nothing competes with the queue. */}
            {direction === "A" && (
              <>
                <ActionQueueBlock data={data} />
                <RiskStripBlock data={data} />
                <MoneyLineBlock data={data} />
                {setupSectionNode}
                {everyoneElse}
              </>
            )}

            {/* ── B — Two columns ────────────────────────────────────────
                Darren's arrangement, made actionable: the queue is above the
                fold rather than below the numbers, the alert tiles route, and
                there are no gauges — a gauge implies a target, and none of
                these figures has one. */}
            {direction === "B" && (
              <>
                <ActionQueueBlock data={data} limit={5} />
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Without finance.view there is no financial overview and no
                      certificate to put opposite it, so the two columns become
                      indicators and risk rather than one empty half. */}
                  <div className="space-y-6">
                    {data.canViewFinance ? (
                      <MoneyPanelBlock data={data} />
                    ) : (
                      <KeyIndicatorsBlock data={data} />
                    )}
                  </div>
                  <div className="space-y-6">
                    {data.canViewFinance ? (
                      <>
                        <CurrentCertificateBlock data={data} />
                        <KeyIndicatorsBlock data={data} />
                      </>
                    ) : (
                      <RiskStripBlock data={data} />
                    )}
                  </div>
                </div>
                {data.canViewFinance && <RiskStripBlock data={data} />}
                {setupSectionNode}
                {everyoneElse}
              </>
            )}

            {/* ── C — Certificate first ──────────────────────────────────
                The live certificate leads and the queue docks beside it. For
                a viewer without finance.view there is no certificate to lead
                with, so the queue takes the lead column instead — the page
                shape adapts rather than rendering an empty hero. */}
            {direction === "C" && (
              <>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    {data.canViewFinance ? (
                      <>
                        <CurrentCertificateBlock data={data} />
                        <MoneyLineBlock data={data} />
                      </>
                    ) : (
                      <ActionQueueBlock data={data} />
                    )}
                  </div>
                  <div className="space-y-6">
                    {data.canViewFinance && <ActionQueueBlock data={data} limit={6} />}
                    <RiskStripBlock data={data} />
                    <KeyIndicatorsBlock data={data} />
                  </div>
                </div>
                {setupSectionNode}
                {everyoneElse}
              </>
            )}
          </>
        )}
      </div>

      <FilePreviewModal
        isOpen={!!selectedDoc}
        onOpenChange={(open) => { if (!open) setSelectedDoc(null); }}
        file={
          selectedDoc
            ? {
                name: selectedDoc.name || selectedDoc.file_name || selectedDoc.fileName || "Document",
                url:
                  selectedDoc.streamUrl ||
                  selectedDoc.stream_url ||
                  selectedDoc.file_url ||
                  selectedDoc.fileUrl ||
                  "",
              }
            : null
        }
      />

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
