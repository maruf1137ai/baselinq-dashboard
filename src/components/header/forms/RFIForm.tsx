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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";
import { uploadFile } from "@/supabse/api";

export default function RFIForm({ setOpen, initialStatus }: any) {
  const [subject, setSubject] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);

  const queryClient = useQueryClient();
  const { mutateAsync: createRFI } = usePost();

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
      // Construct payload matching Django RFI API requirements
      const payload = {
        project: parseInt(projectId),
        subject: subject,
        discipline: discipline || undefined,
        question: question,
        status: initialStatus || "Open",
        description: description,
      };

      const result = await createRFI({
        url: "tasks/requests-for-information/",
        data: payload
      });

      // Refetch RFIs and tasks to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["rfis"] });

      toast.success("Success! RFI created successfully");

      if (result?.id) {
        console.log("RFI created:", result.id);
      }

      setOpen(false);

    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error creating RFI";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label>Subject *</Label>
        <Input
          placeholder="Enter subject"
          className="mt-1"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div>
        <Label>Priority</Label>
        <select
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div>
        <Label>Discipline</Label>
        <Select value={discipline} onValueChange={setDiscipline}>
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
        <Label>Question</Label>
        <Textarea
          rows={4}
          placeholder="Type your question"
          className="mt-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          rows={3}
          placeholder="Additional details"
          className="mt-1"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Upload Section */}
      <div>
        <Label htmlFor="rfi-upload" className="text-sm text-[#1A1F36]">
          Upload Section
        </Label>
        <input
          type="file"
          id="rfi-upload"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <div
          className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => document.getElementById("rfi-upload")?.click()}>
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
          {loading || uploading ? "Creating..." : "Create RFI"}
        </Button>
      </div>
    </form>
  );
}
