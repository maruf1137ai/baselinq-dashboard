/**
 * One dialog for creating, copying and renaming a role.
 *
 * The three are the same form — a name, and for a new role a code — so they
 * share a component rather than three near-identical files that drift. What
 * differs is the copy and which fields are live, and that is worth stating in
 * one place.
 *
 * Codes are derived from the name and shown read-only. They are permanent
 * (renaming a code is a coordination problem, not a UI action), so asking a
 * non-technical admin to invent one is asking them to make a decision they
 * cannot judge and cannot revisit.
 */
import { useEffect, useState } from "react";
import { Copy, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateRole,
  useDuplicateRole,
  useUpdateRole,
  type ApiRole,
} from "@/hooks/useRolePermissions";

export type RoleFormMode = "create" | "duplicate" | "edit";

export interface RoleFormRequest {
  mode: RoleFormMode;
  /** The role being copied or edited. Absent when creating from scratch. */
  role?: ApiRole;
}

/** Role codes are uppercase and underscore-separated; derive rather than ask. */
export function codeFromName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

interface Props {
  request: RoleFormRequest | null;
  onClose: () => void;
  /** Select the resulting role, so the admin lands on what they just made. */
  onDone: (roleId: number) => void;
}

export function RoleFormDialog({ request, onClose, onDone }: Props) {
  const open = request !== null;
  const mode = request?.mode ?? "create";
  const source = request?.role;

  const create = useCreateRole();
  const duplicate = useDuplicateRole();
  const update = useUpdateRole();
  const busy = create.isPending || duplicate.isPending || update.isPending;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Seed from the request each time it opens, so one role's details never
  // linger into a dialog opened on another.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit") {
      setName(source?.name ?? "");
      setDescription(source?.description ?? "");
    } else if (mode === "duplicate") {
      setName(source ? `${source.name} (copy)` : "");
      setDescription("");
    } else {
      setName("");
      setDescription("");
    }
  }, [open, mode, source?.id, source?.name, source?.description]);

  const code = codeFromName(name);
  const nameChanged = mode !== "edit" || name.trim() !== (source?.name ?? "");
  const descChanged = mode === "edit" && description !== (source?.description ?? "");
  const canSubmit =
    name.trim().length > 1 &&
    code.length > 1 &&
    !busy &&
    (mode !== "edit" || nameChanged || descChanged);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      if (mode === "edit" && source) {
        await update.mutateAsync({ id: source.id, name: name.trim(), description });
        toast.success(`Renamed to ${name.trim()}.`);
        onDone(source.id);
      } else if (mode === "duplicate" && source) {
        const copy = await duplicate.mutateAsync({ id: source.id, name: name.trim(), code });
        toast.success(`Created ${name.trim()}.`, {
          description: `Starts with the same ${copy.copiedPermissions} permissions as ${source.name}. Adjust from here.`,
        });
        onDone(copy.id);
      } else {
        const made: any = await create.mutateAsync({ name: name.trim(), code });
        toast.success(`Created ${name.trim()}.`, {
          description: "Starts with nothing granted — switch on what this role needs.",
        });
        if (made?.id) onDone(made.id);
      }
      onClose();
    } catch (e: any) {
      toast.error(
        mode === "edit" ? "Could not rename this role" : "Could not create the role",
        {
          description:
            e?.response?.data?.detail ??
            e?.response?.data?.code?.[0] ??
            e?.response?.data?.name?.[0] ??
            "A role with that name or code may already exist.",
        },
      );
    }
  };

  const Icon = mode === "edit" ? Pencil : mode === "duplicate" ? Copy : Plus;
  const title =
    mode === "edit"
      ? `Rename ${source?.name ?? "role"}`
      : mode === "duplicate"
        ? `Copy ${source?.name ?? "role"}`
        : "New role";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === "duplicate" ? (
              <>
                The copy starts with the same permissions as{" "}
                <strong>{source?.name}</strong>, then you adjust it. Exceptions set on
                individual projects are not copied.
              </>
            ) : mode === "edit" ? (
              <>
                Changes the name everywhere it appears. The role&rsquo;s internal code stays
                the same, so nobody loses access.
              </>
            ) : (
              <>
                Starts with nothing granted. Roles belong to your organisation, so this will
                be available on <strong>every project</strong> — not only this one.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Assistant Quantity Surveyor"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            {mode === "edit" ? (
              <p className="text-xs text-muted-foreground">
                Code stays <span className="font-mono">{source?.code}</span>.
              </p>
            ) : (
              code && (
                <p className="text-xs text-muted-foreground">
                  Code: <span className="font-mono">{code}</span> — used internally and
                  cannot be changed later.
                </p>
              )
            )}
          </div>

          {mode === "edit" && (
            <div className="space-y-1.5">
              <Label htmlFor="role-description">Description</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is for."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {mode === "edit" ? "Save" : mode === "duplicate" ? "Create copy" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
