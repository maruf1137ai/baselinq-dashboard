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
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePost } from "@/hooks/usePost";
import { patchData, registerS3TaskAttachment } from "@/lib/Api";
import { useS3Upload } from "@/hooks/useS3Upload";
import { S3AttachmentSection } from "@/components/S3AttachmentSection";
import { DISCIPLINE_OPTIONS } from "@/data/disciplines";

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
  const s3Upload = useS3Upload("task-attachments/pending");

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

  const registerAttachments = async (voId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) { toast.error(`Failed to upload ${entry.file.name}`); return; }
        try {
          await registerS3TaskAttachment("variation-orders", voId, { file_name: entry.file.name, s3_key: key });
        } catch {
          toast.error(`Failed to register ${entry.file.name}`);
        }
      })
    );
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
      taskStatus: initialStatus || "Draft",
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

      // Register any S3-uploaded attachments (upload already happened in background)
      if (s3Upload.entries.length > 0 && result?._id) {
        await registerAttachments(result._id);
        toast.success("VO created with attachments!");
      } else {
        toast.success("VO created successfully");
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
    <form className="flex flex-col h-full" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto space-y-4 py-6">
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

      {/* Line Items — temporarily hidden */}
      {/* <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm text-foreground normal-case">Line Items</h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 border-dashed">
            + Add Item
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="p-4 rounded-xl border border-border bg-muted space-y-4 relative group transition-all hover:border-primary/30 hover:shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground uppercase mb-1.5 block">Description</Label>
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
                <Label className="text-xs text-muted-foreground uppercase mb-1.5 block">Quantity</Label>
                <Input
                  type="number"
                  className="bg-white"
                  placeholder="0"
                  value={(item.qty as any) === 0 ? "" : item.qty}
                  onChange={(e) => updateField(index, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground uppercase mb-1.5 block">Unit Rate</Label>
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
                <Label className="text-xs text-muted-foreground uppercase mb-1.5 block">Total</Label>
                <div className="h-10 flex items-center px-4 rounded-md border border-border bg-white text-foreground">
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
          <div className="text-center py-8 border-2 border-dashed rounded-xl border-border bg-muted">
            <p className="text-sm text-gray-400">No items added yet. Click "+ Add Item" to begin.</p>
          </div>
        )}
      </div> */}

      <S3AttachmentSection s3Upload={s3Upload} inputId="vo-upload" label="Attachments" />

      </div>
      <div className="flex justify-end gap-2 py-4 border-t shrink-0 bg-white">
        <Button variant="outline" onClick={() => setOpen(false)} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (taskId ? "Saving..." : "Creating...") : (taskId ? "Save Changes" : "Create VO")}
        </Button>
      </div>
    </form>
  );
}
