"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { uploadFile } from "@/supabse/api";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";

export default function CPIForm({ setOpen, initialStatus }: any) {
  const [activityName, setActivityName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [predecessors, setPredecessors] = useState("");
  const [successors, setSuccessors] = useState("");
  const [resources, setResources] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);

  const user = localStorage.getItem("user");
  const userObj = user ? JSON.parse(user) : null;
  // console.log(userObj);

  const queryClient = useQueryClient();
  const { mutateAsync: createCPI } = usePost();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAllFiles = async (projectId: string) => {
    if (!selectedFiles.length) return [];
    setUploading(true);
    const uploaded: { name: string; url: string }[] = [];

    for (const file of selectedFiles) {
      try {
        const url = await uploadFile(file, projectId);
        uploaded.push({ name: file.name, url });
      } catch (err) {
        console.error("Error uploading file:", file.name, err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setUploadedFiles(uploaded);
    return uploaded;
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

    try {
      // Construct payload matching Django CPI API requirements
      const payload = {
        project: parseInt(projectId),
        task_activity_name: activityName,
        description: description || undefined,
        duration: duration ? parseInt(duration) : undefined,
        start_date: startDate || undefined,
        finish_date: finishDate || undefined,
        predecessors: predecessors || undefined,
        successors: successors || undefined,
        resources: resources || undefined,
        created_by: userObj?.id || undefined,
      };

      const result = await createCPI({
        url: "tasks/critical-path-items/",
        data: payload
      });

      // Refetch CPIs and tasks to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["cpis"] });

      toast.success("Success! CPI created successfully");

      if (result?.id) {
        console.log("CPI created:", result.id);
      }

      setOpen(false);

    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error creating CPI";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
          rows={3}
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
          <Label>Start Date</Label>
          <Input
            className="mt-1"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Finish Date</Label>
          <Input
            className="mt-1"
            type="date"
            value={finishDate}
            onChange={(e) => setFinishDate(e.target.value)}
          />
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
          rows={3}
          placeholder="Who/what is needed (crew, equipment, materials)"
          value={resources}
          onChange={(e) => setResources(e.target.value)}
        />
      </div>

      {/* Upload Section */}
      <div>
        <Label htmlFor="cpi-upload" className="text-sm text-[#1A1F36]">
          Upload Section
        </Label>
        <input
          type="file"
          id="cpi-upload"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <div
          className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => document.getElementById("cpi-upload")?.click()}>
          <p className="text-sm text-muted-foreground">
            Drag and drop your file here
          </p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
        </div>

        {/* Selected files */}
        {selectedFiles.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex justify-between items-center border p-2 rounded">
                <span className="text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 text-xs hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded files URLs */}
        {uploadedFiles.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {uploadedFiles.map((f, i) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-500 hover:underline">
                {f.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => setOpen(false)} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploading}>
          {loading || uploading ? "Creating..." : "Create CPI"}
        </Button>
      </div>
    </form>
  );
}
