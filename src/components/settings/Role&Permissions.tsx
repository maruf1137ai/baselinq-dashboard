// Embeds the permissions matrix inside Team Management's "Role Permissions" tab.
// Uses the content-only variant so there's no duplicate page header.
// The standalone page lives at /settings/permissions via src/pages/settings/permissions.tsx.
//
// There are now two permissions UIs, deliberately and temporarily. The new
// /roles-permissions page is the one to use: it reads the plain-English
// wording off the permission rows, shows which of the three layers decided an
// answer, and writes PROJECT overrides only — so a mistake reaches one contract
// and can be reset.
//
// This grid stays because it is the only place that still edits the
// ORGANISATION-wide default, which the new page will not do until that scope
// can be given a control nobody misreads. Two UIs writing the same tables is
// how they drift, so the banner below says plainly which does what rather than
// leaving people to guess from two similar-looking screens.
import { ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";

import { PermissionsContent } from "@/pages/settings/permissions";

const RolePermissions = ({ readOnly }: { readOnly?: boolean }) => {
  const projectId = parseInt(localStorage.getItem("selectedProjectId") || "0") || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">
            This grid sets your <strong>organisation-wide defaults</strong> — they apply to
            every project.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            To change what a role can do on <strong>one project only</strong>, use Roles &amp;
            Permissions instead. It explains each permission in plain English and shows where
            an answer came from.
          </p>
        </div>
        <Link
          to="/roles-permissions"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Roles &amp; Permissions
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <PermissionsContent readOnly={readOnly} projectId={projectId} />
    </div>
  );
};

export default RolePermissions;
