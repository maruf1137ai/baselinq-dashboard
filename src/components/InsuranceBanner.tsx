import { Shield, ArrowRight } from 'lucide-react';
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
export const InsuranceBanner = () => {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const projectId = localStorage.getItem('selectedProjectId');

  const { data: status, isLoading } = useInsuranceStatus(
    user?.role && projectId ? projectId : null
  );

  // Non-professionals, no project selected, still loading, or already satisfied.
  if (!user || !user.role) return null;
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

  return (
    <div className="p-4 rounded-2xl border bg-amber-50 border-amber-200 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
        <Shield className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-normal text-amber-900 leading-tight">
          Upload your professional insurance certificate
        </p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          Required for consultants. Keeps your record compliant and visible to project owners.
        </p>
      </div>
      <Button
        onClick={handleClick}
        className="bg-foreground text-white hover:bg-foreground/90 h-8 px-4 text-[11px] rounded-lg font-normal flex items-center gap-2 shrink-0"
      >
        Upload now
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  );
};

export default InsuranceBanner;
