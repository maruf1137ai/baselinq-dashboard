/**
 * Werner spec rev H — Sign & Issue button + PIN modal.
 *
 * Per Werner page 12: SI / VO / Claim require a deliberate signing
 * action by the responsible party (architect / PM). On success the
 * doc transitions to issued state and a green certificate card
 * appears at the bottom of the doc.
 *
 * Two flows depending on what the user has set up in their profile:
 *   - 4-digit PIN  → PIN input field
 *   - No PIN       → 'Confirm I am signing' checkbox
 *
 * The decision is made by hitting /api/tasks/signing-pin/verify/
 * with an empty pin first to discover the user's signing method.
 */
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePost } from "@/hooks/usePost";

type SigningMethod = "pin" | "click-confirm";

interface Props {
  entityType: "si" | "vo" | "claim";
  entityId: number;
  onSigned: () => void;
}

const TYPE_LABELS: Record<Props["entityType"], string> = {
  si: "Site Instruction",
  vo: "Variation Order",
  claim: "Claim",
};

export function SignIssueButton({ entityType, entityId, onSigned }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SigningMethod | null>(null);
  const [pin, setPin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const { mutateAsync: postRequest } = usePost();

  const openModal = async () => {
    // Discover whether the user has a PIN configured.
    try {
      const res = await postRequest({
        url: "tasks/signing-pin/verify/",
        data: { pin: "" },
      });
      const m: SigningMethod = res?.method === "pin" ? "pin" : "click-confirm";
      setMethod(m);
      setPin("");
      setConfirmed(false);
      setOpen(true);
    } catch {
      // If verify fails, fall back to click-confirm — the actual sign
      // endpoint will still validate.
      setMethod("click-confirm");
      setPin("");
      setConfirmed(false);
      setOpen(true);
    }
  };

  const handleSign = async () => {
    if (method === "pin" && (!pin || !/^\d{4}$/.test(pin))) {
      toast.error("Enter your 4-digit PIN.");
      return;
    }
    if (method === "click-confirm" && !confirmed) {
      toast.error("Tick the confirmation box to proceed.");
      return;
    }
    setBusy(true);
    try {
      await postRequest({
        url: "tasks/sign-and-issue/",
        data: {
          entity_type: entityType,
          entity_id: entityId,
          pin: method === "pin" ? pin : undefined,
          confirmed: method === "click-confirm" ? true : undefined,
        },
      });
      toast.success(`${TYPE_LABELS[entityType]} signed and issued.`);
      setOpen(false);
      onSigned();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Sign failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={openModal}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <ShieldCheck className="mr-1.5 h-4 w-4" />
          SIGN &amp; ISSUE
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign &amp; Issue {TYPE_LABELS[entityType]}</DialogTitle>
            <DialogDescription>
              By signing, you confirm responsibility for this document.
              Once issued, it cannot be edited.
            </DialogDescription>
          </DialogHeader>

          {method === "pin" && (
            <div className="py-2">
              <label className="text-sm text-gray-700 block mb-2">
                Enter your 4-digit signing PIN:
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-lg tracking-[0.5em] text-center font-mono"
                placeholder="••••"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Set or change your PIN in Settings → Profile → Signing PIN.
              </p>
            </div>
          )}

          {method === "click-confirm" && (
            <div className="py-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-purple-600 rounded border-gray-400"
                />
                <span className="text-sm text-gray-700">
                  I confirm I am signing this {TYPE_LABELS[entityType].toLowerCase()}.
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-3 italic">
                For higher-value docs you can set a 4-digit PIN in Settings →
                Profile to require the PIN on every signing.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={busy}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {busy ? "Signing…" : "Sign & Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
