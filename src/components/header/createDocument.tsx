"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addNewTask, uploadFile } from "@/supabse/api";

const btns = [
  "VO - Variation Order",
  "SI - Site Instruction",
  "RFI - Request for Information",
  "DC - Delay Claim",
];

export function CreateDocumentDialog() {
  const [open, setOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [linkedTask, setLinkedTask] = useState("");

  // File states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  // Mutation to create a new task/document
  const { mutateAsync } = useMutation({
    mutationFn: (newTask) => addNewTask({ newTask }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Success! Task added successfully");
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Error! Try again");
      console.error("Error creating task:", error);
    },
  });

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setLinkedTask("");
    setSelectedFiles([]);
    setUploadedFiles([]);
  };

  const handleRequest = (type: string) => {
    setDialogTitle(type);
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload all selected files and return URLs
  const uploadAllFiles = async () => {
    if (!selectedFiles.length) return [];
    setUploading(true);
    const uploaded: { name: string; url: string }[] = [];

    for (const file of selectedFiles) {
      try {
        const url = await uploadFile(file);
        uploaded.push({ name: file.name, url });
        console.log("Uploaded file:", file.name, url);
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
    if (!title) return;

    setLoading(true);

    try {
      const files = await uploadAllFiles(); // upload files first
      const payload = {
        title,
        category,
        linkedTask,
        attachment: files, // send uploaded file info to your task
      };
      console.log(payload);
      await mutateAsync(payload);
    } catch (err) {
      console.error(err);
      toast.error("Error creating document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Dropdown Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <span className="mr-2">+</span>
            New Request
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56">
          {btns.map((btn, i) => (
            <DropdownMenuItem onClick={() => handleRequest(btn)} key={i}>
              {btn}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="max-w-[650px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-[#E5E7EB]">
          <DialogTitle className="text-lg text-[#1A1F36]">
            Create New {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4 px-6 pb-6 pt-6" onSubmit={handleSubmit}>
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm text-[#1A1F36]">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JBCC Principal Building Agreement"
              className="mt-2"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" className="text-sm text-[#1A1F36]">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="mt-2">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linked Task */}
          <div>
            <Label htmlFor="linkedTask" className="text-sm text-[#1A1F36]">
              Linked Task (Optional)
            </Label>
            <Input
              id="linkedTask"
              value={linkedTask}
              onChange={(e) => setLinkedTask(e.target.value)}
              placeholder="Search and select task"
              className="mt-2"
            />
          </div>

          {/* Upload */}
          <div>
            <Label htmlFor="upload" className="text-sm text-[#1A1F36]">
              Upload Section
            </Label>
            <input
              type="file"
              id="upload"
              className="hidden"
              onChange={handleFileChange}
              multiple
            />

            <div
              className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => document.getElementById("upload")?.click()}>
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

          {/* Buttons */}
          <div className="flex items-end justify-end border-t pt-4 mt-4">
            <div className="flex gap-2 items-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading || uploading ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
