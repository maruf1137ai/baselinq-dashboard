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
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

import useFetch from "@/hooks/useFetch";

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
  /** Callback fired when the user submits.
   *  Args:
   *    auth — `{ pin }` for "approve" mode (PIN is mandatory for VO sign
   *           per Werner spec). `null` for "recommend" mode. */
  onConfirm: (
    auth: { pin: string } | null,
  ) => Promise<void>;
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
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Werner spec — final VO sign goes through the same PIN gate as Sign
  // & Issue (the highest-stakes action — contract amendment). We fetch
  // the user's PIN status to decide between PIN input and click-confirm.
  // Skip the fetch entirely for "recommend" mode — it doesn't sign yet.
  const { data: pinStatus } = useFetch<{ has_pin: boolean }>(
    open && mode === "approve" ? "tasks/signing-pin/" : "",
    { enabled: open && mode === "approve" },
  );
  const signMethod: "pin" | "click-confirm" = pinStatus?.has_pin ? "pin" : "click-confirm";

  useEffect(() => {
    if (open) {
      setDeclarationChecked(false);
      setPin("");
      setIsSubmitting(false);
    }
  }, [open]);

  // Werner spec — VO is high-stakes (contract amendment). When no PIN
  // is configured we BLOCK the final Approve & Sign step entirely and
  // require the user to go set up a PIN first. The click-confirm
  // fallback used by SI doesn't apply here.
  const needsPinSetup = mode === "approve" && signMethod === "click-confirm";

  // Disabled rule: declaration must always be ticked; for "approve" mode
  // we ALSO need a valid PIN (or block entirely if no PIN is set).
  const authReady =
    mode === "recommend" ||
    (signMethod === "pin" && /^\d{4}$/.test(pin));
  const canSubmit = declarationChecked && authReady && !needsPinSetup && !isSubmitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      // For "approve" mode, only the PIN path can ever reach here —
      // click-confirm is blocked at the UI level (needsPinSetup banner).
      const auth: { pin: string } | null = mode === "approve" ? { pin } : null;
      await onConfirm(auth);
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

          {/* Auth step — only on "approve" mode (final sign). For
              "recommend" mode the declaration alone is sufficient. */}
          {mode === "approve" && signMethod === "pin" && (
            <div className="pt-2 space-y-2">
              <label className="text-xs text-muted-foreground block">
                Enter your 4-digit signing PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full font-mono tracking-[0.6em] text-center text-lg border border-border rounded-md py-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Set or change your PIN in Settings → Security.
              </p>
            </div>
          )}
          {/* No-PIN blocker for VO Approve & Sign — high-stakes per Werner. */}
          {needsPinSetup && (
            <div className="pt-2">
              <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-2 text-amber-900">
                  <p className="font-normal">A signing PIN is required to approve this Variation Order.</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Variation Orders are binding contractual instructions that amend the
                    contract value and timeline. A 4-digit PIN is required for every
                    Approve &amp; Sign action.
                  </p>
                  <Link
                    to="/settings/security"
                    onClick={() => onOpenChange(false)}
                    className="inline-block text-xs font-normal text-amber-900 underline hover:text-amber-700 mt-1"
                  >
                    Set up signing PIN →
                  </Link>
                </div>
              </div>
            </div>
          )}

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
            className="font-normal bg-primary text-white hover:bg-primary/90 px-6 disabled:bg-primary/40 disabled:cursor-not-allowed"
            disabled={!canSubmit}
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
