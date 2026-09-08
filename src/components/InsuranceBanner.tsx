import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useInsuranceStatus } from '@/hooks/useInsuranceStatus';

/**
 * Dashboard banner shown when the selected project has no insurance
 * certificate uploaded into its seeded
 * Contracts > 04 Insurance Bonds and Guarantees > Insurance_Certificates folder.
 *
 * Visibility rules:
 *   - Hide if user has no `role` (client, not a professional)
 *   - Hide unless the viewer holds `document.upload` — the button navigates
 *     to `/documents/upload`, a route `document.upload` gates (App.tsx), and
 *     showing it to someone who will 403 on click is worse than no button.
 *   - Hide if no project is selected in localStorage
 *   - Hide while the status is loading or if satisfied === true
 *   - Show only when the project is missing an insurance certificate
 *
 * "Upload now" deep-links straight to Step 3 of the upload wizard,
 * pre-targeted at the Insurance_Certificates folder (same mechanism used
 * by the row-level Upload buttons in ContractsTree.tsx).
 *
 * Dismissal is project-shared: once any assigned member uploads into the
 * Insurance_Certificates folder, the banner clears for ALL members of
 * that project (the endpoint's `satisfied` field reflects the whole project).
 */
export const InsuranceBanner = ({
  visibleToCurrentUser = true,
}: { visibleToCurrentUser?: boolean } = {}) => {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const projectId = localStorage.getItem('selectedProjectId');

  const { data: status, isLoading } = useInsuranceStatus(
    user?.role && projectId ? projectId : null
  );

  // Non-professionals, no project selected, still loading, or already satisfied.
  if (!user || !user.role) return null;
  if (!visibleToCurrentUser) return null;
  if (!projectId) return null;
  if (isLoading || !status || status.satisfied !== false) return null;

  const handleClick = () => {
    const folderPath = encodeURIComponent(
      'Contracts > 04 Insurance Bonds and Guarantees > Insurance Certificates'
    );
    if (status.folderId) {
      navigate(
        `/documents/upload?tab=contracts&folder_id=${status.folderId}&folder_name=Insurance_Certificates&folder_path=${folderPath}`
      );
    } else {
      // Fallback for legacy projects without the seeded folder
      navigate('/documents/upload?tab=contracts');
    }
  };

  /*
    ── One row, achromatic, ending in the same affordance as its neighbours ──

    What this replaces: a `p-4` amber card with a 40px `bg-amber-100
    text-amber-700` icon tile, a two-line title-and-description block, and a
    `bg-foreground text-white` BLACK filled button — the loudest control on
    the entire homepage, attached to its least urgent item. `Index.tsx`
    flattens its children with `[&>*]:!bg-card`, which reaches the ROOT only,
    so the tile, the amber ink and the black button all survived underneath a
    card-coloured row.

    All three are gone. Under the homepage's severity rule (top of
    `src/components/home/blocks.tsx`) a missing insurance certificate is a
    missing precondition, not a breach that has already happened, so it takes
    no colour; and the right edge of every row in the precondition panel is
    now the same `outline` / `xs` button.

    `animate-in fade-in slide-in-from-top-2` is also gone: it made the top of
    the homepage slide on every single load, for a row that is not news.

    The second line ("Keeps your record compliant and visible to project
    owners.") is folded into the first rather than deleted — it was the only
    part that said WHY, and it fits.
  */
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-amber-50 border-b border-amber-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-amber-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-900">
            Upload your professional insurance certificate
          </p>
          <p className="text-xs text-amber-800">
            Required for consultants. Keeps your record compliant and visible to project owners.
          </p>
        </div>
      </div>
      <Button size="xs" className="shrink-0 w-36 justify-center" onClick={handleClick}>
        Upload now
      </Button>
    </div>
  );
};

export default InsuranceBanner;
