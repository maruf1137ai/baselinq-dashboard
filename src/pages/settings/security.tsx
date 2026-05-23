/**
 * Security settings.
 *
 * Currently exposes the Werner-spec signing PIN UI — the 4-digit code that
 * gates VO / SI / Claim Sign & Issue. Backend endpoints:
 *
 *   GET  /api/tasks/signing-pin/         → { has_pin: bool }
 *   POST /api/tasks/signing-pin/set/     → body { pin: "1234" } or { pin: "" }
 *   POST /api/tasks/signing-pin/verify/  → body { pin } (unused here)
 */
import { useState } from "react";
import { KeyRound, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { useQueryClient } from "@tanstack/react-query";

const Security = () => {
  const queryClient = useQueryClient();
  const { data: pinStatus, isLoading: pinLoading } = useFetch<{ has_pin: boolean }>("tasks/signing-pin/");
  const { mutateAsync: postRequest, isPending: saving } = usePost();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const hasPin = !!pinStatus?.has_pin;

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("The two PINs do not match.");
      return;
    }
    try {
      await postRequest({ url: "tasks/signing-pin/set/", data: { pin } });
      toast.success(hasPin ? "Signing PIN updated." : "Signing PIN set.");
      setPin("");
      setConfirmPin("");
      queryClient.invalidateQueries({ queryKey: ["tasks/signing-pin/"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save PIN.");
    }
  };

  const handleClearPin = async () => {
    const ok = window.confirm(
      "Clear your signing PIN? You'll fall back to click-confirm on every Sign & Issue.",
    );
    if (!ok) return;
    try {
      await postRequest({ url: "tasks/signing-pin/set/", data: { pin: "" } });
      toast.success("Signing PIN cleared.");
      queryClient.invalidateQueries({ queryKey: ["tasks/signing-pin/"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not clear PIN.");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Security</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage account security, sessions, and authentication settings.
        </p>
      </div>

      {/* ── Signing PIN card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-normal text-foreground">Signing PIN</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                A 4-digit PIN required when signing Site Instructions, Variation Orders,
                and Claims. Without a PIN, Sign &amp; Issue falls back to click-confirm.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {pinLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading
              </span>
            ) : hasPin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs text-green-700">
                <ShieldCheck className="w-3 h-3" />
                PIN set
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
                <ShieldAlert className="w-3 h-3" />
                Not set
              </span>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                {hasPin ? "New PIN" : "PIN"} (4 digits)
              </label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="font-mono tracking-widest"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Confirm PIN
              </label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="font-mono tracking-widest"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleSavePin}
              disabled={saving || pin.length !== 4 || confirmPin.length !== 4}
              className="h-8 text-xs rounded-lg"
            >
              {saving ? "Saving…" : hasPin ? "Update PIN" : "Set PIN"}
            </Button>
            {hasPin && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearPin}
                disabled={saving}
                className="h-8 text-xs rounded-lg"
              >
                Clear PIN
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tip: pick a PIN you don't use elsewhere. It only protects this app's signing
            action — not your login. You can change or clear it at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Security;
