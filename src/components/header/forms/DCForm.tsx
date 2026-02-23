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
import { X } from "lucide-react";

export default function DCForm({ setOpen, initialStatus }: any) {
  const [title, setTitle] = useState("");
  const [causeCategory, setCauseCategory] = useState("");
  const [costImpact, setCostImpact] = useState("");
  const [description, setDescription] = useState("");
  const [requestedExtension, setRequestedExtension] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (dcId: string | number) => {
    if (!selectedFiles.length) return [];
    setUploading(true);
    const uploaded: { name: string; url: string }[] = [];

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Upload to tasks/delay-claims/{dcId}/attachments/
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}tasks/delay-claims/${dcId}/attachments/`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access')}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        uploaded.push({ name: file.name, url: data.file_url || data.url || '' });
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
      status: initialStatus || "Draft",
      submitted_by: parsedUser?.id || undefined,
    };

    const handleSuccess = async (result: any) => {
      // Create channel after DC is created
      try {
        await postRequest({
          url: "channels/",
          data: {
            project: parseInt(projectId),
            taskId: result?.task?.id,
            taskType: result?.task?.taskType,
            name: title,
            description: description,
            channel_type: "public"
          }
        });
      } catch (error) {
        console.error("Error creating channel:", error);
      }

      // Upload attachments after DC is created
      console.log("DC created:", result?._id);
      if (selectedFiles.length > 0 && result?._id) {
        try {
          await uploadAttachments(result._id);
          toast.success("DC created and files uploaded successfully");
        } catch (error) {
          console.error("Attachment upload error:", error);
          toast.error("DC created but failed to upload attachments");
        }
      } else {
        toast.success("Success! DC created successfully");
      }

      // Refetch DCs, tasks, and channels to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["dcs"] });
      await queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });

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
    <form className="space-y-4" onSubmit={handleSubmit}>
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

      {/* Upload Section */}
      <div>
        <Label htmlFor="dc-upload" className="text-sm text-[#1A1F36]">
          Upload Section
        </Label>
        <input
          type="file"
          id="dc-upload"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <div
          className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => document.getElementById("dc-upload")?.click()}>
          <p className="text-sm text-muted-foreground">
            Drag and drop your file here
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse
          </p>
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
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <X className="h-4 w-4" />
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
          {loading || uploading ? "Creating..." : "Create DC"}
        </Button>
      </div>
    </form>
  );
}

