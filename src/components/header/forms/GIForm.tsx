"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DISCIPLINE_OPTIONS } from "@/data/disciplines";
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
import { loadTaskDraft, clearTaskDraft, useTaskDraftAutosave } from "@/lib/taskDrafts";

const DRAFT_TYPE = "GI";

// Werner rev H p.10: GI is Professional → Professional OR Main Contractor →
// Subcontractor. It never crosses the prof/contractor boundary. The UI
// lets the originator pick which lane this GI lives in; the backend
// rejects any other Direction value.
const GI_DIRECTION_OPTIONS = [
  { value: "prof_to_prof", label: "Professional → Professional" },
  { value: "contractor_to_subcontractor", label: "Main Contractor → Subcontractor" },
] as const;

const initialValues = {
  title: "",
  discipline: "",
  instruction: "",
  direction: "prof_to_prof" as (typeof GI_DIRECTION_OPTIONS)[number]["value"],
};

export default function GIForm({ setOpen, initialStatus, initialData, taskId }: any) {
  // Draft auto-fill is create-mode only — never restore/save while editing.
  const draftEnabled = !taskId && !initialData;
  const draft = draftEnabled ? loadTaskDraft(DRAFT_TYPE) : null;

  const [formData, setFormData] = useState(() =>
    draft?.formData ? { ...initialValues, ...draft.formData } : initialValues
  );
  // Werner spec rev H — shared To / CC / Date Required pickers.
  const [meta, setMeta] = useState<TaskMetaValue>(
    draft?.meta ?? { to: [], cc: [], dateRequired: "" }
  );

  // Keep the draft in sync so "minimize" can restore it later.
  useTaskDraftAutosave(DRAFT_TYPE, draftEnabled, { formData, meta });

  const [loading, setLoading] = useState(false);
  // Werner rev H — attachment upload (required on every doc per spec p.3-15).
  const s3Upload = useS3Upload("task-attachments/pending");

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();
  const { mutateAsync: patchRequest } = usePatch();

  const registerAttachments = async (giId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        try {
          await registerS3TaskAttachment("general-instructions", giId, { file_name: entry.file.name, s3_key: key });
        } catch {
          toast.error(`Failed to register ${entry.file.name}`);
        }
      })
    );
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
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
      // Werner rev H — real POST to the GeneralInstruction endpoint.
      // The view auto-generates the gi_number; we pass the user-chosen
      // direction (prof→prof or contractor→subcontractor).
      const result: any = await postRequest({
        url: "tasks/general-instructions/",
        data: {
          project: parseInt(projectId),
          subject: formData.title,
          description: formData.instruction,
          discipline: formData.discipline || "Other",
          direction: formData.direction,
          date_required: meta.dateRequired || null,
          taskStatus: initialStatus || "Draft",
        },
      });

      // Werner rev H — apply To / CC / Date Required to the Task wrapper
      // (same pattern used by RFI/SI/VO/DC forms).
      const taskId = result?.task?.id || result?.taskId;
      if (taskId) {
        await applyMetaToTask(taskId, meta, patchRequest);
      }

      // Werner rev H — register any uploaded attachments against the
      // new GI (matches the pattern in RFIForm / SIForm).
      if (s3Upload.entries.length > 0 && result?._id) {
        await registerAttachments(result._id);
      }

      // NOTE: the discussion channel is created by the backend automatically
      // when the task is created (tasks auto-create one PUBLIC channel named
      // after the reference number, e.g. GI-001). Do NOT create one here too —
      // doing so produced a duplicate channel per task in the Communications feed.

      toast.success("GI created successfully");
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["gis"] });
      await queryClient.invalidateQueries({
        queryKey: [`channels/?projectId=${projectId}`],
      });
      if (draftEnabled) clearTaskDraft(DRAFT_TYPE);
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error creating GI";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col h-full" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto space-y-4 py-6">
        <div>
          <Label>Subject</Label>
          <Input
            className="mt-1"
            placeholder="General instruction subject"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
        </div>

        {/* Werner rev H p.10 — Direction picker. Never crosses prof↔contractor. */}
        <div>
          <Label>Direction</Label>
          <Select
            value={formData.direction}
            onValueChange={(val) => handleChange("direction", val)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {GI_DIRECTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            GI never crosses the professional / contractor boundary.
          </p>
        </div>

        <div>
          <Label>Discipline</Label>
          <Select
            value={formData.discipline}
            onValueChange={(val) => handleChange("discipline", val)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select discipline" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {DISCIPLINE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Werner spec rev H — To / CC / Date Required pickers. */}
        <TaskMetaFields value={meta} onChange={setMeta} toLabel="To" />

        <div>
          <Label>Instruction</Label>
          <Textarea
            className="mt-1"
            rows={6}
            placeholder="Write general instruction"
            value={formData.instruction}
            onChange={(e) => handleChange("instruction", e.target.value)}
          />
        </div>

        {/* Werner rev H — Attachment upload (spec page 10). */}
        <S3AttachmentSection s3Upload={s3Upload} inputId="gi-upload" label="Attachments" />
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
          {loading ? "Creating..." : "Create GI"}
        </Button>
      </div>
    </form>
  );
}
