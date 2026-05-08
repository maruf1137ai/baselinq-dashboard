/**
 * Werner spec rev H — small References sub-panel for the right side of
 * TaskDetails, sits below Audit Trail.
 *
 * Shows incoming and outgoing entity references for the current task:
 *   incoming = docs that point AT this one (e.g. SI-001 references this RFI)
 *   outgoing = docs THIS one points at (e.g. this VO references RFI-001 + SI-001)
 *
 * Auto-attached refs (the system propagated them on escalation) render
 * with a small "(auto)" muted suffix per Werner page 5/8 spec.
 *
 * Design language matches the Audit Trail above: same xs muted heading,
 * same dotted-list look, same fonts. No new visual style.
 */
import { Link } from "react-router-dom";
import useFetch from "@/hooks/useFetch";

interface RefIncoming {
  display: string;
  source_type: string;
  source_id: number;
  auto: boolean;
}
interface RefOutgoing {
  display: string;
  target_type: string;
  target_id: number;
  auto: boolean;
}
interface RefData {
  incoming: RefIncoming[];
  outgoing: RefOutgoing[];
}

// Map backend content_type model name → URL prefix that resolves to the
// existing TaskDetails page (which then itself resolves entity → task).
// We use the production task list URL, not v2 routes, so behaviour stays
// consistent with everything else.
const CONTENT_TYPE_TO_LABEL: Record<string, string> = {
  requestforinformation: "RFI",
  siteinstruction: "SI",
  variationorder: "VO",
  generalinstruction: "GI",
  intentiontoclaim: "IC",
  delayclaim: "Claim",
};

interface Props {
  entityType: string;  // 'rfi' | 'si' | 'vo' | etc.
  entityId: number | string;
}

export function TaskReferences({ entityType, entityId }: Props) {
  const url = entityType && entityId
    ? `tasks/entity-references/?entity_type=${entityType.toLowerCase()}&entity_id=${entityId}`
    : "";
  const { data } = useFetch<RefData>(url);

  const incoming = data?.incoming || [];
  const outgoing = data?.outgoing || [];

  if (incoming.length === 0 && outgoing.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h3 className="text-xs font-normal text-foreground mb-3 pl-2">References</h3>

      {incoming.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1.5 pl-2">From</p>
          <ul className="space-y-1.5 pl-2">
            {incoming.map((ref, i) => (
              <li key={`in-${i}`} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">←</span>
                <span className={ref.auto ? "text-red-600" : "text-foreground"}>
                  {ref.display}
                </span>
                {ref.auto && (
                  <span className="text-[10px] text-muted-foreground">(auto)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 pl-2">Linked to</p>
          <ul className="space-y-1.5 pl-2">
            {outgoing.map((ref, i) => (
              <li key={`out-${i}`} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">→</span>
                <span className={ref.auto ? "text-red-600" : "text-foreground"}>
                  {ref.display}
                </span>
                {ref.auto && (
                  <span className="text-[10px] text-muted-foreground">(auto)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
