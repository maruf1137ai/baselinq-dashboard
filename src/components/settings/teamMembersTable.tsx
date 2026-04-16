import React, { useState } from "react";
import { Category, LedgerEntry } from "../finance/costLadger";
import { MoreHorizontal, ChevronsUpDown, Check, User as UserIcon, Mail, X } from "lucide-react";
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
import FilterBtns from "./filterBtns";
import { AwesomeLoader } from "../commons/AwesomeLoader";


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
  const { data: allUsersData } = useFetch<UsersResponse>("auth/users/?my_org=true&page_size=500");
  const { data: rolesData, refetch: refetchRoles } = useFetch<Role[]>("auth/roles/");

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamMembers = projectUsersData?.teamMembers || [];
  const allUsers = allUsersData?.results || [];
  const roles = (rolesData || []).filter(r => r.code && r.is_active !== false).sort((a, b) => a.name.localeCompare(b.name));

  const { data: user } = useCurrentUser();
  const currentMember = teamMembers.find((m) => String(m.user.id) === String(user?.id));
  const myRole = currentMember?.roleName || user?.role?.code || "";
  const isOrgAdmin = user?.account_type === 'organisation';
  const canManageTeam = isOrgAdmin || hasPermission(myRole, "manageTeam");

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
          },
        });
        toast.success("Team member added successfully");
        setShowAddMemberModal(false);
        setSelectedUser(null);
        setSelectedRole(null);
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
          },
        });
        toast.success("Invitation sent successfully");
        setShowAddMemberModal(false);
        setInviteEmail("");
        setInviteName("");
        setSelectedRole(null);
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

      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#f0fdf4] flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-[#00b894]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-normal text-[#1a1a2e]">Add Team Member</h3>
                  <p className="text-[12px] text-[#9ca3af]">Add existing users or invite new ones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#f3f4f6] shrink-0">
              {(["add", "invite"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[13px] font-normal transition-all border-b-2 ${activeTab === tab
                    ? "border-[#6c5ce7] text-[#6c5ce7]"
                    : "border-transparent text-[#6b7280] hover:text-[#374151]"
                    }`}>
                  {tab === "add" ? "Existing Users" : "Invite External"}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === "add" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-normal text-[#6b7280]">Select User</label>
                    <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[#e2e5ea] bg-[#f9fafb] hover:bg-white hover:border-[#6c5ce7] transition-all text-left">
                          {selectedUser ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-[11px] shrink-0">
                                {(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[13px] text-[#374151]">{selectedUser.name || selectedUser.email}</p>
                                <p className="text-[11px] text-[#9ca3af]">{selectedUser.email}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#9ca3af]">Select a user...</span>
                          )}
                          <ChevronsUpDown className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border border-[#e2e5ea] shadow-lg rounded-xl" align="start">
                        <Command>
                          <CommandInput placeholder="Search team members..." className="text-[13px]" />
                          <CommandList>
                            <CommandEmpty className="text-[13px] text-[#9ca3af] py-4 text-center">No user found.</CommandEmpty>
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
                                    className="cursor-pointer px-3 py-2.5">
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-[11px] shrink-0">
                                          {(u.name || u.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="text-[13px] text-[#374151]">{u.name || u.email}</p>
                                          <p className="text-[11px] text-[#9ca3af]">{u.email}</p>
                                        </div>
                                      </div>
                                      <div className={cn(
                                        "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                                        isSelected ? "border-[#6c5ce7] bg-[#6c5ce7]" : "border-[#e2e5ea] bg-white"
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

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-normal text-[#6b7280]">Role <span className="text-red-400">*</span></label>
                    <select
                      className="w-full px-3 py-2.5 rounded-lg border border-[#e2e5ea] text-[13px] text-[#374151] bg-[#f9fafb] focus:outline-none focus:border-[#6c5ce7] focus:bg-white transition-all"
                      value={selectedRole?.code || ""}
                      onChange={(e) => {
                        const role = roles.find((r) => r.code === e.target.value);
                        setSelectedRole(role || null);
                      }}>
                      <option value="">Select a role…</option>
                      {roles.map((r) => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-normal text-[#6b7280] mb-1.5">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#e2e5ea] text-[13px] text-[#374151] bg-[#f9fafb] focus:outline-none focus:border-[#6c5ce7] focus:bg-white transition-all"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-normal text-[#6b7280] mb-1.5">Email Address <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#e2e5ea] text-[13px] text-[#374151] bg-[#f9fafb] focus:outline-none focus:border-[#6c5ce7] focus:bg-white transition-all"
                        placeholder="e.g. john@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-normal text-[#6b7280] mb-1.5">Role <span className="text-red-400">*</span></label>
                    <select
                      className="w-full px-3 py-2.5 rounded-lg border border-[#e2e5ea] text-[13px] text-[#374151] bg-[#f9fafb] focus:outline-none focus:border-[#6c5ce7] focus:bg-white transition-all"
                      value={selectedRole?.code || ""}
                      onChange={(e) => {
                        const role = roles.find((r) => r.code === e.target.value);
                        setSelectedRole(role || null);
                      }}>
                      <option value="">Select a role…</option>
                      {roles.map((r) => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#f9fafb] border-t border-[#f3f4f6] shrink-0">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6] transition-all">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={
                  isSubmitting ||
                  !selectedRole ||
                  (activeTab === "add" ? !selectedUser : !inviteEmail || !inviteName)
                }
                className="px-5 py-2 rounded-lg text-[13px] text-white font-normal flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ background: "linear-gradient(135deg, #6c5ce7, #5a4bd1)" }}>
                {isSubmitting ? (
                  activeTab === "add" ? "Adding..." : "Inviting..."
                ) : activeTab === "add" ? (
                  <><Check className="w-3.5 h-3.5" /> Add Member</>
                ) : (
                  <><Mail className="w-3.5 h-3.5" /> Send Invite</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <CategoryBadge category={member.roleName === 'CLIENT' ? 'Client' : member?.roleName == 'ARCH' ? 'Architect' : member.roleName || "N/A"} />
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
