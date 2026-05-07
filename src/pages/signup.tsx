import React, { useState, useRef } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/hooks/useSignup";
import { cn } from "@/lib/utils";
import AiIcon from "@/components/icons/AiIcon";
import { fetchData } from "@/lib/Api";

const INPUT_CLS =
  "w-full px-4 py-3.5 bg-[#f5f5f8] border border-transparent rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]/30 focus:bg-white transition-all";

const INPUT_ERROR_CLS =
  "w-full px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 focus:bg-white transition-all";

const LABEL_CLS = "block text-xs text-gray-500 mb-1.5";

const SignupPage = () => {
  const navigate = useNavigate();
  const signupMutation = useSignup();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEmail = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || !value.includes("@")) return;

    debounceRef.current = setTimeout(async () => {
      setEmailChecking(true);
      try {
        const result = await fetchData(`auth/check-email/?email=${encodeURIComponent(value)}`);
        if (result?.exists) {
          setEmailError("exists");
        } else {
          setEmailError("");
        }
      } catch {
        // Silent — don't block signup on a failed check
      } finally {
        setEmailChecking(false);
      }
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailError === "exists") return;
    setError("");
    if (password !== passwordConfirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    signupMutation.mutate(
      { name, email, password, password_confirm: passwordConfirm },
      {
        onSuccess: () => navigate("/login"),
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string; email?: string[] } } })
              ?.response?.data?.message ||
            (err as { response?: { data?: { email?: string[] } } })
              ?.response?.data?.email?.[0] ||
            (err as { message?: string })?.message ||
            "An error occurred. Please try again.";
          setError(msg);
        },
      },
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#eeeef4]">

      {/* ── Left dark panel ── */}
      <aside className="hidden lg:flex w-[45%] shrink-0 flex-col h-full"
        style={{ background: "linear-gradient(145deg, #1a1c3d 0%, #11132d 100%)" }}>

        {/* Logo */}
        <div className="px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white/10 rounded-[10px] flex items-center justify-center shrink-0 border border-white/10">
              <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
            </div>
            <span className="text-[15px] text-white/90 tracking-tight">baselinq</span>
          </div>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-center px-10">
          <h1 className="text-[38px] text-white">
            Let's get you<br />started!
          </h1>
          <p className="text-[14px] text-white/50 mt-4 leading-relaxed max-w-xs">
            Create your account in seconds. You'll complete your profile after signing in.
          </p>

          {/* Info card */}
          <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <AiIcon size={16} className="text-[#6c5ce7]" />
            </div>
            <p className="text-[13px] text-white/60 leading-snug">
              AI-powered contracts, compliance, and document management, all in one workspace.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="px-10 pb-10">
          <div className="border-t border-white/10 pt-6 space-y-3">
            <p className="text-[13px] text-white/50">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-[#6c5ce7] hover:underline">
                Sign in
              </button>
            </p>
            <p className="text-[11px] text-white/25 leading-relaxed">
              By creating an account you agree to our{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms of Service</span>
              {" "}and{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden border-b border-[#ededed] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
              <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
            </div>
            <span className="text-[14px] text-[#121212] tracking-tight">baselinq</span>
          </div>
          <button onClick={() => navigate("/login")} className="text-[13px] text-[#6c5ce7] hover:underline">
            Sign in
          </button>
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end px-8 pt-5 pb-3 shrink-0">
          <button onClick={() => navigate("/login")} className="text-[12px] text-[#6c5ce7] hover:underline">
            Already have an account? Sign in
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 py-10">
          <div className="w-full max-w-[420px]">

            <div className="mb-8">
              <h2 className="text-[22px] font-normal text-[#101828] tracking-tight">Create your account</h2>
              <p className="text-sm text-gray-400 mt-1">You'll complete your profile after signing in</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={LABEL_CLS}>Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className={LABEL_CLS}>Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onBlur={(e) => checkEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={emailError === "exists" ? INPUT_ERROR_CLS : INPUT_CLS}
                />
                {emailChecking && (
                  <p className="text-xs text-gray-400 mt-1">Checking...</p>
                )}
                {emailError === "exists" && (
                  <p className="text-xs text-red-500 mt-1">
                    An account already exists with this email.{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="underline font-medium hover:text-red-600 transition-colors"
                    >
                      Log in instead
                    </button>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={cn(INPUT_CLS, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className={cn(INPUT_CLS, "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={signupMutation.isPending || emailError === "exists"}
                className="mt-2 w-full py-3.5 rounded-xl bg-[#6c5ce7] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {signupMutation.isPending ? "Creating account..." : "Create Account"}
                {!signupMutation.isPending && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

          </div>
        </div>
      </div>

    </div>
  );
};

export default SignupPage;
