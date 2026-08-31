/**
 * Deleting a custom role, with its consequences stated before you agree to them.
 *
 * A role is not a standalone object — people hold it, and permission tuning
 * hangs off it. Deleting one without saying so leaves those people resolving to
 * "no role", which denies them everything on that project and reports no error
 * anywhere. So the dialog will not let you confirm until it has loaded who is
 * affected, and when anyone is, it makes you choose what happens to them.
 *
 * The default choice is to move people to another role rather than remove them.
 * Losing a permission is recoverable; being dropped from a project mid-contract
 * is disruptive, and it should take a deliberate second click to cause.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useDeleteRole,
  useRoleHolders,
  type ApiRole,
  type OnHolders,
} from "@/hooks/useRolePermissions";

interface Props {
  role: ApiRole | null;
  /** Every role, so holders can be moved somewhere. */
  roles: ApiRole[];
  onClose: () => void;
  /** Called after a successful delete, so the page can leave the dead role. */
  onDeleted: (deletedId: number) => void;
}

export function DeleteRoleDialog({ role, roles, onClose, onDeleted }: Props) {
  const open = role !== null;
  const { data: holders, isLoading } = useRoleHolders(role?.id ?? null, open);
  const del = useDeleteRole();

  const [mode, setMode] = useState<"reassign" | "remove">("reassign");
  const [targetId, setTargetId] = useState<string>("");

  // Reset every time the dialog opens on a different role, so a choice made
  // about one role never carries silently into another.
  useEffect(() => {
    if (open) {
      setMode("reassign");
      setTargetId("");
    }
  }, [open, role?.id]);

  const affectedNames = holders
    ? Array.from(
        new Set([
          ...holders.accountUsers.map((u) => u.name),
          ...holders.memberships.map((m) => m.name),
        ]),
      )
    : [];
  const affected = affectedNames.length;
  const projectCount = holders
    ? new Set(holders.memberships.map((m) => m.projectId)).size
    : 0;
  const tuning = (holders?.orgOverrides ?? 0) + (holders?.projectOverrides ?? 0);

  const choices = roles.filter((r) => r.id !== role?.id && r.is_active);
  const needsTarget = affected > 0 && mode === "reassign";
  const canConfirm =
    !!role && !isLoading && !del.isPending && (!needsTarget || !!targetId);

  const confirm = async () => {
    if (!role || !canConfirm) return;
    const onHolders: OnHolders =
      affected === 0
        ? { mode: "none" }
        : mode === "reassign"
          ? { mode: "reassign", targetRoleId: Number(targetId) }
          : { mode: "remove" };

    try {
      await del.mutateAsync({ id: role.id, onHolders });
      const moved = roles.find((r) => r.id === Number(targetId));
      toast.success(`Deleted ${role.name}.`, {
        description:
          affected === 0
            ? "Nobody held it."
            : onHolders.mode === "reassign"
              ? `${affected} ${affected === 1 ? "person is" : "people are"} now ${moved?.name ?? "the new role"}.`
              : `${affected} ${affected === 1 ? "person was" : "people were"} removed from their projects.`,
      });
      onDeleted(role.id);
      onClose();
    } catch (e: any) {
      toast.error("Could not delete this role", {
        description:
          e?.response?.data?.detail ?? "Nothing was changed. Try again in a moment.",
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {role?.name}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1.5">
              <p>
                The role is removed from your organisation and disappears from every
                project. This cannot be undone.
              </p>
              {tuning > 0 && (
                <p>
                  {tuning} permission {tuning === 1 ? "override" : "overrides"} set for this
                  role {tuning === 1 ? "is" : "are"} deleted with it.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking who holds this role…
          </div>
        ) : affected === 0 ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            Nobody currently holds this role, so no one is affected.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm dark:border-amber-700/50 dark:bg-amber-950/40">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {affected} {affected === 1 ? "person holds" : "people hold"} this role
                  {projectCount > 0 && (
                    <>
                      {" "}
                      across {projectCount} {projectCount === 1 ? "project" : "projects"}
                    </>
                  )}
                  .
                </p>
                <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Users className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{affectedNames.slice(0, 6).join(", ")}
                    {affected > 6 && ` and ${affected - 6} more`}</span>
                </p>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium text-foreground">
                What should happen to them?
              </legend>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors",
                  mode === "reassign"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="on-holders"
                  className="mt-0.5"
                  checked={mode === "reassign"}
                  onChange={() => setMode("reassign")}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">Move them to another role</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    They stay on their projects and pick up whatever the new role allows.
                  </span>
                  {mode === "reassign" && (
                    <span className="mt-2 block">
                      <Label htmlFor="target-role" className="sr-only">
                        New role
                      </Label>
                      <Select value={targetId} onValueChange={setTargetId}>
                        <SelectTrigger id="target-role" className="h-9">
                          <SelectValue placeholder="Choose the role to move them to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {choices.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name}
                              {!r.is_system && " (custom)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </span>
                  )}
                </span>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-sm transition-colors",
                  mode === "remove"
                    ? "border-red-400 bg-red-50 dark:border-red-800/60 dark:bg-red-950/30"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="on-holders"
                  className="mt-0.5"
                  checked={mode === "remove"}
                  onChange={() => setMode("remove")}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">Remove them from their projects</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    They lose access to {projectCount === 1 ? "that project" : "those projects"}{" "}
                    entirely, including anything already assigned to them.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={del.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={!canConfirm}
            title={
              needsTarget && !targetId ? "Choose a role to move them to first" : undefined
            }
          >
            {del.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {affected === 0
              ? "Delete role"
              : mode === "reassign"
                ? "Move and delete"
                : "Remove and delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
