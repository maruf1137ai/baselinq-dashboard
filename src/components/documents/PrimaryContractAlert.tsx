/**
 * Dashboard alert — shown on the homepage when the active project has
 * no primary contract set. One click → /documents where the
 * PrimaryContractCard handles the upload flow.
 *
 * Auto-hides when:
 *   - No project selected (nothing to set against)
 *   - User isn't an owner / admin (they can't change it anyway)
 *   - Primary contract is already set
 *   - Fetch errors (avoid noisy dashboards on transient backend issues)
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getPrimaryContract } from "@/lib/Api";
import { documentsHref } from "@/lib/homeSignals";

interface PrimaryContractAlertProps {
  projectId: string | number | undefined;
  /**
   * Only owners / admins should see this CTA — they're the ones who
   * can actually upload + mark a contract. Defaults to true so the
   * component is safe to drop in; tighten the gate at the call-site.
   */
  visibleToCurrentUser?: boolean;
}

export const PrimaryContractAlert = ({
  projectId,
  visibleToCurrentUser = true,
}: PrimaryContractAlertProps) => {
  const navigate = useNavigate();

  const { data, isError } = useQuery({
    queryKey: ["project-primary-contract", projectId],
    queryFn: () => getPrimaryContract(projectId!),
    enabled: !!projectId && visibleToCurrentUser,
    staleTime: 60_000, // cache for a minute — this is a slow-changing signal
  });

  if (!projectId || !visibleToCurrentUser) return null;
  if (isError) return null;
  if (!data) return null;
  if (data.primary_contract) return null;

  // The alert already knows which project has no contract; it used to throw
  // that away and navigate to a bare `/documents`. Naming it keeps the
  // destination unambiguous.
  const href = documentsHref(projectId);

  // ONE line. It sits in the homepage's `space-y-3` precondition stack next to
  // the setup strip and the load banner, and it now carries their geometry
  // (`rounded-xl px-4 py-2.5`, one `text-sm` line) rather than a two-paragraph
  // block twice their height. Only the consequence survives the compression —
  // the point was never "upload a file", it was that every AI answer on this
  // project is citing generic clauses until you do.
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100/60 transition-colors group"
      role="button"
      tabIndex={0}
      onClick={() => navigate(href)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(href); }}
    >
      <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
      <p className="text-sm text-amber-900 flex-1 min-w-0">
        No primary contract set — AI answers cite generic clauses until you upload your signed
        agreement and mark it as primary.
      </p>
      <ArrowRight className="h-4 w-4 text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
};

export default PrimaryContractAlert;
