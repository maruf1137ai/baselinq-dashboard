/**
 * The session-wide push socket and the permission-change listener, mounted
 * ONCE at the app root.
 *
 * Both used to hang off page chrome: the socket off DashboardHeader (through
 * useNotifications) and the listener off usePermissions(). A page outside
 * DashboardLayout — the Help reference pages — therefore had neither, and an
 * admin's change on Roles & Permissions only showed up there after a reload.
 */
import { useInvalidateOnPermissionChange } from "@/hooks/usePermissions";
import { useUserEventSocket } from "@/hooks/useUserEventSocket";

export function PermissionLiveSync() {
  useUserEventSocket();
  useInvalidateOnPermissionChange();
  return null;
}
