import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";
import type { PermissionKey } from "@/lib/roleUtils";

/**
 * Wraps a route with a permission check.
 * - While auth is loading: renders nothing (avoids false redirect on reload)
 * - Once loaded: redirects to /unauthorized if the user lacks the permission
 *
 * `allowPlatformStaff` also lets Baselinq staff through. Staff raise the
 * platform-fee invoice on projects they are not members of, so they hold no
 * project permission there — and were sent to /unauthorized from the very
 * screens the server serves them (QA BUG-06). The page itself decides what a
 * staff member sees.
 *
 * Usage in App.tsx:
 *   <ProtectedRoute>
 *     <RoleRoute permission="viewCompliance">
 *       <Compliance />
 *     </RoleRoute>
 *   </ProtectedRoute>
 */
export default function RoleRoute({
  permission,
  allowPlatformStaff = false,
  children,
}: {
  permission: PermissionKey;
  allowPlatformStaff?: boolean;
  children: React.ReactNode;
}) {
  const { isLoading, can } = usePermissions();
  // The same query usePermissions waits on (same key), so this adds no request
  // and is settled whenever isLoading is false.
  const projectId = parseInt(localStorage.getItem("selectedProjectId") || "0") || null;
  const { data: effective } = useEffectivePermissions(projectId);

  // Wait for auth data before making the access decision
  if (isLoading) return null;

  if (!can(permission) && !(allowPlatformStaff && effective?.isPlatformStaff)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
