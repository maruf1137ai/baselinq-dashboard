import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";

interface VOApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "recommend" | "approve";
  vo: {
    voNumber: string;
    title: string;
    description?: string;
    discipline?: string;
    submittedBy: string;
    recommendedBy?: string;
    subTotal: number;
    taxAmount: number;
    grandTotal: number;
    currency?: string;
    timeExtensionDays?: number;
  };
  onConfirm: () => Promise<void>;
}

const fmt = (amount: number, currency = "ZAR") =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);

export const VOApprovalModal: React.FC<VOApprovalModalProps> = ({
  open,
  onOpenChange,
  mode,
  vo,
  onConfirm,
}) => {
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDeclarationChecked(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!declarationChecked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === "recommend" ? "Recommend for Approval" : "Approve & Sign Variation Order";
  const currency = vo.currency || "ZAR";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-normal">{title}</DialogTitle>
          <DialogDescription>
            {vo.voNumber} — {vo.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">VO Number</span>
              <p className="text-foreground">{vo.voNumber}</p>
            </div>
            {vo.discipline && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Discipline</span>
                <p className="text-foreground">{vo.discipline}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Submitted by</span>
              <p className="text-foreground">{vo.submittedBy}</p>
            </div>
            {mode === "approve" && vo.recommendedBy && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Recommended by</span>
                <p className="text-foreground">{vo.recommendedBy}</p>
              </div>
            )}
          </div>

          {/* Description */}
          {vo.description && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">
              {vo.description}
            </div>
          )}

          {/* Financial summary */}
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-widest">
              Financial Summary
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Agreed Amount (excl. VAT)</span>
              <span className="text-foreground">{fmt(vo.subTotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT</span>
              <span className="text-foreground">{fmt(vo.taxAmount, currency)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground uppercase tracking-wider text-[11px]">
                TOTAL {mode === "approve" ? "APPROVED" : "RECOMMENDED"} AMOUNT
              </span>
              <span className="text-foreground">{fmt(vo.grandTotal, currency)}</span>
            </div>
          </div>

          {/* Time consequence */}
          {vo.timeExtensionDays != null && vo.timeExtensionDays > 0 && (
            <div className="space-y-1 pt-2">
              <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-widest">
                Time Consequence
              </p>
              <p className="text-sm text-foreground">
                Extension of Time: {vo.timeExtensionDays}{" "}
                {vo.timeExtensionDays === 1 ? "day" : "days"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Revised Practical Completion date to be updated post-approval.
              </p>
            </div>
          )}

          {/* Warning banner */}
          <div className="flex gap-3 rounded-lg bg-amber-50/50 border border-amber-100 p-4 text-[13px] text-amber-900 leading-relaxed translate-y-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Once {mode === "approve" ? "approved" : "recommended"}, this Variation Order becomes a
              binding contractual instruction. It cannot be amended without a further Variation Order.
            </span>
          </div>

          {/* Declaration */}
          <div className="flex items-start gap-3 pt-6">
            <Checkbox
              id="vo-declaration"
              checked={declarationChecked}
              onCheckedChange={(v) => setDeclarationChecked(!!v)}
              className="mt-0.5 border-muted-foreground/30 data-[state=checked]:bg-primary flex-shrink-0"
            />
            <label htmlFor="vo-declaration" className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none">
              I confirm I have the authority to{" "}
              {mode === "approve" ? "approve" : "recommend"} this Variation Order on behalf of my
              organisation and that all details stated above are accurate.
            </label>
          </div>
        </div>

        <DialogFooter className="pt-6 sm:justify-end gap-2">
          <Button
            variant="outline"
            className="font-normal border-border/60 hover:bg-muted/50"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="font-normal bg-primary text-white hover:bg-primary/90 px-6"
            disabled={!declarationChecked || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting
              ? "Processing…"
              : mode === "recommend"
                ? "Recommend for Approval"
                : "Approve & Sign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
