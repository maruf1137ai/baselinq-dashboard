import React, { useState, useEffect } from "react";
import { MoreHorizontal, User as UserIcon, Mail, X, Check, Trash2, Shield, Plus, Clock } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fetchData, postData, deleteData, patchData } from "@/lib/Api";
import { toast } from "sonner";
import { AwesomeLoader } from "../commons/AwesomeLoader";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "@/lib/utils";

interface OrgUser {
  id: number;
  name: string;
  email: string;
  role: string | null;
  role_code: string | null;
}

interface PendingInvitation {
  id: number;
  email: string;
  name: string;
  position: string;
  invited_at: string;
  expires_at: string;
}

interface OrgUsersResponse {
  // NOTE: field name 'members' stays to match the backend response shape.
  // Will be renamed to 'users' in PR #2 alongside the backend change.
  members: OrgUser[];
  pending_invitations: PendingInvitation[];
}

interface Role {
  id: number;
  name: string;
  code: string;
}

const OrgUsersTable = () => {
  const { data: user } = useCurrentUser();
  const [data, setData] = useState<OrgUsersResponse | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelInviteDialog, setShowCancelInviteDialog] = useState(false);

  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<PendingInvitation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", position: "" });
  const [editForm, setEditForm] = useState({ role_code: "" });

  const isOrgOwner = user?.account_type === "organisation";

  const fetchUsers = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetchData("auth/organization/members/");
      setData(res);
    } catch (error) {
      console.error("Error fetching org members:", error);
      toast.error("Failed to load organization users");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetchData("auth/roles/");
      setRoles(res || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.position) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      await postData({
        url: "auth/organization/members/invite/",
        data: inviteForm,
      });
      toast.success("Invitation sent successfully");
      setShowInviteModal(false);
      setInviteForm({ name: "", email: "", position: "" });
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !editForm.role_code) return;
    setIsSubmitting(true);
    try {
      await patchData({
        url: `auth/users/${selectedUser.id}/`,
        data: { role: editForm.role_code },
      });
      toast.success("User role updated");
      setShowEditModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await deleteData({
        url: `auth/organization/members/${selectedUser.id}/`,
        data: undefined,
      });
      toast.success("User removed from organization");
      setShowDeleteDialog(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to remove user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async () => {
    if (!selectedInvite) return;
    setIsSubmitting(true);
    try {
      await deleteData({
        url: `auth/organization/invitations/${selectedInvite.id}/`,
        data: undefined,
      });
      toast.success("Invitation cancelled");
      setShowCancelInviteDialog(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to cancel invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AwesomeLoader message="Loading organization team..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-normal text-foreground">Organization Team</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your organization's users and pending invitations.
          </p>
        </div>
        {isOrgOwner && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-primary text-white hover:bg-primary/90 flex items-center gap-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* ── Users Table ── */}
      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-normal text-muted-foreground uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[11px] font-normal text-muted-foreground uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[11px] font-normal text-muted-foreground uppercase tracking-widest">Status</th>
                {isOrgOwner && <th className="px-6 py-4 text-right"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Current User Row */}
              <tr className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-normal">
                      {(user?.name || user?.email || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-normal text-foreground leading-none">{user?.name || "You"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{user?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[11px] text-muted-foreground border border-border">
                    {user?.role?.name || (user?.account_type === 'organisation' ? 'Organization Owner' : 'User')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-green-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active (You)
                  </span>
                </td>
                {isOrgOwner && <td className="px-6 py-4 text-right"></td>}
              </tr>

              {/* Other Users */}
              {data?.members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-normal">
                        {(member.name || member.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-normal text-foreground leading-none">{member.name || member.email.split('@')[0]}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[11px] text-muted-foreground border border-border">
                      {member.role || "User"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-green-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  </td>
                  {isOrgOwner && (
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(member);
                            setEditForm({ role_code: member.role_code || "" });
                            setShowEditModal(true);
                          }}>
                            <Shield className="w-3.5 h-3.5 mr-2" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(member);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}

              {/* Pending Invitations */}
              {data?.pending_invitations.map((invite) => (
                <tr key={invite.id} className="bg-slate-50/20 hover:bg-slate-50/40 transition-colors italic">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 opacity-70">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 border-dashed flex items-center justify-center text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-normal text-foreground leading-none">{invite.name || "Invited User"}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{invite.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 opacity-70">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-[11px] text-muted-foreground border border-border border-dashed">
                      {roles.find(r => r.code === invite.position)?.name || invite.position}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600">
                      <Clock className="w-3 h-3" />
                      Pending Invite
                    </span>
                  </td>
                  {isOrgOwner && (
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvite(invite);
                          setShowCancelInviteDialog(true);
                        }}
                        className="text-[11px] text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    </td>
                  )}
                </tr>
              ))}

              {(!data?.members.length && !data?.pending_invitations.length) && (
                <tr>
                  <td colSpan={isOrgOwner ? 4 : 3} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No other users in this organization yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal">Invite Organization User</DialogTitle>
            <DialogDescription className="text-xs">
              Send an invitation to join your organization on Baselinq.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name" className="text-[11px] uppercase tracking-wider text-muted-foreground ml-0.5">Contact Name</Label>
              <Input
                id="invite-name"
                placeholder="Full name (optional)"
                className="h-10 rounded-lg text-sm border-border"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-[11px] uppercase tracking-wider text-muted-foreground ml-0.5">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@company.com"
                className="h-10 rounded-lg text-sm border-border"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role" className="text-[11px] uppercase tracking-wider text-muted-foreground ml-0.5">Assigned Role *</Label>
              <Select
                value={inviteForm.position}
                onValueChange={(val) => setInviteForm({ ...inviteForm, position: val })}
              >
                <SelectTrigger className="h-10 rounded-lg text-sm border-border">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {roles.map((role) => (
                    <SelectItem key={role.code} value={role.code}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowInviteModal(false)} className="rounded-lg h-10 px-6">Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={isSubmitting || !inviteForm.email || !inviteForm.position}
              className="bg-primary text-white hover:bg-primary/90 rounded-lg h-10 px-6"
            >
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal">Change User Role</DialogTitle>
            <DialogDescription className="text-xs">
              Update {selectedUser?.name || selectedUser?.email}'s role in the organization.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground ml-0.5">Select New Role</Label>
              <Select
                value={editForm.role_code}
                onValueChange={(val) => setEditForm({ ...editForm, role_code: val })}
              >
                <SelectTrigger className="h-10 rounded-lg text-sm border-border">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {roles.map((role) => (
                    <SelectItem key={role.code} value={role.code}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="rounded-lg h-10 px-6">Cancel</Button>
            <Button
              onClick={handleUpdateRole}
              disabled={isSubmitting}
              className="bg-primary text-white hover:bg-primary/90 rounded-lg h-10 px-6"
            >
              {isSubmitting ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Alert */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal">Remove User?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove {selectedUser?.name || selectedUser?.email} from this organization? They will lose access to all associated projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              disabled={isSubmitting}
              className="bg-red-600 text-white hover:bg-red-700 rounded-lg"
            >
              {isSubmitting ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Alert */}
      <AlertDialog open={showCancelInviteDialog} onOpenChange={setShowCancelInviteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-normal">Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to cancel the invitation sent to {selectedInvite?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="rounded-lg">Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={isSubmitting}
              className="bg-red-600 text-white hover:bg-red-700 rounded-lg"
            >
              {isSubmitting ? "Cancelling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrgUsersTable;
