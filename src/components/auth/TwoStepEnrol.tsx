/**
 * Setting up two-step sign-in: the authenticator QR code and key, a code to
 * confirm, then the 10 recovery codes, shown once.
 *
 * Used from Settings → Security (signed in) and from the sign-in page when a
 * certifying role's grace period is over (with the pre-auth token).
 */
import { Suspense, lazy, useState } from "react";
import { Copy, Download, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmTwoStepSetup, startTwoStepSetup } from "@/lib/Api";
import { cleanCode, formatSecret, recoveryCodesFile, twoStepErrorMessage } from "@/lib/twoStep";

const TwoStepQr = lazy(() => import("./TwoStepQr"));

interface Props {
  preAuthToken?: string;
  email?: string;
  /** Called after the user has seen and saved the recovery codes. */
  onDone: (result: any) => void;
  onCancel?: () => void;
}

export function RecoveryCodes({ codes, email }: { codes: string[]; email?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Recovery codes copied.");
    } catch {
      toast.error("Couldn't copy. Select the codes and copy them by hand.");
    }
  };
  const download = () => {
    const blob = new Blob([recoveryCodesFile(codes, email)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "baselinq-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">Save these recovery codes</p>
      <p className="text-xs text-muted-foreground">
        If you lose your phone, each code signs you in once. They won't be shown again. Keep them
        somewhere safe, away from your phone.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3" aria-label="Recovery codes">
        {codes.map((c) => (
          <li key={c} className="font-mono text-sm text-foreground">{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Download
        </Button>
      </div>
    </div>
  );
}

export default function TwoStepEnrol({ preAuthToken, email, onDone, onCancel }: Props) {
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      setSetup(await startTwoStepSetup(preAuthToken));
    } catch (err) {
      setError(twoStepErrorMessage(err, "Couldn't start set-up. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup?.secret ?? "");
      toast.success("Setup key copied.");
    } catch {
      toast.error("Couldn't copy. Select the key and copy it by hand.");
    }
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code your app shows.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      setResult(await confirmTwoStepSetup(code, preAuthToken));
    } catch (err) {
      setError(twoStepErrorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error ? (
    <div role="alert" className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
      {error}
    </div>
  ) : null;

  if (result) {
    return (
      <div className="space-y-4">
        <RecoveryCodes codes={result.recoveryCodes || []} email={email} />
        <Button type="button" onClick={() => onDone(result)}>
          I've saved my codes
        </Button>
      </div>
    );
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        {errorBox}
        <p className="text-xs text-muted-foreground">
          You'll need an authenticator app on your phone, such as Google Authenticator, Microsoft
          Authenticator or 1Password.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={start} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Set up two-step sign-in
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      {errorBox}
      <ol className="space-y-3 text-sm text-foreground list-decimal pl-5">
        <li>
          Scan this QR code with your authenticator app, or enter the key by hand.
          <div className="mt-2 mb-3 block w-fit rounded-lg border border-border bg-white p-1" data-testid="two-step-qr">
            <Suspense fallback={<div className="h-[176px] w-[176px]" />}>
              <TwoStepQr value={setup.otpauthUri} />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wider select-all" data-testid="two-step-secret">
              {formatSecret(setup.secret)}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copySecret}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy key
            </Button>
          </div>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <li>Account: {email || "your Baselinq email"}</li>
            <li>Issuer: Baselinq</li>
            <li>Type: time-based, 6 digits</li>
          </ul>
          <a
            href={setup.otpauthUri}
            className="mt-2 text-[#6c5ce7] hover:underline inline-flex items-center gap-1 md:hidden"
          >
            <Smartphone className="h-3.5 w-3.5" /> Open in authenticator app
          </a>
        </li>
        <li>
          Enter the 6-digit code the app shows.
          <Input
            className="mt-2 max-w-[10rem] font-mono tracking-widest"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6-digit code"
            value={code}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            placeholder="123456"
          />
        </li>
      </ol>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || code.length !== 6}>
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Turn on
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
