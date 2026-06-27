"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { TaskMetaFields, applyMetaToTask, type TaskMetaValue } from "./TaskMetaFields";
import { useS3Upload } from "@/hooks/useS3Upload";
import { S3AttachmentSection } from "@/components/S3AttachmentSection";
import { registerS3TaskAttachment } from "@/lib/Api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { loadTaskDraft, clearTaskDraft, useTaskDraftAutosave } from "@/lib/taskDrafts";

const DRAFT_TYPE = "IC";

/**
 * Werner rev H — Intention to Claim (page 13-14).
 *
 * Preliminary "Notice of Intention to Claim" issued by the contractor
 * to the PM BEFORE a formal Claim. Required fields per Werner spec:
 *   - Subject
 *   - Description of Claim Event
 *   - Deadline date
 *
 * On submit the system creates the IC + auto-channel + notification
 * fan-out. The PM can then assign a risk level (low / medium / high)
 * from the doc page. HIGH risk triggers a broker email.
 */
export default function ICForm({ setOpen, initialStatus, initialData, taskId }: any) {
  // Draft auto-fill is create-mode only — never restore/save while editing.
  const draftEnabled = !taskId && !initialData;
  const draft = draftEnabled ? loadTaskDraft(DRAFT_TYPE) : null;

  const [subject, setSubject] = useState(draft?.subject || "");
  const [description, setDescription] = useState(draft?.description || "");
  const [dateRequired, setDateRequired] = useState(draft?.dateRequired || "");

  // Werner spec rev H — shared To / CC / Date Required strip.
  const [meta, setMeta] = useState<TaskMetaValue>(
    draft?.meta ?? { to: [], cc: [], dateRequired: "" }
  );

  // Keep the draft in sync so "minimize" can restore it later.
  useTaskDraftAutosave(DRAFT_TYPE, draftEnabled, { subject, description, dateRequired, meta });

  const [loading, setLoading] = useState(false);
  // Werner rev H — attachment upload (spec page 13).
  const s3Upload = useS3Upload("task-attachments/pending");

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();
  const { mutateAsync: patchRequest } = usePatch();

  const registerAttachments = async (icId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        try {
          await registerS3TaskAttachment("intentions-to-claim", icId, { file_name: entry.file.name, s3_key: key });
        } catch {
          toast.error(`Failed to register ${entry.file.name}`);
        }
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) {
      toast.error("Subject is required");
      return;
    }

    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      toast.error("No project selected. Please select a project from the sidebar.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        project: parseInt(projectId),
        subject: subject,
        description: description || "",
        date_required: dateRequired || meta.dateRequired || null,
        status: initialStatus || "Sent",
      };

      const result: any = await postRequest({
        url: "tasks/intentions-to-claim/",
        data: payload,
      });

      // Apply To / CC / Date Required to the Task wrapper (matches RFI/SI flow).
      const taskId = result?.task?.id || result?.taskId;
      if (taskId) {
        await applyMetaToTask(taskId, meta, patchRequest);
      }

      // Werner rev H — register uploaded attachments against the new IC.
      if (s3Upload.entries.length > 0 && result?._id) {
        await registerAttachments(result._id);
      }

      // NOTE: the discussion channel is created by the backend automatically
      // when the task is created (tasks auto-create one PUBLIC channel named
      // after the reference number, e.g. IC-001). Do NOT create one here too —
      // doing so produced a duplicate channel per task in the Communications feed.

      toast.success("Intention to Claim created");
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["ics"] });
      await queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });
      if (draftEnabled) clearTaskDraft(DRAFT_TYPE);
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error creating IC";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col h-full" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto space-y-4 py-6">
        <div>
          <Label>Subject *</Label>
          <Input
            className="mt-1"
            placeholder="Brief description of the claim event"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        {/* Werner spec rev H — To / CC / Date Required pickers. */}
        <TaskMetaFields value={meta} onChange={setMeta} toLabel="To (PM)" />

        <div>
          <Label>Deadline / Date Required</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !dateRequired && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRequired
                  ? format(parseISO(dateRequired), "PPP")
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={dateRequired ? parseISO(dateRequired) : undefined}
                onSelect={(d) => setDateRequired(d ? format(d, "yyyy-MM-dd") : "")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-muted-foreground mt-1">
            Date by which the PM must assess the event. Most contracts require
            an IC to be filed within 7-14 days of the event.
          </p>
        </div>

        <div>
          <Label>Description of Claim Event *</Label>
          <Textarea
            className="mt-1"
            rows={6}
            placeholder="Describe the event giving rise to the potential claim (e.g. late drawings, weather, variation order). No detailed substantiation required at this stage."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Werner rev H — Attachment upload (spec page 13). */}
        <S3AttachmentSection s3Upload={s3Upload} inputId="ic-upload" label="Attachments" />
      </div>
      <div className="flex justify-end gap-2 py-4 border-t shrink-0 bg-white">
        <Button
          variant="outline"
          onClick={() => { if (draftEnabled) clearTaskDraft(DRAFT_TYPE); setOpen(false); }}
          type="button"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Intention to Claim"}
        </Button>
      </div>
    </form>
  );
}
