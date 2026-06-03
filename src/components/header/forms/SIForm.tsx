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
import useFetch from "@/hooks/useFetch";
import { TaskMetaFields, applyMetaToTask, type TaskMetaValue } from "./TaskMetaFields";
import { registerS3TaskAttachment } from "@/lib/Api";
import { useS3Upload } from "@/hooks/useS3Upload";
import { S3AttachmentSection } from "@/components/S3AttachmentSection";
import { format } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Link2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const initialValues = {
  title: "",
  discipline: "",
  instruction: "",
  location: "",
  urgency: "",
  dueDate: undefined as Date | undefined,
  // Werner — link this SI to another doc on the project (RFI, VO, IC,
  // claim, GI). Field used to be a free-text "VO Reference" — now it's a
  // task picker. Storing the picked task's display code (e.g. "RFI-007")
  // keeps the backend payload unchanged.
  taskReference: "",
};

export default function SIForm({ setOpen, initialStatus }: any) {
  const [formData, setFormData] = useState(initialValues);
  // Werner spec rev H — shared To / CC meta. Date Required is already
  // handled by the existing dueDate field on this form so we hide it
  // in the shared component.
  const [meta, setMeta] = useState<TaskMetaValue>({ to: [], cc: [], dateRequired: "" });

  const [loading, setLoading] = useState(false);
  const s3Upload = useS3Upload("task-attachments/pending");

  // ── Task Reference picker ──────────────────────────────────────────
  // Loads all tasks on the current project so the user can link this
  // SI to any RFI / SI / VO / IC / Claim / GI. Replaces the old free-
  // text "VO Reference" input.
  const projectIdLs =
    typeof window !== "undefined"
      ? localStorage.getItem("selectedProjectId") || ""
      : "";
  const { data: projectTasksData } = useFetch<{ tasks?: any[] }>(
    projectIdLs ? `projects/${projectIdLs}/tasks/` : "",
    { enabled: !!projectIdLs },
  );
  // The /projects/<id>/tasks/ response nests entity data under `.task`
  // and uses camelCase number fields per type (rfiNumber / siNumber /
  // voNumber / giNumber / icNumber / dcNumber). Mirrors the transform
  // in Task.tsx so this picker shows the same canonical doc identifiers
  // the kanban board does.
  const taskOptions = (projectTasksData?.tasks || [])
    .map((t: any) => {
      const inner = t.task || {};
      const apiType = (t.taskType || "").toString().toUpperCase();
      const type = apiType === "CRITICALPATHITEM" ? "CPI" : apiType;
      const number =
        inner.rfiNumber ||
        inner.siNumber ||
        inner.voNumber ||
        inner.giNumber ||
        inner.icNumber ||
        inner.dcNumber ||
        inner.rfi_number ||
        inner.si_number ||
        inner.vo_number ||
        inner.gi_number ||
        inner.ic_number ||
        inner.dc_number ||
        "";
      const code =
        number ||
        (type && (t.taskId || t.id)
          ? `${type}-${String(t.taskId || t.id).padStart(3, "0")}`
          : "");
      const subject =
        inner.subject ||
        inner.title ||
        inner.taskActivityName ||
        "";
      if (!code) return null;
      return {
        id: String(t.id ?? t.taskId ?? code),
        type,
        code,
        subject,
      };
    })
    .filter(Boolean) as Array<{ id: string; type: string; code: string; subject: string }>;
  const [taskRefOpen, setTaskRefOpen] = useState(false);
  const [taskRefSearch, setTaskRefSearch] = useState("");
  const [taskRefTypeFilter, setTaskRefTypeFilter] = useState<string>("ALL");
  const TYPE_FILTERS = ["ALL", "VO", "RFI", "SI", "DC", "CPI"];
  const filteredTaskOptions = taskOptions.filter((opt) => {
    if (taskRefTypeFilter !== "ALL" && opt.type !== taskRefTypeFilter) return false;
    if (!taskRefSearch.trim()) return true;
    const q = taskRefSearch.trim().toLowerCase();
    return (
      opt.code.toLowerCase().includes(q) ||
      opt.subject.toLowerCase().includes(q)
    );
  });

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();
  const { mutateAsync: patchRequest } = usePatch();

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const registerAttachments = async (siId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        try {
          await registerS3TaskAttachment("site-instructions", siId, { file_name: entry.file.name, s3_key: key });
        } catch {
          toast.error(`Failed to register ${entry.file.name}`);
        }
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      toast.error("No project selected. Please select a project from the sidebar.");
      return;
    }

    setLoading(true);

    // Construct payload matching Django SI API requirements
    const payload = {
      project: parseInt(projectId),
      title: formData.title,
      discipline: formData.discipline || undefined,
      instruction: formData.instruction,
      location: formData.location || undefined,
      urgency: formData.urgency || "Normal",
      due_date: formData.dueDate ? format(formData.dueDate, "yyyy-MM-dd") : undefined,
      // Backend field name kept as vo_reference for backwards compat.
      // Frontend label was renamed to "Task Reference" and the picker
      // now accepts any project task type, not just VOs.
      vo_reference: formData.taskReference || undefined,
      taskStatus: initialStatus || "Open",
    };

    const handleSuccess = async (result: any) => {
      // Werner spec rev H — apply To / CC to the auto-created Task wrapper.
      const taskId = result?.task?.id || result?.taskId;
      if (taskId) {
        await applyMetaToTask(taskId, meta, patchRequest);
      }
      // Create channel after SI is created
      console.log("SI created:", result);
      try {
        await postRequest({
          url: "channels/",
          data: {
            project: parseInt(projectId),
            taskId: result?.task?.id,
            taskType: result?.task?.taskType,
            name: formData.title,
            description: formData.instruction,
            channel_type: "public"
          }
        });
      } catch (error) {
        console.error("Error creating channel:", error);
      }

      if (s3Upload.entries.length > 0 && result?._id) {
        await registerAttachments(result._id);
        toast.success("SI created with attachments!");
      } else {
        toast.success("SI created successfully");
      }

      // Refetch SIs, tasks, and channels to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["sis"] });
      await queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });

      setOpen(false);
      setLoading(false);
    };

    const handleError = (err: any) => {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error creating SI";
      toast.error(errorMessage);
      setLoading(false);
    };

    try {
      const result = await postRequest({
        url: "tasks/site-instructions/",
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
          placeholder="Instruction title"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />
      </div>

      <div>
        <Label>Discipline</Label>
        <Select value={formData.discipline} onValueChange={(val) => handleChange("discipline", val)}>
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

      <div>
        <Label>Instruction</Label>
        <Textarea
          className="mt-1"
          rows={6}
          placeholder="Write instruction"
          value={formData.instruction}
          onChange={(e) => handleChange("instruction", e.target.value)}
        />
      </div>

      <div>
        <Label>Location</Label>
        <Input
          className="mt-1"
          placeholder="Location"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
        />
      </div>

      <div>
        <Label>Urgency</Label>
        <Select
          value={formData.urgency}
          onValueChange={(val) => handleChange("urgency", val)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Werner spec rev H — To / CC pickers (SI form already has its
          own Due Date field below, so we hide ours). */}
      <TaskMetaFields
        value={meta}
        onChange={setMeta}
        toLabel="To (contractor)"
        showDateRequired={false}
      />

      <div>
        <Label className="block mb-1">Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !formData.dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.dueDate ? (
                format(formData.dueDate, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white" align="start">
            <Calendar
              mode="single"
              selected={formData.dueDate}
              onSelect={(date) => handleChange("dueDate", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label>Task Reference</Label>
        <Popover open={taskRefOpen} onOpenChange={setTaskRefOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "mt-1 w-full justify-between font-normal",
                !formData.taskReference && "text-muted-foreground",
              )}
            >
              <span className="truncate">
                {formData.taskReference || "Select a task (optional)"}
              </span>
              {formData.taskReference ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear task reference"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChange("taskReference", "");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleChange("taskReference", "");
                    }
                  }}
                  className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              ) : (
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="p-3 bg-white"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={taskRefSearch}
                onChange={(e) => setTaskRefSearch(e.target.value)}
                placeholder="Search VOs, RFIs, or other documents…"
                className="pl-9"
              />
            </div>

            {/* Type filter chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {TYPE_FILTERS.map((t) => {
                const isActive = taskRefTypeFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTaskRefTypeFilter(t)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      isActive
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white border-border text-foreground hover:bg-muted",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Task list */}
            <div className="mt-3 max-h-72 overflow-y-auto -mx-1 px-1 space-y-1.5">
              {filteredTaskOptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {taskOptions.length === 0
                    ? "No tasks on this project yet"
                    : "No tasks match"}
                </p>
              )}
              {filteredTaskOptions.map((opt) => {
                const isSelected = formData.taskReference === opt.code;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      handleChange("taskReference", opt.code);
                      setTaskRefOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                      isSelected
                        ? "bg-primary/[0.06] border-primary"
                        : "bg-white border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="shrink-0 w-9 h-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {opt.code}
                      </span>
                      {opt.subject && (
                        <span className="block text-xs text-muted-foreground truncate">
                          {opt.subject}
                        </span>
                      )}
                    </span>
                    {/* Radio indicator */}
                    <span
                      className={cn(
                        "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? "border-primary"
                          : "border-border bg-background",
                      )}
                    >
                      {isSelected && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <S3AttachmentSection s3Upload={s3Upload} inputId="si-upload" label="Attachments" />

      </div>
      <div className="flex justify-end gap-2 py-4 border-t shrink-0 bg-white">
        <Button variant="outline" onClick={() => setOpen(false)} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create SI"}
        </Button>
      </div>
    </form>
  );
}

