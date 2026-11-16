/**
 * Settings → Security: two-step sign-in. Turn it on, make new recovery
 * codes, or turn it off (not allowed while the account's role requires it).
 */
import { useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TwoStepEnrol, { RecoveryCodes } from "@/components/auth/TwoStepEnrol";
import { disableTwoStep, getTwoStepStatus, regenerateTwoStepRecoveryCodes } from "@/lib/Api";
import { cleanCode, formatDeadline, twoStepErrorMessage, type TwoStepStatus } from "@/lib/twoStep";

const STATUS_KEY = ["auth/two-step/status/"];

export default function TwoStepCard({ email }: { email?: string }) {
  const queryClient = useQueryClient();
  const { data: status, isLoading, isError, refetch } = useQuery<TwoStepStatus>({
    queryKey: STATUS_KEY,
    queryFn: getTwoStepStatus,
  });
  const [enrolling, setEnrolling] = useState(false);
  const [action, setAction] = useState<"codes" | "off" | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: STATUS_KEY });

  const runAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code your app shows.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (action === "codes") {
        const res = await regenerateTwoStepRecoveryCodes(code);
        setNewCodes(res.recoveryCodes || []);
        toast.success("New recovery codes made. The old ones no longer work.");
      } else {
        await disableTwoStep(code);
        toast.success("Two-step sign-in is off.");
      }
      setAction(null);
      setCode("");
      refresh();
    } catch (err) {
      setError(twoStepErrorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const badge = isLoading ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
    </span>
  ) : status?.enrolled ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs text-green-700">
      <ShieldCheck className="h-3 w-3" /> On
    </span>
  ) : status ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
      <ShieldAlert className="h-3 w-3" /> Off
    </span>
  ) : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-normal text-foreground">Two-step sign-in</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Signing in asks for a code from an app on your phone as well as your password, so a
              stolen password alone can't get into your account.
            </p>
          </div>
        </div>
        <div className="shrink-0">{badge}</div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {isError && (
          <div role="alert" className="flex items-center gap-3 text-sm text-red-600">
            Couldn't load your two-step sign-in status.
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {status?.required && !status.enrolled && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Your role certifies or approves payments, so your account needs two-step sign-in
            {status.graceEndsAt ? ` by ${formatDeadline(status.graceEndsAt)}` : ""}. After that
            you'll be asked to set it up when you sign in.
          </div>
        )}

        {newCodes && (
          <div className="space-y-3">
            <RecoveryCodes codes={newCodes} email={email} />
            <Button type="button" size="sm" onClick={() => setNewCodes(null)}>
              I've saved my codes
            </Button>
          </div>
        )}

        {status && !status.enrolled && !enrolling && (
          <Button type="button" onClick={() => setEnrolling(true)}>
            Turn on two-step sign-in
          </Button>
        )}
        {status && !status.enrolled && enrolling && (
          <TwoStepEnrol
            email={email}
            onDone={() => {
              setEnrolling(false);
              toast.success("Two-step sign-in is on.");
              refresh();
            }}
            onCancel={() => setEnrolling(false)}
          />
        )}

        {status?.enrolled && !newCodes && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {status.recoveryCodesLeft} of 10 recovery codes left.
            </p>
            {action ? (
              <form onSubmit={runAction} className="space-y-3 max-w-sm">
                {error && (
                  <div role="alert" className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <label className="block text-xs text-muted-foreground">
                  {action === "codes"
                    ? "Enter a code from your app to make new recovery codes."
                    : "Enter a code from your app to turn two-step sign-in off."}
                  <Input
                    className="mt-1.5 max-w-[10rem] font-mono tracking-widest"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="6-digit code"
                    value={code}
                    onChange={(e) => setCode(cleanCode(e.target.value))}
                    placeholder="123456"
                  />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={busy || code.length !== 6}
                    variant={action === "off" ? "destructive" : "default"}>
                    {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    {action === "codes" ? "Make new codes" : "Turn off"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy}
                    onClick={() => { setAction(null); setCode(""); setError(""); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAction("codes")}>
                  New recovery codes
                </Button>
                {status.required ? (
                  <p className="text-xs text-muted-foreground self-center">
                    Required for your role, so it can't be turned off. Lost your phone? Contact
                    Baselinq support.
                  </p>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAction("off")}>
                    Turn off
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
