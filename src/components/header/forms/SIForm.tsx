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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addNewTask, uploadFile } from "@/supabse/api";
import { toast } from "sonner";

const initialValues = {
  title: "",
  discipline: "",
  instruction: "",
  location: "",
  urgency: "",
  dueDate: "",
  voReference: "",
  costImpact: "",
};

export default function SIForm({ setOpen, initialStatus }: any) {
  const [formData, setFormData] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);

  const queryClient = useQueryClient();

  const { mutateAsync } = useMutation({
    mutationFn: (newTask: any) => addNewTask({ newTask }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task"] });
      toast.success("Success! SI created successfully");
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Error! Try again");
      console.error("Error creating SI:", error);
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

    try {
      const files = await uploadAllFiles(projectId);

      const formatUrgency = (u: string) => u ? u.charAt(0).toUpperCase() + u.slice(1) : "Medium";

      const randomTime = Math.floor(Math.random() * 30) + 1;
      const randomCost = Math.floor(Math.random() * 900000) + 100000;
      const randomScore = Math.floor(Math.random() * 100) + 1;

      const payload = {
        project_id: projectId,
        title: formData.title,
        type: "SI",
        status: initialStatus || "Todo",
        priority: "Medium",
        Discipline: formData.discipline,
        Instruction: formData.instruction,
        Location: formData.location,
        Urgency: formatUrgency(formData.urgency),
        due_date: formData.dueDate || null,
        "VO Reference": formData.voReference,
        Cost: formData.costImpact,
        description: files.length > 0 ? `Attachments: ${JSON.stringify(files)}` : "",
        impact: {
          time_impact: randomTime.toString(),
          cost_impact: randomCost.toString(),
          score: `${randomScore}/100`
        },
      };

      await mutateAsync(payload);
    } catch (err) {
      console.error(err);
      toast.error("Error creating SI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
        <Input
          className="mt-1"
          placeholder="Discipline"
          value={formData.discipline}
          onChange={(e) => handleChange("discipline", e.target.value)}
        />
      </div>

      <div>
        <Label>Instruction</Label>
        <Textarea
          className="mt-1"
          rows={4}
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
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Due Date</Label>
        <Input
          type="date"
          className="mt-1"
          value={formData.dueDate}
          onChange={(e) => handleChange("dueDate", e.target.value)}
        />
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

      {/* Upload Section */}
      <div>
        <Label htmlFor="si-upload" className="text-sm text-[#1A1F36]">
          Upload Section
        </Label>
        <input
          type="file"
          id="si-upload"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <div
          className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => document.getElementById("si-upload")?.click()}>
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
          {loading || uploading ? "Creating..." : "Create SI"}
        </Button>
      </div>
    </form>
  );
}

