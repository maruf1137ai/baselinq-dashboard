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

const DISCIPLINE_OPTIONS = [
  "Architectural",
  "Structural",
  "Mechanical",
  "Electrical",
  "Plumbing",
  "Civil",
  "Fire & Safety",
  "Landscape",
  "MEP",
  "Interior",
  "Facade",
  "HVAC",
];
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";
import { registerS3TaskAttachment } from "@/lib/Api";
import { useS3Upload } from "@/hooks/useS3Upload";
import { S3AttachmentSection } from "@/components/S3AttachmentSection";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
  voReference: "",
  costImpact: "",
};

export default function SIForm({ setOpen, initialStatus }: any) {
  const [formData, setFormData] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const s3Upload = useS3Upload("task-attachments/pending");

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();

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
      vo_reference: formData.voReference || undefined,
      expectedCostImpact: formData.costImpact || undefined,
      taskStatus: initialStatus || "Open",
    };

    const handleSuccess = async (result: any) => {
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
        <Label>VO Reference</Label>
        <Input
          className="mt-1"
          placeholder="Optional"
          value={formData.voReference}
          onChange={(e) => handleChange("voReference", e.target.value)}
        />
      </div>

      <div>
        <Label>Expected Cost Impact</Label>
        <Select
          value={formData.costImpact}
          onValueChange={(val) => handleChange("costImpact", val)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0-20k">R 0 - 20K</SelectItem>
            <SelectItem value="20-50k">R 20K - 50K</SelectItem>
            <SelectItem value="50-100k">R 50K - 100K</SelectItem>
            <SelectItem value="above100k">R Above 100K</SelectItem>
          </SelectContent>
        </Select>
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

