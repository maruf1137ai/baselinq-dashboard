"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function CPIForm({ setOpen, initialStatus }: any) {
  const [activityName, setActivityName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [finishDate, setFinishDate] = useState<Date | undefined>(undefined);
  const [predecessors, setPredecessors] = useState("");
  const [successors, setSuccessors] = useState("");
  const [resources, setResources] = useState("");

  const [loading, setLoading] = useState(false);
  const s3Upload = useS3Upload("task-attachments/pending");

  const user = localStorage.getItem("user");
  const userObj = user ? JSON.parse(user) : null;
  // console.log(userObj);

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();

  const registerAttachments = async (cpiId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        try {
          await registerS3TaskAttachment("critical-path-items", cpiId, { file_name: entry.file.name, s3_key: key });
        } catch {
          toast.error(`Failed to register ${entry.file.name}`);
        }
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName) {
      toast.error("Activity Name is required");
      return;
    }

    const projectId = localStorage.getItem("selectedProjectId");
    if (!projectId) {
      toast.error(
        "No project selected. Please select a project from the sidebar.",
      );
      return;
    }

    setLoading(true);

    // Construct payload matching Django CPI API requirements
    const payload = {
      project: parseInt(projectId),
      task_activity_name: activityName,
      description: description || undefined,
      duration: duration ? parseInt(duration) : undefined,
      start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      finish_date: finishDate ? format(finishDate, "yyyy-MM-dd") : undefined,
      predecessors: predecessors || undefined,
      successors: successors || undefined,
      resources: resources || undefined,
      created_by: userObj?.id || undefined,
    };

    const handleSuccess = async (result: any) => {
      // Create channel after CPI is created
      try {
        await postRequest({
          url: "channels/",
          data: {
            project: parseInt(projectId),
            taskId: result?.task?.id,
            taskType: result?.task?.taskType,
            name: activityName,
            description: description,
            channel_type: "public"
          }
        });
      } catch (error) {
        console.error("Error creating channel:", error);
      }

      if (s3Upload.entries.length > 0 && result?._id) {
        await registerAttachments(result._id);
        toast.success("CPI created with attachments!");
      } else {
        toast.success("CPI created successfully");
      }

      // Refetch CPIs, tasks, and channels to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["cpis"] });
      await queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });

      setOpen(false);
      setLoading(false);
    };

    const handleError = (err: any) => {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error creating CPI";
      toast.error(errorMessage);
      setLoading(false);
    };

    try {
      const result = await postRequest({
        url: "tasks/critical-path-items/",
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
        <Label>Task/Activity Name</Label>
        <Input
          className="mt-1"
          placeholder="What needs to be done"
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          className="mt-1"
          rows={6}
          placeholder="Brief description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label>Duration</Label>
        <Input
          className="mt-1"
          type="number"
          placeholder="Days or weeks"
          value={
            (duration as any) === "0" || (duration as any) === 0 ? "" : duration
          }
          onChange={(e) =>
            setDuration(e.target.value === "" ? "" : e.target.value)
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block mb-1">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !startDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="block mb-1">Finish Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !finishDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {finishDate ? (
                  format(finishDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={finishDate}
                onSelect={setFinishDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label>Predecessors</Label>
        <Input
          className="mt-1"
          placeholder="What tasks must finish before this starts"
          value={predecessors}
          onChange={(e) => setPredecessors(e.target.value)}
        />
      </div>

      <div>
        <Label>Successors</Label>
        <Input
          className="mt-1"
          placeholder="What tasks depend on this finishing"
          value={successors}
          onChange={(e) => setSuccessors(e.target.value)}
        />
      </div>

      <div>
        <Label>Resources</Label>
        <Textarea
          className="mt-1"
          rows={6}
          placeholder="Who/what is needed (crew, equipment, materials)"
          value={resources}
          onChange={(e) => setResources(e.target.value)}
        />
      </div>

      <S3AttachmentSection s3Upload={s3Upload} inputId="cpi-upload" label="Attachments" />

      </div>
      <div className="flex justify-end gap-2 py-4 border-t shrink-0 bg-white">
        <Button variant="outline" onClick={() => setOpen(false)} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create CPI"}
        </Button>
      </div>
    </form>
  );
}
