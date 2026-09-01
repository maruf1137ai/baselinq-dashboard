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
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  /*
    ── One row, achromatic, ending in the same affordance as its neighbours ──

    This used to draw `bg-amber-50 border-amber-200`, `text-amber-900` body
    text and `text-amber-700` icons. `Index.tsx` flattens its children with
    `[&>*]:!bg-card`, which reaches the ROOT only — so the amber ink and the
    amber icons leaked through underneath a card-coloured row.

    They are gone rather than overridden, because the homepage's severity rule
    (documented at the top of `src/components/home/blocks.tsx`) says only a
    breach that has ALREADY HAPPENED may carry colour. An unset primary
    contract is a missing precondition, not a breach, so it is neutral — the
    same tier as the setup strip above it and the load banner below it.

    The row also used to be wholly clickable (`role="button"` + `tabIndex` +
    `onKeyDown`) and end in a bare chevron, while its two neighbours ended in
    a bordered `xs` button and a black filled button respectively: three rows,
    three different affordances at the same right edge. All three now end in
    one `outline` / `xs` button, which is what `LoadIssueBanner` already used.

    Because the affordance is now a real button, the row-level `role`,
    `tabIndex`, `onClick` and `onKeyDown` are removed. Keeping both would nest
    an interactive control inside an element announced as a button.
  */
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          No primary contract set — AI answers cite generic clauses until you upload your signed
          agreement and mark it as primary.
        </p>
      </div>
      <Button
        variant="outline"
        size="xs"
        className="shrink-0 w-36 justify-center"
        onClick={() => navigate(href)}
      >
        Upload contract
      </Button>
    </div>
  );
};

export default PrimaryContractAlert;
