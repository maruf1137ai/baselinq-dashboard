import React, { useState } from "react";
import { Category, LedgerEntry } from "../finance/costLadger";
import { MoreHorizontal, ChevronsUpDown, Check } from "lucide-react";
import useFetch from "@/hooks/useFetch";
import { cn } from "@/lib/utils";
import { postData, deleteData, patchData } from "@/lib/Api";
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
import FilterBtns from "./filterBtns";

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
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RolesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Role[];
}

interface TeamMember {
  _id: string;
  projectId: string;
  userId: string;
  user: User;
  roleName: string;
  roleId: string;
  roleInfo: Role;
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
          roleId: selectedRole.id,
        },
      });
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
          <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <MoreHorizontal className="w-5 h-5" />
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
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role for this team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Information - Read Only */}
            <div className="space-y-2">
              <Label>Team Member</Label>
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {member.user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Select Role</Label>
              <Select
                value={selectedRole?.id?.toString()}
                onValueChange={(value) => {
                  const role = roles.find((r) => r.id.toString() === value);
                  setSelectedRole(role || null);
                }}>
                <SelectTrigger>
                  <SelectValue placeholder={member.roleName || "Select a role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-500">
              Current role: <span className="font-medium">{member.roleName}</span>
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
              className="bg-blue-600 hover:bg-blue-700">
              {isUpdating ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Details for {entry.ref}</DialogTitle>
            <DialogDescription>
              Supplier: {entry.supplier} {entry.supplierShort}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <strong>Date:</strong> {entry.date}
            </p>
            <p>
              <strong>Period:</strong> {entry.period}
            </p>
            <p>
              <strong>Net:</strong> {formatCurrency(entry.net)}
            </p>
            <p>
              <strong>Total:</strong> {formatCurrency(entry.total)}
            </p>
            <p>
              <strong>Category:</strong> {entry.category}
            </p>
            <p>
              <strong>Linked VO/PC:</strong> {entry.linkedVO}
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the entry for invoice{" "}
              <strong>{entry.ref}</strong> from{" "}
              <strong>{entry.supplier}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => {
                onDelete(entry.id);
                setShowDeleteDialog(false);
              }}
              className="px-4 py-2 border border-transparent rounded-lg text-sm text-white bg-red-600 hover:bg-red-700">
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </>
  );
};

interface CategoryBadgeProps {
  category: Category | string;
}

const categoryColors: Record<string, string> = {
  [Category?.Electrical]:
    "bg-orange-100 text-orange-800 border border-orange-200",
  [Category?.Structure]: "bg-blue-100 text-blue-800 border border-blue-200",
  [Category?.Plumbing]: "bg-green-100 text-green-800 border border-green-200",
  [Category?.Concrete]: "bg-gray-200 text-gray-800 border border-gray-300",
  [Category?.HVAC]: "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const colorClasses =
    categoryColors[category as string] ||
    "bg-gray-100 text-gray-800 border border-gray-200";

  return (
    <span
      className={`px-4 py-1 inline-flex text-sm leading-5 rounded-full ${colorClasses}`}>
      {category}
    </span>
  );
};

export enum OrderStatus {
  Active = "Active",
  Pending = "Pending",
  Rejected = "Rejected",
}

const StatusBadge: React.FC<{ status: OrderStatus | string }> = ({ status }) => {
  const baseClasses = "px-3 py-1 text-xs rounded-full inline-block";

  if (status === OrderStatus.Active) {
    return (
      <span
        className={`${baseClasses} bg-[#E9F7EC] text-[#16A34A] border border-[rgba(22,163,74,0.34)]`}>
        {status}
      </span>
    );
  }

  if (status === OrderStatus.Pending) {
    return (
      <span
        className={`${baseClasses} bg-[#FFF7ED] text-[#F59E0B] border border-[#FED7AA]`}>
        {status}
      </span>
    );
  }

  // Default to Rejected style
  return (
    <span
      className={`${baseClasses} bg-[#FEE2E2] text-[#DC2626] border border-[#FCA5A5]`}>
      {status}
    </span>
  );
};

// const data = [
//   {
//     id: 1,
//     name: "John Smith",
//     profile: "",
//     email: "john.smith@westfield.com",
//     role: "Project Manager",
//     status: "Active",
//     permissions: ["Finance", "Compliance", "Tasks", "Communication"],
//   },
//   {
//     id: 2,
//     name: "John Smith",
//     profile: "",
//     email: "john.smith@westfield.com",
//     role: "Project Manager",
//     status: "Active",
//     permissions: ["Finance", "Compliance", "Tasks", "Communication"],
//   },
// ];

