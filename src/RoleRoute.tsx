import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionKey } from "@/lib/roleUtils";

/**
 * Wraps a route with a permission check.
 * - While auth is loading: renders nothing (avoids false redirect on reload)
 * - Once loaded: redirects to /unauthorized if the user lacks the permission
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
  children,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
}) {
  const { isLoading, can } = usePermissions();

  // Wait for auth data before making the access decision
  if (isLoading) return null;

  if (!can(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
