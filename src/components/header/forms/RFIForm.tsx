"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addNewTask, uploadFile } from "@/supabse/api";
import { toast } from "sonner";

export default function RFIForm({ setOpen, initialStatus }: any) {
  const [subject, setSubject] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [question, setQuestion] = useState("");

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
      toast.success("Success! RFI created successfully");
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Error! Try again");
      console.error("Error creating RFI:", error);
    },
  });

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
      const files = await uploadAllFiles(projectId);

      const randomTime = Math.floor(Math.random() * 30) + 1;
      const randomCost = Math.floor(Math.random() * 900000) + 100000;
      const randomScore = Math.floor(Math.random() * 100) + 1;

      const payload = {
        project_id: projectId,
        title: subject,
        type: "RFI",
        status: initialStatus || "Todo",
        priority: "Medium",
        Discipline: discipline,
        Question: question,
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
      toast.error("Error creating RFI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label>Subject</Label>
        <Input
          placeholder="Enter subject"
          className="mt-1"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <Label>Discipline</Label>
        <Input
          placeholder="Enter discipline"
          className="mt-1"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
        />
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

