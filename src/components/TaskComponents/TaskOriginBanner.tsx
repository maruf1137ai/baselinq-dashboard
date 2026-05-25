/**
 * Werner spec — origin banner.
 *
 * When a task was auto-created via the escalation chain (RFI → SI,
 * SI → VO, IC → Claim), this banner surfaces that linkage prominently
 * at the top of the doc card. Otherwise we just rely on the right-side
 * References panel, which is easy to miss.
 *
 * Data source: the same /api/tasks/entity-references/ endpoint that
 * powers the side panel. We look at the `outgoing` list (docs THIS one
 * points at) and pick the first one marked `auto=true` — that's the
 * source the system auto-attached on escalation.
 */
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Link2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import useFetch from "@/hooks/useFetch";

interface RefOutgoing {
  display: string;
  target_type: string;
  target_id: number;
  /** PK of the wrapping Task that the frontend routes to via /tasks/{id}. */
  task_id?: number | null;
  auto: boolean;
}
interface RefData {
  incoming: unknown[];
  outgoing: RefOutgoing[];
}

interface Props {
  /** lowercased entity type — 'rfi' | 'si' | 'vo' | 'ic' | 'claim' | 'gi' */
  entityType: string;
  entityId: number | string;
}

const TYPE_TO_LABEL: Record<string, string> = {
  requestforinformation: "Request for Information",
  siteinstruction: "Site Instruction",
  variationorder: "Variation Order",
  generalinstruction: "General Instruction",
  intentiontoclaim: "Intention to Claim",
  delayclaim: "Claim",
};

export function TaskOriginBanner({ entityType, entityId }: Props) {
  const navigate = useNavigate();
  const url = entityType && entityId
    ? `tasks/entity-references/?entity_type=${entityType.toLowerCase()}&entity_id=${entityId}`
    : "";
  const { data } = useFetch<RefData>(url);

  const outgoing = data?.outgoing || [];
  const autoOrigin = outgoing.find((r) => r.auto);
  if (!autoOrigin) return null;

  const sourceLabel = TYPE_TO_LABEL[autoOrigin.target_type] || "source document";
  // The backend includes the wrapping Task pk on each reference, so we
  // can navigate directly to the source doc's detail page at
  // /tasks/{task_pk}. If the Task pk wasn't resolved (e.g. orphaned
  // reference), we fall back to the search-params route so the user
  // still lands close to the right place.
  const handleOpen = () => {
    if (autoOrigin.task_id) {
      navigate(`/tasks/${autoOrigin.task_id}`);
    } else {
      navigate(
        `/tasks?objectId=${autoOrigin.target_id}&taskType=${autoOrigin.target_type}`,
      );
    }
  };

  return (
    <Card className="p-0 bg-indigo-50/40 border-indigo-200 rounded-lg overflow-hidden mb-3">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4 text-indigo-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-indigo-900">
            Auto-created from{" "}
            <button
              type="button"
              onClick={handleOpen}
              className="font-medium underline decoration-indigo-400 underline-offset-2 hover:decoration-indigo-700 inline-flex items-center gap-0.5"
            >
              {autoOrigin.display}
              <ArrowUpRight className="w-3 h-3" />
            </button>
            .
          </p>
          <p className="text-xs text-indigo-800/80 mt-0.5">
            This doc was escalated from the {sourceLabel.toLowerCase()} above. Review the
            source for context before completing or signing.
          </p>
        </div>
      </div>
    </Card>
  );
}
