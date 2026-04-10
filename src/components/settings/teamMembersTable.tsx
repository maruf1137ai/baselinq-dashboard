import React, { useState } from "react";
import { Category, LedgerEntry } from "../finance/costLadger";
import { MoreHorizontal, ChevronsUpDown, Check } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { hasPermission, canManageMember } from "@/lib/roleUtils";
import { cn } from "@/lib/utils";
import { postData, deleteData, patchData, orgInviteMember } from "@/lib/Api";
import { toast } from "sonner";
// import CategoryBadge from './CategoryBadge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import FilterBtns from "./filterBtns";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { DISCIPLINE_OPTIONS } from "@/data/disciplines";

interface User {
  id: number;
  email: string;
  name: string;
  organization: string | null;
  role: Role | null;
  profile: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}

interface Role {
  id?: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TeamMember {
  _id: string;
  projectId: string;
  userId: string;
  user: User;
  roleName: string;       // Project role (used for permissions)
  orgRoleName: string;    // Org/user role (display only)
  orgRoleId: string;
  orgRoleInfo: Role;
  discipline: string;
  companyName: string;
  isActive: boolean;
  addedBy: {
    userId: string;
    name: string;
    email: string;
  };
  joinedDate: string;
  updatedAt: string;
}

interface ProjectUsersResponse {
  projectId: string;
  projectNumber: string;
  projectName: string;
  teamMembers: TeamMember[];
  totalMembers: number;
}

interface TeamMembersTableProps {
  entries: LedgerEntry[];
  onDeleteEntry: (id: number) => void;
}

const formatCurrency = (value: number) => {
  return `R ${value.toLocaleString("en-ZA")}`;
};

const ActionsCell = ({
  member,
  projectId,
  onRefetch,
  onRefetchRoles,
  roles,
}: {
  member: TeamMember;
  projectId: string;
  onRefetch: () => void;
  onRefetchRoles: () => void;
  roles: Role[];
}) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editDiscipline, setEditDiscipline] = useState(member.discipline || "");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteData({
        url: `projects/${projectId}/team-members/${member._id}/`,
        data: undefined,
      });
      toast.success("Team member removed successfully");
      setShowDeleteDialog(false);
      onRefetch();
    } catch (error: any) {
      console.error("Error removing team member:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to remove team member. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setIsUpdating(true);
    try {
      await patchData({
        url: `projects/${projectId}/team-members/${member._id}/`,
        data: {
          roleName: selectedRole.name,
          discipline: editDiscipline,
        },
      });

      // Synchronize global role with project role to ensure data consistency
      if (member.user?.id) {
        await patchData({
          url: `auth/users/${member.user.id}/`,
          data: {
            role: selectedRole.code
          }
        });
      }

      toast.success("Role updated successfully");
      setShowEditDialog(false);
      setSelectedRole(null);
      onRefetch();
      onRefetchRoles();

      // Dispatch event to refetch user role in DashboardSidebar
      window.dispatchEvent(new Event("user-role-change"));
    } catch (error: any) {
      console.error("Error updating role:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to update role. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded-md text-muted-foreground hover:text-muted-foreground hover:bg-muted">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40" align="end">
          <DropdownMenuItem onSelect={() => setShowEditDialog(true)}>
            Edit Role
          </DropdownMenuItem>
          <DropdownMenuItem>Suspend</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:bg-red-50 focus:text-red-700">
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {member.user.name} from this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update the role and discipline for this team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Information - Read Only */}
            <div className="space-y-2">
              <Label>Team Member</Label>
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-normal">
                  {member.user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-normal text-foreground">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select
                value={selectedRole?.code}
                onValueChange={(value) => {
                  const role = roles.find((r) => r.code === value);
                  setSelectedRole(role || null);
                }}>
                <SelectTrigger>
                  <SelectValue placeholder={member.roleName || "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.code} value={role.code}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Current role: <span className="font-normal">{member.roleName}</span>
            </p>

            {/* Discipline Selection */}
            <div className="space-y-2">
              <Label htmlFor="editDiscipline">Discipline</Label>
              <Select
                value={editDiscipline}
                onValueChange={setEditDiscipline}>
                <SelectTrigger>
                  <SelectValue placeholder={member.discipline || "Select a discipline"} />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedRole(null);
              }}
              disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              onClick={handleEditRole}
              disabled={isUpdating || !selectedRole}
              className="bg-primary hover:bg-primary/90">
              {isUpdating ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface CategoryBadgeProps {
  category: string;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  return (
    <span className="px-4 py-1 inline-flex text-sm leading-5 rounded-full bg-muted text-foreground border border-border capitalize">
      {category}
    </span>
  );
};

export enum OrderStatus {
  Active = "Active",
  Pending = "Pending",
  Rejected = "Rejected",
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";

  if (status === "Active") {
    return (
      <span className={`${baseClasses} bg-green-50 text-green-700 border border-green-200`}>
        {status}
      </span>
    );
  }

  if (status === "Pending") {
    return (
      <span className={`${baseClasses} bg-amber-50 text-amber-700 border border-amber-200`}>
        {status}
      </span>
    );
  }

  return (
    <span className={`${baseClasses} bg-red-50 text-red-700 border border-red-200`}>
      {status}
    </span>
  );
};

const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  entries,
  onDeleteEntry,
}) => {
  const [projectId] = useState(() => localStorage.getItem("selectedProjectId") || "");
  const { data: projectUsersData, isLoading, refetch } = useFetch<ProjectUsersResponse>(
    `projects/${projectId}/team-members/`
  );
  const { data: allUsersData } = useFetch<UsersResponse>("auth/users/?page_size=500");
  const { data: rolesData, refetch: refetchRoles } = useFetch<Role[]>("auth/roles/");

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamMembers = projectUsersData?.teamMembers || [];
  const allUsers = allUsersData?.results || [];
  const roles = (rolesData || []).filter(r => r.code && r.is_active !== false).sort((a, b) => a.name.localeCompare(b.name));

  const { data: user } = useCurrentUser();
  const currentMember = teamMembers.find((m) => String(m.user.id) === String(user?.id));
  const myRole = currentMember?.roleName || user?.role?.code || "";
  const canManageTeam = hasPermission(myRole, "manageTeam");

  const availableUsers = allUsers.filter(
    (u) => !teamMembers.some((member: TeamMember) => member.user.id === u.id)
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [activeTab, setActiveTab] = useState("add");

  const handleAddMember = async () => {
    if (activeTab === "add") {
      if (!selectedUser || !selectedRole) return;
      setIsSubmitting(true);
      try {
        await postData({
          url: `projects/${projectId}/team-members/`,
          data: {
            userId: selectedUser.id,
            roleName: selectedRole.name,
            roleCode: selectedRole.code,
            discipline: selectedDiscipline,
          },
        });
        // Also add to the organisation so they appear in Account > Organisation > Team
        try {
          await orgInviteMember({
            name: selectedUser.name || selectedUser.email,
            email: selectedUser.email,
            position: selectedRole.code,
          });
        } catch {
          // silently ignore — project add succeeded
        }
        toast.success("Team member added successfully");
        setShowAddMemberModal(false);
        setSelectedUser(null);
        setSelectedRole(null);
        setSelectedDiscipline("");
        await refetch();
      } catch (error: any) {
        console.error("Error adding team member:", error);
        toast.error(error?.response?.data?.error || "Failed to add member");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!inviteEmail || !selectedRole) return;
      setIsSubmitting(true);
      try {
        await postData({
          url: "auth/invite-personnel/",
          data: {
            email: inviteEmail,
            name: inviteName,
            role_code: selectedRole.code,
            project_id: projectId,
            discipline: selectedDiscipline,
          },
        });
        // Also invite to the organisation so they appear in Account > Organisation > Team
        try {
          await orgInviteMember({
            name: inviteName || inviteEmail,
            email: inviteEmail,
            position: selectedRole.code,
          });
        } catch {
          // silently ignore — project invite succeeded
        }
        toast.success("Invitation sent successfully");
        setShowAddMemberModal(false);
        setInviteEmail("");
        setInviteName("");
        setSelectedRole(null);
        setSelectedDiscipline("");
        await refetch();
      } catch (error: any) {
        console.error("Error inviting member:", error);
        toast.error(error?.response?.data?.error || "Failed to send invitation");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AwesomeLoader message="Analyzing Team Permissions" />
      </div>
    );
  }

  return (
    <div className="">
      <div className="top flex items-center gap-2.5 mb-4">
        <input
          type="text"
          className="py-2 px-6 text-sm text-muted-foreground border border-border bg-white rounded-lg w-full"
          placeholder="Search team members"
        />
        <FilterBtns />
        {canManageTeam && (
          <Button
            onClick={() => setShowAddMemberModal(true)}
            className="bg-primary text-white border border-border text-sm !py-3 !px-4 flex items-center gap-0">
            <span className="mr-1">+</span>
            Add members
          </Button>
        )}
      </div>

      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Expand your project team by adding existing users or inviting new members via email.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="add">Register Member</TabsTrigger>
              <TabsTrigger value="invite">Invite External</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userPopoverOpen}
                      className="w-full justify-between font-normal h-11">
                      {selectedUser ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-normal">
                            {selectedUser.name?.charAt(0).toUpperCase()}
                          </div>
                          <span>{selectedUser.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select a user...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                    <Command>
                      <CommandInput placeholder="Search team members..." />
                      <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          {availableUsers.map((u) => {
                            const isSelected = selectedUser?.id === u.id;
                            return (
                              <CommandItem
                                key={u.id}
                                value={u.name || u.email}
                                onSelect={() => {
                                  setSelectedUser(u);
                                  setUserPopoverOpen(false);
                                }}
                                className="cursor-pointer">
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-normal">
                                      {(u.name || u.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-normal text-foreground">
                                        {u.name || u.email}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{u.email}</span>
                                    </div>
                                  </div>
                                  <div
                                    className={cn(
                                      "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                      isSelected ? "border-primary bg-primary" : "border-border bg-white"
                                    )}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="invite" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <div className="relative">
                  <input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="e.g. john@example.com"
                  />
                </div>
              </div>
            </TabsContent>

            <div className="space-y-2 mt-4">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole?.code}
                onValueChange={(value) => {
                  const role = roles.find((r) => r.code === value);
                  setSelectedRole(role || null);
                }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="discipline">Discipline</Label>
              <Select
                value={selectedDiscipline}
                onValueChange={setSelectedDiscipline}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a discipline (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {DISCIPLINE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Tabs>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-border rounded-lg text-sm text-foreground bg-white hover:bg-muted">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleAddMember}
              disabled={
                isSubmitting ||
                !selectedRole ||
                (activeTab === "add" ? !selectedUser : !inviteEmail || !inviteName)
              }
              className="px-4 py-2 border border-transparent rounded-lg text-sm text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting
                ? activeTab === "add"
                  ? "Adding..."
                  : "Inviting..."
                : activeTab === "add"
                  ? "Add Member"
                  : "Invite Member"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto no-scrollbar">
          <table className="divide-y divide-border w-full">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Project Role",
                  "Company",
                  "Status",
                  canManageTeam ? "Actions" : null,
                ]
                  .filter(Boolean)
                  .map((header) => (
                    <th
                      key={header as string}
                      scope="col"
                      className={`px-4 py-2.5 text-left text-xs text-muted-foreground font-normal ${header === "Actions" ? "text-center" : ""
                        }`}>
                      {header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {teamMembers.map((member: TeamMember) => (
                <tr
                  key={member._id}
                  className="hover:bg-muted/50 transition-colors duration-150 text-foreground">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                    <div className="my-auto flex items-center gap-5 capitalize">
                      <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-normal capitalize">
                        {member.user.name?.charAt(0) || "?"}
                      </div>
                      {member.user.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                    <div>{member.user.email}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm !capitalize">
                    <CategoryBadge category={member.roleName === 'CLIENT' ? 'Client' : member.roleName || "N/A"} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap gap-1">
                      {member.companyName ? (
                        <div className="text-xs text-primary py-[2px] px-2 rounded bg-primary/10">
                          {member.companyName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <StatusBadge status={member.user?.is_active ? "Active" : "Rejected"} />
                  </td>
                  {canManageTeam && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {canManageMember(myRole, member.roleName) ? (
                        <ActionsCell
                          member={member}
                          projectId={projectId}
                          onRefetch={refetch}
                          onRefetchRoles={refetchRoles}
                          roles={roles}
                        />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamMembersTable;
