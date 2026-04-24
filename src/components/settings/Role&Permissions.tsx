// Embeds the permissions matrix inside Team Management's "Role Permissions" tab.
// Uses the content-only variant so there's no duplicate page header.
// The standalone page lives at /settings/permissions via src/pages/settings/permissions.tsx.
import { PermissionsContent } from "@/pages/settings/permissions";

const RolePermissions = () => <PermissionsContent />;
export default RolePermissions;
