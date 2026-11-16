/**
 * The second sign-in step: a 6-digit code from the authenticator app, or a
 * recovery code. The password step's pre-auth token lasts 5 minutes.
 */
import { useState } from "react";

import { verifyTwoStep } from "@/lib/Api";
import { cleanCode, twoStepErrorMessage } from "@/lib/twoStep";

const INPUT_CLS =
  "w-full px-4 py-3 bg-muted/50 border border-transparent rounded-xl text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]/30 focus:bg-card transition-all";

interface Props {
  preAuthToken: string;
  onSignedIn: (data: any) => void;
  onRestart: () => void;
}

export default function TwoStepCodeStep({ preAuthToken, onSignedIn, onRestart }: Props) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry = useRecovery ? value.trim() : cleanCode(value);
    if (!useRecovery && entry.length !== 6) {
      setError("Enter the 6-digit code your app shows.");
      return;
    }
    if (useRecovery && !entry) {
      setError("Enter one of your recovery codes.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const data = await verifyTwoStep(preAuthToken, useRecovery ? { recoveryCode: entry } : { code: entry });
      onSignedIn(data);
    } catch (err: any) {
      setError(twoStepErrorMessage(err));
      setExpired(err?.response?.data?.code === "two_step_session_expired");
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-[#101828] tracking-tight">Two-step sign-in</h2>
        <p className="text-sm text-gray-400 mt-1">
          {useRecovery
            ? "Enter one of the recovery codes you saved when you set up two-step sign-in."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {expired ? (
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-3 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all"
        >
          Back to sign in
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="two-step-entry" className="block text-xs text-gray-500 mb-1.5">
              {useRecovery ? "Recovery code" : "6-digit code"}
            </label>
            <input
              id="two-step-entry"
              autoFocus
              inputMode={useRecovery ? "text" : "numeric"}
              autoComplete={useRecovery ? "off" : "one-time-code"}
              value={value}
              onChange={(e) => setValue(useRecovery ? e.target.value : cleanCode(e.target.value))}
              placeholder={useRecovery ? "abcde-fghjk" : "123456"}
              className={`${INPUT_CLS} font-mono tracking-widest`}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full py-3 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Checking..." : "Continue"}
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setValue("");
                setError("");
              }}
              className="text-xs text-[#6c5ce7] hover:underline"
            >
              {useRecovery ? "Use a code from my app" : "Use a recovery code"}
            </button>
            <button type="button" onClick={onRestart} className="text-xs text-gray-500 hover:underline">
              Back
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Lost your phone and your recovery codes? Contact Baselinq support to reset two-step
            sign-in.
          </p>
        </form>
      )}
    </div>
  );
}
