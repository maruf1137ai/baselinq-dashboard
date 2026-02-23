"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";
import { patchData } from "@/lib/Api";

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

export default function VOForm({ setOpen, initialStatus, initialData, taskId }: any) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [discipline, setDiscipline] = useState(initialData?.discipline || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [items, setItems] = useState(
    initialData?.lineItems?.length
      ? initialData.lineItems.map((li: any) => ({
          description: li.description || "",
          qty: li.quantity ?? 1,
          rate: li.unitRate ?? 0,
        }))
      : [{ description: "", qty: 1, rate: 0 }]
  );

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    { name: string; url: string }[]
  >([]);

  const queryClient = useQueryClient();
  const { mutateAsync: postRequest } = usePost();

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

  const uploadAttachments = async (voId: string | number) => {
    if (!selectedFiles.length) return [];
    setUploading(true);
    const uploaded: { name: string; url: string }[] = [];

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Upload to tasks/variation-orders/{voId}/attachments/
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}tasks/variation-orders/${voId}/attachments/`,
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

    // Calculate totals from line items
    const subTotal = items.reduce((acc, item) => acc + (item.qty || 0) * (item.rate || 0), 0);
    const taxRate = 15; // Default VAT rate
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;

    // Construct payload matching Django VO API requirements
    const payload = {
      project: parseInt(projectId),
      title: title,
      discipline: discipline || undefined,
      description: description,
      status: initialStatus || "Draft",
      line_items: items.map(item => ({
        description: item.description,
        quantity: item.qty,
        unitRate: item.rate,
      })),
      currency: "ZAR",
      sub_total: subTotal,
      tax_type: "VAT",
      tax_rate: taxRate,
      tax_amount: taxAmount,
      grand_total: grandTotal,
    };

    const handleSuccess = async (result: any) => {
      // Create channel after VO is created
      // console.log("VO created:", result);
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

      // Upload attachments after VO is created
      console.log("VO created:", result?._id);
      if (selectedFiles.length > 0 && result?._id) {
        try {
          await uploadAttachments(result._id);
          toast.success("VO created and files uploaded successfully");
        } catch (error) {
          console.error("Attachment upload error:", error);
          toast.error("VO created but failed to upload attachments");
        }
      } else {
        toast.success("Success! VO created successfully");
      }

      // Refetch VOs, tasks, and channels to update the UI
      await queryClient.invalidateQueries({ queryKey: [`projects/${projectId}/tasks/`] });
      await queryClient.invalidateQueries({ queryKey: ["vos"] });
      await queryClient.invalidateQueries({ queryKey: [`channels/?projectId=${projectId}`] });
      await queryClient.invalidateQueries({ queryKey: [`tasks/tasks/?taskType=VO&project=${projectId}`] });

      setOpen(false);
      setLoading(false);
    };

    const handleError = (err: any) => {
      console.error(err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Error creating VO";
      toast.error(errorMessage);
      setLoading(false);
    };

    try {
      if (taskId) {
        // Edit mode — PATCH to update-entity
        await patchData({ url: `tasks/tasks/${taskId}/update-entity/`, data: payload });
        toast.success("VO updated successfully");
        await queryClient.invalidateQueries({ queryKey: [`tasks/tasks/?taskType=VO&project=${localStorage.getItem("selectedProjectId")}`] });
        setOpen(false);
        setLoading(false);
      } else {
        // Create mode
        const result = await postRequest({
          url: "tasks/variation-orders/",
          data: payload
        });
        await handleSuccess(result);
      }
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
          placeholder="VO Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
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
        <Label>Description</Label>
        <Textarea
          className="mt-1"
          rows={6}
          placeholder="Details"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm text-[#1B1C1F] uppercase tracking-wider">Line Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 border-dashed">
            + Add Item
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] space-y-4 relative group transition-all hover:border-primary/30 hover:shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <Label className="text-[11px] text-[#6B7280] uppercase mb-1.5 block">Description</Label>
                <Textarea
                  rows={2}
                  className="bg-white resize-none"
                  placeholder="Enter work description..."
                  value={item.description}
                  onChange={(e) => updateField(index, "description", e.target.value)}
                />
              </div>
              <button
                type="button"
                className="mt-7 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                onClick={() => removeItem(index)}
                title="Remove Item"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-[11px] text-[#6B7280] uppercase mb-1.5 block">Quantity</Label>
                <Input
                  type="number"
                  className="bg-white"
                  placeholder="0"
                  value={(item.qty as any) === 0 ? "" : item.qty}
                  onChange={(e) => updateField(index, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div>
                <Label className="text-[11px] text-[#6B7280] uppercase mb-1.5 block">Unit Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <Input
                    type="number"
                    className="bg-white pl-7"
                    placeholder="0.00"
                    value={(item.rate as any) === 0 ? "" : item.rate}
                    onChange={(e) => updateField(index, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-[#6B7280] uppercase mb-1.5 block">Total</Label>
                <div className="h-10 flex items-center px-4 rounded-md border border-[#E5E7EB] bg-white text-[#1B1C1F]">
                  R {getTotal(index).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-xl border-[#E5E7EB] bg-[#F9FAFB]">
            <p className="text-sm text-gray-400">No items added yet. Click "+ Add Item" to begin.</p>
          </div>
        )}
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
                {/* <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-red-500 text-xs hover:underline">
                  <X size={18} />
                </button> */}
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
          {loading || uploading ? (taskId ? "Saving..." : "Creating...") : (taskId ? "Save Changes" : "Create VO")}
        </Button>
      </div>
    </form>
  );
}
