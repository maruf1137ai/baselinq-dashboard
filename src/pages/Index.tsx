/**
 * Home.
 *
 * ── The hierarchy ────────────────────────────────────────────────────────
 *
 * A project manager opens this screen to answer one question: *what needs me,
 * and is any of it late.* Everything on the page is ordered by how close it
 * sits to that question.
 *
 *   1. Project setup      — one hairline strip. A precondition, not the work,
 *                           so it is first and it is small. Disappears at 100%.
 *   2. What needs you     — the only hero. One contained, ranked, divided list.
 *   3. Risk               — is anything on fire. Absent when nothing is.
 *   4. Commercial position— where the money stands. finance.view only.
 *   5. Current certificate— the live one. finance.view only.
 *   6. Meetings · Programme · Documents — reference, three-up, deliberately
 *                           the smallest things on the page.
 *
 * The three earlier A/B/C layout directions are gone. A layout switcher on a
 * shipped homepage reads as a product feature, and two of the three were dead
 * UI by definition.
 *
 * ── Containment ──────────────────────────────────────────────────────────
 *
 * Every section is a panel with its heading inside it (see the header comment
 * in `components/home/blocks.tsx`). Nothing is bare text on `--background`.
 * `EmptyState` survives here — for the three states where the WHOLE PAGE is
 * empty, which is the only place a full dashed well is the right answer.
 *
 * ── What has not changed ─────────────────────────────────────────────────
 *
 * No figure, no fetch and no permission gate. `useHomeData` is untouched; the
 * money endpoints are still not REQUESTED without `finance.view`, risk is
 * still gated on `compliance.view`, and `resolveFinanceAccess` still fails
 * closed while the permission map loads. Elapsed calendar time is still not
 * shown as progress, and there is still no invented data anywhere on it.
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
import { FilePreviewModal } from "@/components/TaskComponents/FilePreviewModal";
import { ProjectSetupDialog } from "@/components/home/ProjectSetupDialog";
import {
  ActionQueueBlock,
  CurrentCertificateBlock,
  DocumentsBlock,
  LoadIssueBanner,
  MeetingsBlock,
  MilestonesBlock,
  MoneyLineBlock,
  RiskStripBlock,
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

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
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

  return (
    <DashboardLayout>
      {/* DashboardLayout owns the p-6 page padding; a page is a plain
          space-y-6 wrapper, same as Finance and Project Health. */}
      <div className="space-y-6">
        <PageHeader
          title="Home"
          description={
            data.project?.name
              ? `${data.project.name}${data.project.location ? ` · ${data.project.location}` : ""}`
              : undefined
          }
        />

        {/* Setup, primary contract and insurance are preconditions for the
            rest of the screen being trustworthy, so they sit above it — but
            as three hairline strips, `space-y-3`, not as three permanent
            amber banners over a seven-row card. They were roughly 480px of
            chrome before the user's actual work; they are now about 130px,
            and usually one line or none. */}
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
            <ActionQueueBlock data={data} />
            <RiskStripBlock data={data} />
            <MoneyLineBlock data={data} />
            <CurrentCertificateBlock data={data} />

            {/* Reference, not work. Three-up so that on a quiet project — which
                is most projects most days — they are one ~76px band rather
                than three screens of dashed boxes. */}
            <div className="grid gap-4 lg:grid-cols-3 items-start">
              <MeetingsBlock data={data} />
              <MilestonesBlock data={data} />
              <DocumentsBlock data={data} onOpen={setSelectedDoc} />
            </div>
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
