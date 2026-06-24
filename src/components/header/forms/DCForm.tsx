"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CAUSE_CATEGORY_OPTIONS = [
  { value: "Consultant Delay", label: "Consultant Delay" },
  { value: "Material Delay", label: "Material Delay" },
  { value: "Weather", label: "Weather" },
  { value: "Labor Shortage", label: "Labor Shortage" },
  { value: "Permit Delay", label: "Permit Delay" },
  { value: "Design Change", label: "Design Change" },
  { value: "Other", label: "Other" },
];
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { registerS3TaskAttachment } from "@/lib/Api";
import { TaskMetaFields, applyMetaToTask, type TaskMetaValue } from "./TaskMetaFields";
import { useS3Upload } from "@/hooks/useS3Upload";
import { S3AttachmentSection } from "@/components/S3AttachmentSection";
import { loadTaskDraft, clearTaskDraft, useTaskDraftAutosave } from "@/lib/taskDrafts";

const DRAFT_TYPE = "DC";

export default function DCForm({ setOpen, initialStatus, initialData, taskId }: any) {
  // Draft auto-fill is create-mode only — never restore/save while editing.
  const draftEnabled = !taskId && !initialData;
  const draft = draftEnabled ? loadTaskDraft(DRAFT_TYPE) : null;

  const [title, setTitle] = useState(draft?.title || "");
  const [causeCategory, setCauseCategory] = useState(draft?.causeCategory || "");
  const [costImpact, setCostImpact] = useState(draft?.costImpact || "");
  const [description, setDescription] = useState(draft?.description || "");
  const [requestedExtension, setRequestedExtension] = useState(draft?.requestedExtension || "");

  // Werner spec rev H — shared To / CC / Date Required.
  const [meta, setMeta] = useState<TaskMetaValue>(
    draft?.meta ?? { to: [], cc: [], dateRequired: "" }
  );

  // Keep the draft in sync so "minimize" can restore it later.
  useTaskDraftAutosave(DRAFT_TYPE, draftEnabled, {
    title,
    causeCategory,
    costImpact,
    description,
    requestedExtension,
    meta,
  });

  const [loading, setLoading] = useState(false);
  const s3Upload = useS3Upload("task-attachments/pending");

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();
  const { mutateAsync: patchRequest } = usePatch();

  const registerAttachments = async (dcId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        try {
          await registerS3TaskAttachment("delay-claims", dcId, { file_name: entry.file.name, s3_key: key });
        } catch {
          toast.error(`Failed to register ${entry.file.name}`);
        }
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      toast.error("No project selected. Please select a project from the sidebar.");
      return;
    }

    setLoading(true);

    // Get user ID for submitted_by
    const user = localStorage.getItem("user");
    const parsedUser = user ? JSON.parse(user) : null;

    // Construct payload matching Django DC API requirements
    const payload = {
      project: parseInt(projectId),
      title: title,
      cause_category: causeCategory || undefined,
      description: description || undefined,
      estimated_cost_impact: costImpact || undefined,
      estimated_cost_currency: "ZAR",
      requested_extension_days: requestedExtension ? parseInt(requestedExtension) : undefined,
      taskStatus: initialStatus || "Draft",
      submitted_by: parsedUser?.id || undefined,
    };

    const handleSuccess = async (result: any) => {
      // Werner spec rev H — apply To / CC / Date Required to the Task wrapper.
      const taskId = result?.task?.id || result?.taskId;
      if (taskId) {
        await applyMetaToTask(taskId, meta, patchRequest);
      }
      // NOTE: the discussion channel is created by the backend automatically
      // when the task is created (tasks auto-create one PUBLIC channel named
      // after the reference number, e.g. DC-001). Do NOT create one here too —
      // doing so produced a duplicate channel per task in the Communications feed.

      if (s3Upload.entries.length > 0 && result?._id) {
        await registerAttachments(result._id);
        toast.success("DC created with attachments!");
      } else {
        toast.success("DC created successfully");
      }

      // Refetch DCs, tasks, and channels to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["dcs"] });
      await queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });

      if (draftEnabled) clearTaskDraft(DRAFT_TYPE);
      setOpen(false);
      setLoading(false);
    };

    const handleError = (err: any) => {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error creating DC";
      toast.error(errorMessage);
      setLoading(false);
    };

    try {
      const result = await postRequest({
        url: "tasks/delay-claims/",
        data: payload
      });
      await handleSuccess(result);
    } catch (err: any) {
      handleError(err);
    }
  };

  return (
    <form className="flex flex-col h-full" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto space-y-4 py-6">
      <div>
        <Label>Title</Label>
        <Input
          className="mt-1"
          placeholder="Delay Claim Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* <div>
        <Label>Cause Category</Label>
        <Input
          className="mt-1"
          placeholder="Cause category"
          value={causeCategory}
          onChange={(e) => setCauseCategory(e.target.value)}
        />
      </div> */}

      <div>
        <Label>Cause Category</Label>
        <Select value={causeCategory || undefined} onValueChange={setCauseCategory}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select cause category" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {CAUSE_CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Cost Impact</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
          <Input
            placeholder="0"
            className="pl-7"
            value={
              costImpact === ""
                ? ""
                : !isNaN(Number(costImpact))
                  ? Number(costImpact).toLocaleString()
                  : costImpact
            }
            onChange={(e) => {
              const val = e.target.value.replace(/,/g, "").replace(/R\s?/, "");
              if (val === "" || !isNaN(Number(val))) {
                setCostImpact(val);
              }
            }}
          />
        </div>
      </div>

      {/* Werner spec rev H — To / CC / Date Required. */}
      <TaskMetaFields value={meta} onChange={setMeta} toLabel="To (PM)" />

      <div>
        <Label>Description</Label>
        <Textarea
          className="mt-1"
          rows={6}
          placeholder="Write details"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label>Requested Extension (Days)</Label>
        <Input
          className="mt-1"
          type="number"
          min={1}
          max={31}
          placeholder="1-31 days"
          value={requestedExtension || ""}
          onChange={(e) => setRequestedExtension(e.target.value)}
        />
      </div>

      <S3AttachmentSection s3Upload={s3Upload} inputId="dc-upload" label="Attachments" />

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
          {loading ? "Creating..." : "Create DC"}
        </Button>
      </div>
    </form>
  );
}

