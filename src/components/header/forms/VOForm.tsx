"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addNewTask, uploadFile } from "@/supabse/api";
import { toast } from "sonner";

export default function VOForm({ setOpen, initialStatus }: any) {
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([{ description: "", qty: 1, rate: 0 }]);

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
      toast.success("Success! VO created successfully");
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Error! Try again");
      console.error("Error creating VO:", error);
    },
  });

  const addItem = () => {
    setItems([...items, { description: "", qty: 1, rate: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateField = (i: number, field: string, value: any) => {
    const copy = [...items];
    (copy[i] as any)[field] = value;
    setItems(copy);
  };

  const getTotal = (i: number) => (items[i].qty || 0) * (items[i].rate || 0);

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

    try {
      const files = await uploadAllFiles(projectId);

      const totalCostVal = items.reduce((acc, item) => acc + (item.qty || 0) * (item.rate || 0), 0);
      const itemsDetails = items.map(i => `- ${i.description} (x${i.qty}) @ R${i.rate} = R${((i.qty || 0) * (i.rate || 0)).toFixed(2)}`).join("\n");

      const randomTime = Math.floor(Math.random() * 30) + 1;
      const randomCost = Math.floor(Math.random() * 900000) + 100000;
      const randomScore = Math.floor(Math.random() * 100) + 1;

      const fullDescription = `
${description}

Line Items:
${itemsDetails}
Total: R${totalCostVal.toFixed(2)}

${files.length > 0 ? `Attachments: ${JSON.stringify(files)}` : ""}
      `.trim();

      const payload = {
        project_id: projectId,
        title,
        type: "VO",
        status: initialStatus || "Todo",
        priority: "Medium",
        Discipline: discipline,
        Cost: `R${totalCostVal.toFixed(2)}`,
        description: fullDescription,
        impact: {
          time_impact: randomTime.toString(),
          cost_impact: randomCost.toString(),
          score: `${randomScore}/100`
        },
      };

      await mutateAsync(payload);
    } catch (err) {
      console.error(err);
      toast.error("Error creating VO");
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
          placeholder="VO Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <Label>Discipline</Label>
        <Input
          className="mt-1"
          placeholder="Discipline"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          className="mt-1"
          rows={4}
          placeholder="Details"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Line Items */}
      <div className="border p-4 rounded-md">
        <h3 className="text-lg font-medium mb-4">Line Items</h3>

        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 mb-3 items-end">
            <div className="col-span-5">
              <Label>Description</Label>
              <Input
                value={item.description}
                onChange={(e) =>
                  updateField(index, "description", e.target.value)
                }
              />
            </div>

            <div className="col-span-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={(item.qty as any) === 0 ? "" : item.qty}
                onChange={(e) =>
                  updateField(index, "qty", e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>

            <div className="col-span-2">
              <Label>Unit Rate</Label>
              <Input
                type="number"
                value={(item.rate as any) === 0 ? "" : item.rate}
                onChange={(e) =>
                  updateField(index, "rate", e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>

            <div className="col-span-2">
              <Label>Total</Label>
              <Input readOnly value={"R" + getTotal(index).toFixed(2)} />
            </div>

            <button
              type="button"
              className="col-span-1 text-red-500"
              onClick={() => removeItem(index)}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addItem}>
          + Add Line Item
        </Button>
      </div>

      {/* Upload Section */}
      <div>
        <Label htmlFor="vo-upload" className="text-sm text-[#1A1F36]">
          Upload Section
        </Label>
        <input
          type="file"
          id="vo-upload"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <div
          className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => document.getElementById("vo-upload")?.click()}>
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
          {loading || uploading ? "Creating..." : "Create VO"}
        </Button>
      </div>
    </form>
  );
}