const TeamMembersTable: React.FC<TeamMembersTableProps> = ({
  entries,
  onDeleteEntry,
}) => {
  const [projectId, setProjectId] = useState(() => localStorage.getItem("selectedProjectId") || "");
  const { data: projectUsersData, isLoading, refetch } = useFetch<ProjectUsersResponse>(
    `projects/${projectId}/team-members/`
  );
  const { data: allUsersData, refetch: refetchAllUsers } = useFetch<UsersResponse>("auth/users/");
  const { data: rolesData, refetch: refetchRoles } = useFetch<RolesResponse>("auth/roles/");

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const teamMembers = projectUsersData?.teamMembers || [];
  const allUsers = allUsersData?.results || [];
  const roles = rolesData || [];

  // Filter out users who are already in the project
  const availableUsers = allUsers.filter(
    (user) => !teamMembers.some((member: TeamMember) => member.user.id === user.id)
  );

  const handleAddMember = async () => {
    if (!selectedUser || !selectedRole) return;

    setIsSubmitting(true);

    try {
      await postData({
        url: `projects/${projectId}/team-members/`,
        data: {
          userId: selectedUser.id,
          roleName: selectedRole.name,
          roleId: selectedRole.id,
        },
      });

      toast.success("Team member added successfully");
      setShowAddMemberModal(false);
      setSelectedUser(null);
      setSelectedRole(null);

      // Refetch project users to update the table
      await refetch();
    } catch (error: any) {
      console.error("Error adding team member:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to add team member. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="top flex items-center gap-2.5 mb-4">
        <input
          type="text"
          className="py-2 px-6 text-base text-[rgba(26,26,26,0.5)] border border-border_color bg-white rounded-[10px] w-full"
          placeholder="Search team members"
        />
        <FilterBtns />
        <Button
          onClick={() => setShowAddMemberModal(true)}
          className="bg-primary text-white border border-border_color text-base !py-3 !px-4 flex items-center gap-0">
          <span className="mr-1">+</span>
          Add members
        </Button>
      </div>

      {/* Add Member Modal */}
      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to your project team by entering their email and assigning a role.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {/* User Selection */}
            <div className="space-y-2">
              <Label>Select User</Label>
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userPopoverOpen}
                    className="w-full justify-between font-normal">
                    {selectedUser ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{selectedUser.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Select a user...
                      </span>
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
                        {availableUsers.map((user) => {
                          const isSelected = selectedUser?.id === user.id;
                          return (
                            <CommandItem
                              key={user.id}
                              value={user.name || user.email}
                              onSelect={() => {
                                setSelectedUser(user);
                                setUserPopoverOpen(false);
                              }}
                              className="cursor-pointer">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                                    {(user.name || user.email).charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {user.name || user.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.email}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                    isSelected
                                      ? "border-primary bg-primary"
                                      : "border-gray-300 bg-white"
                                  )}>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
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

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={selectedRole?.id.toString()}
                onValueChange={(value) => {
                  const role = roles.find((r) => r.id.toString() === value);
                  setSelectedRole(role || null);
                }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={handleAddMember}
              disabled={!selectedUser || !selectedRole || isSubmitting}
              className="px-4 py-2 border border-transparent rounded-lg text-sm text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? "Adding..." : "Add Member"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-gray-200">
        <div className="overflow-x-auto no-scrollbar">
          <table className="divide-y divide-gray-200 w-full">
            <thead className="bg-gray-50/70">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Role",
                  "Permissions",
                  "Status",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={`px-6 py-4 text-left text-sm text-[#6B7280] font-normal uppercase ${header === "Actions" ? "text-center" : ""
                      }`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamMembers.map((member: TeamMember) => (
                <tr
                  key={member._id}
                  className="hover:bg-gray-50/50 transition-colors duration-150 text-[#1A1A1A]">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#1A1A1A] h">
                    <div className="my-auto flex items-center gap-5 capitalize">
                      {/* {member.user.profile ? (
                        <img
                          src={member.user.profile}
                          alt=""
                          className="h-[37px] w-[37px] rounded-full"
                        />
                      ) : (
                        <div className="h-[37px] w-[37px] rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium uppercase">
                          {member.user.name?.charAt(0) || "?"}
                        </div>
                      )} */}
                      <div className="h-[37px] w-[37px] rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium uppercase">
                        {member.user.name?.charAt(0) || "?"}
                      </div>
                      {member.user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                    <div>{member.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <CategoryBadge category={member.roleName || "N/A"} />
                  </td>
                  {/* Permissions column - commented out as data not available in API */}
                  <td className="px-6 py-4 whitespace-nowrap text-base flex flex-wrap gap-1">
                    {(member.user as any)?.permissions ? (member.user as any)?.permissions?.map((permission: string) => (
                      <div key={permission} className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                        {permission}
                      </div>
                    )) : "N/A"}
                    {/* <div className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                      Finance
                    </div>
                    <div className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                      Finance
                    </div>
                    <div className="text-xs text-[#0033FF] py-[2px] px-2 rounded-[4px] bg-[#EFF6FF]">
                      Finance
                    </div> */}
                  </td>
                  {/* Status column - commented out as data not available in API */}
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <StatusBadge status={(member.user as any)?.is_active ? "Active" : "Rejected"} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center">
                    <ActionsCell member={member} projectId={projectId} onRefetch={refetch} onRefetchRoles={refetchRoles} roles={roles} />
                  </td>
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
