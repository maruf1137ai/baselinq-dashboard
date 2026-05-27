/**
 * Password reset flow — OTP variant.
 *
 * Single page, three internal steps:
 *   1. "request" — enter email → POST /auth/password/reset/otp/request/
 *   2. "verify"  — enter 6-digit OTP with a 2-minute countdown and a
 *                  "Resend" button that unlocks once the countdown ends
 *                  → POST /auth/password/reset/otp/verify/ → reset token
 *   3. "reset"   — enter + confirm new password
 *                  → POST /auth/password/reset/otp/confirm/ → done
 *
 * Design language matches login.tsx / signup.tsx (two-panel layout,
 * #6c5ce7 primary, rounded-xl gray inputs).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { postData } from "@/lib/Api";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full px-4 py-3 bg-[#f5f5f8] border border-transparent rounded-xl text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]/30 focus:bg-white transition-all";
const LABEL_CLS = "block text-xs text-gray-500 mb-1.5";

const FEATURES = [
  "Manage projects and teams in one place",
  "AI-powered contract analysis",
  "Real-time document collaboration",
  "Role-based access and permissions",
];

const OTP_TTL_SECONDS = 120;

type Step = "request" | "verify" | "reset" | "done";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");

  // shared
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // verify
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  // reset
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── countdown tick ─────────────────────────────────────────────────
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    if (step !== "verify" || countdown <= 0) return;
    tickRef.current = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [step, countdown]);

  const countdownLabel = useMemo(() => {
    const m = Math.floor(countdown / 60);
    const s = countdown % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [countdown]);

  // ── helpers ────────────────────────────────────────────────────────
  const requestOtp = async (resending = false) => {
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postData({
        url: "auth/password/reset/otp/request/",
        data: { email: email.trim().toLowerCase() },
      });
      setOtp("");
      setCountdown(OTP_TTL_SECONDS);
      setStep("verify");
      if (resending) toast.success("A new code has been sent.");
    } catch (err: any) {
      // 429 from cooldown — surface the message so the user knows to wait.
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Couldn't send the code. Try again in a moment.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res: any = await postData({
        url: "auth/password/reset/otp/verify/",
        data: { email: email.trim().toLowerCase(), otp },
      });
      setResetToken(res.token);
      setStep("reset");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postData({
        url: "auth/password/reset/otp/confirm/",
        data: { token: resetToken, new_password: newPassword },
      });
      setStep("done");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Couldn't reset password. Start the reset again.",
      );
    } finally {
      setBusy(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      {/* ── Left panel (matches login.tsx / signup.tsx) ── */}
      <aside
        className="hidden lg:flex w-[45%] shrink-0 flex-col h-full"
        style={{ background: "linear-gradient(145deg, #1a1c3d 0%, #11132d 100%)" }}
      >
        <div className="px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white/10 rounded-[10px] flex items-center justify-center shrink-0 border border-white/10">
              <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
            </div>
            <span className="text-[15px] text-white/90 tracking-tight">baselinq</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-10">
          <h1 className="text-[36px] font-normal text-white leading-tight tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-[14px] text-white/50 mt-3 leading-relaxed max-w-xs">
            No worries — we'll send a six-digit code to your email to verify it's you, then you can set a new password.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#6c5ce7]/20 border border-[#6c5ce7]/30 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#6c5ce7]" />
                </div>
                <p className="text-[13px] text-white/60 leading-snug">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-10 pb-10 mt-auto">
          <div className="border-t border-white/10 pt-6 space-y-3">
            <p className="text-[13px] text-white/50">
              Remembered it?{" "}
              <button onClick={() => navigate("/login")} className="text-[#6c5ce7] hover:underline">
                Back to sign in
              </button>
            </p>
            <p className="text-[11px] text-white/25 leading-relaxed">
              By continuing you agree to our{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms of Service</span>
              {" "}and{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-white">
        <div className="flex items-center justify-between px-8 pt-5 pb-3 shrink-0">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
              <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
            </div>
            <span className="text-[14px] text-[#121212] tracking-tight">baselinq</span>
          </div>
          <div className="hidden lg:block" />
          <Link to="/login" className="text-[12px] text-[#6c5ce7] hover:underline">
            Back to sign in
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            {/* Back affordance between steps so users can correct typos. */}
            {(step === "verify" || step === "reset") && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(step === "verify" ? "request" : "verify");
                }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            {step === "request" && (
              <RequestStep
                email={email}
                setEmail={setEmail}
                error={error}
                busy={busy}
                onSubmit={() => void requestOtp(false)}
              />
            )}

            {step === "verify" && (
              <VerifyStep
                email={email}
                otp={otp}
                setOtp={setOtp}
                error={error}
                busy={busy}
                countdown={countdown}
                countdownLabel={countdownLabel}
                onSubmit={() => void verifyOtp()}
                onResend={() => void requestOtp(true)}
              />
            )}

            {step === "reset" && (
              <ResetStep
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                error={error}
                busy={busy}
                onSubmit={() => void confirmReset()}
              />
            )}

            {step === "done" && (
              <DoneStep onContinue={() => navigate("/login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-[22px] font-normal text-[#101828] tracking-tight">{title}</h2>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
}

function RequestStep({
  email,
  setEmail,
  error,
  busy,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  error: string;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <StepHeader
        title="Forgot password"
        subtitle="Enter the email tied to your account — we'll send a 6-digit code."
      />
      <ErrorBox error={error} />
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Email Address</label>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={INPUT_CLS}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full py-3 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Sending code..." : "Send reset code"}
        </button>
      </div>
    </form>
  );
}

function VerifyStep({
  email,
  otp,
  setOtp,
  error,
  busy,
  countdown,
  countdownLabel,
  onSubmit,
  onResend,
}: {
  email: string;
  otp: string;
  setOtp: (v: string) => void;
  error: string;
  busy: boolean;
  countdown: number;
  countdownLabel: string;
  onSubmit: () => void;
  onResend: () => void;
}) {
  const expired = countdown <= 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!expired) onSubmit();
      }}
    >
      <StepHeader
        title="Enter the code"
        subtitle={`We sent a 6-digit code to ${email}. It's valid for 2 minutes.`}
      />
      <ErrorBox error={error} />
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className={cn(
              INPUT_CLS,
              "text-center text-lg font-mono tracking-[0.5em]",
            )}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {expired ? (
                <span className="text-red-500">Code expired</span>
              ) : (
                <>
                  Expires in <span className="font-mono text-foreground">{countdownLabel}</span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={onResend}
              disabled={!expired || busy}
              className={cn(
                "text-xs",
                expired && !busy
                  ? "text-[#6c5ce7] hover:underline"
                  : "text-gray-300 cursor-not-allowed",
              )}
            >
              {busy ? "Sending…" : "Resend code"}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || expired || otp.length !== 6}
          className="mt-2 w-full py-3 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Verifying..." : "Verify code"}
        </button>
      </div>
    </form>
  );
}

function ResetStep({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  error,
  busy,
  onSubmit,
}: {
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <StepHeader
        title="Set a new password"
        subtitle="Pick something at least 8 characters long."
      />
      <ErrorBox error={error} />
      <div className="space-y-4">
        <div>
          <label className={LABEL_CLS}>New password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoFocus
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={cn(INPUT_CLS, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Confirm new password</label>
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter the password"
            className={INPUT_CLS}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full py-3 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Resetting..." : "Reset password"}
        </button>
      </div>
    </form>
  );
}

function DoneStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <div className="mb-8">
        <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-4">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-[22px] font-normal text-[#101828] tracking-tight">
          Password reset
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Your password has been updated. Sign in with your new password to continue.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all"
      >
        Sign in
      </button>
    </div>
  );
}
