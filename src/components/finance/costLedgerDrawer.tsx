import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { postData, patchData } from "@/lib/Api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import useFetch from "@/hooks/useFetch";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LedgerEntry } from "./costLadger";

// Hardcoded to avoid Object.values(enum) undefined error at module init time
const CATEGORIES = [
  "Subcontractor",
  "Materials",
  "Plant & Equipment",
  "Labour",
  "Professional Fees",
  "Preliminaries",
  "Contingency",
  "Other",
] as const;

interface CostLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editEntry?: LedgerEntry | null;
}

export function CostLedgerDrawer({
  isOpen,
  onClose,
  projectId,
  editEntry,
}: CostLedgerDrawerProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    supplier: "",
    ref: "",
    period: format(new Date(), "MMM"),
    net: 0,
    total: 0,
    category: "Other" as string,
    entry_type: "debit",
    linkedVOId: "none" as string | number,
  });

  // Fetch approved VOs for the project
  const { data: voResponse } = useFetch<{ results: any[] }>(
    projectId ? `tasks/tasks/?taskType=VO&project=${projectId}&status=approved` : ""
  );

  const approvedVOs = voResponse?.results || [];

  useEffect(() => {
    if (editEntry) {
      setFormData({
        date: editEntry.dateRaw || editEntry.date,
        supplier: editEntry.supplier,
        ref: editEntry.ref,
        period: editEntry.period,
        net: editEntry.net,
        total: editEntry.total,
        category: editEntry.category,
        entry_type: editEntry.entryType || "debit",
        linkedVOId: editEntry.linkedVOId ?? "none",
      });
    } else {
      setFormData({
        date: new Date().toISOString().split("T")[0],
        supplier: "",
        ref: "",
        period: format(new Date(), "MMM"),
        net: 0,
        total: 0,
        category: "Other" as string,
        entry_type: "debit",
        linkedVOId: "none",
      });
    }
  }, [editEntry, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      projectId: Number(projectId),
      linkedVOId: formData.linkedVOId === "none" || formData.linkedVOId === "" ? null : Number(formData.linkedVOId),
      net: Number(formData.net),
      total: Number(formData.total),
    };

    try {
      if (editEntry) {
        await patchData({
          url: `cost-ledger/${editEntry.id}/`,
          data: payload,
        });
        toast.success("Cost ledger entry updated");
      } else {
        await postData({
          url: "cost-ledger/",
          data: payload,
        });
        toast.success("Cost ledger entry created");
      }
      queryClient.invalidateQueries({ queryKey: [`cost-ledger/?project_id=${projectId}`] });
      queryClient.invalidateQueries({ queryKey: [`cost-ledger/summary/?project_id=${projectId}`] });
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "An error occurred";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[540px] p-0 flex flex-col bg-white">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{editEntry ? "Edit Cost Ledger Entry" : "New Cost Ledger Entry"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-200",
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(new Date(formData.date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => handleChange("date", date?.toISOString().split("T")[0])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(val) => handleChange("period", val)}
                >
                  <SelectTrigger id="period" className="border-gray-200">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => handleChange("supplier", e.target.value)}
                placeholder="e.g. Steel Dynamics SA"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref">Reference / Invoice #</Label>
              <Input
                id="ref"
                value={formData.ref}
                onChange={(e) => handleChange("ref", e.target.value)}
                placeholder="e.g. INV-9021"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="net">Net Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-gray-500">R</span>
                  <Input
                    id="net"
                    type="number"
                    step="0.01"
                    className="pl-7"
                    value={formData.net || ""}
                    onChange={(e) => handleChange("net", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total">Total Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-gray-500">R</span>
                  <Input
                    id="total"
                    type="number"
                    step="0.01"
                    className="pl-7"
                    value={formData.total || ""}
                    onChange={(e) => handleChange("total", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => handleChange("category", val)}
                >
                  <SelectTrigger id="category" className="border-gray-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry_type">Entry Type</Label>
                <Select
                  value={formData.entry_type}
                  onValueChange={(val) => handleChange("entry_type", val)}
                >
                  <SelectTrigger id="entry_type" className="border-gray-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedVOId">Linked Variation Order (Optional)</Label>
              <Select
                value={String(formData.linkedVOId)}
                onValueChange={(val) => handleChange("linkedVOId", val)}
              >
                <SelectTrigger id="linkedVOId" className="border-gray-200">
                  <SelectValue placeholder="Select VO" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">None</SelectItem>
                  {approvedVOs.map((vo) => (
                    <SelectItem key={vo.id} value={String(vo.id)}>
                      {vo.vo_number} - {vo.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Only approved Variation Orders can be linked.</p>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50/50 mt-auto">
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#6c5ce7] hover:bg-[#6c5ce7] text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editEntry ? "Update Entry" : "Create Entry"}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
