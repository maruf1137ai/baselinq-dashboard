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

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100/60 transition-colors group"
      role="button"
      tabIndex={0}
      onClick={() => navigate("/documents")}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/documents"); }}
    >
      <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-200/60 flex items-center justify-center">
        <AlertTriangle className="w-4 h-4 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">
          No official contract uploaded for this project yet
        </p>
        <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
          AI analyses are running, but without a designated primary contract they cite generic clauses.
          Upload your signed JBCC / NEC / GCC agreement and mark it as the primary contract so retrieval anchors against it.
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </div>
  );
};

export default PrimaryContractAlert;
