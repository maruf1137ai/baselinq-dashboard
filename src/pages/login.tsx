import React, { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/useLogin";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8081F6]/20 focus:border-[#8081F6] transition-all bg-white";

const LABEL_CLS = "block text-xs text-gray-500 mb-1.5";

const FEATURES = [
  "Manage projects and teams in one place",
  "AI-powered contract analysis",
  "Real-time document collaboration",
  "Role-based access and permissions",
];

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          localStorage.setItem("access", data.tokens.access);
          localStorage.setItem("refresh", data.tokens.refresh);
          localStorage.setItem("user", JSON.stringify(data.user));
          navigate("/");
        },
        onError: (err: unknown) => {
          const errorMessage =
            (err as { response?: { data?: { message?: string } }; message?: string })
              ?.response?.data?.message ||
            (err as { message?: string })?.message ||
            "An error occurred during login.";
          setError(errorMessage);
        },
      },
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ══════════════════════════════ LEFT SIDEBAR ══════════════════════ */}
      <aside className="hidden lg:flex w-[280px] bg-sidebar border-r border-[#ededed] flex-col h-full shrink-0">

        {/* Logo */}
        <div className="px-6 pt-6 pb-5 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
              <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
            </div>
            <span className="text-[14px] text-[#121212] tracking-tight">baselinq</span>
          </div>
        </div>

        {/* Heading */}
        <div className="px-6 pt-5 pb-4">
          <p className="text-[18px] text-[#101828] leading-tight">Welcome back</p>
          <p className="text-[12px] text-[#9ca3af] mt-1">Sign in to your account</p>
        </div>

        {/* Features list */}
        <div className="px-4 flex-1">
          <div className="space-y-1">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#8081F6] text-white shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <p className="text-[13px] text-[#374151] leading-snug pt-1.5">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="px-6 pb-6 mt-auto">
          <p className="text-[11px] text-[#9ca3af]">
            Trusted by construction professionals across South Africa
          </p>
        </div>
      </aside>

      {/* ══════════════════════════════ RIGHT PANEL ═══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* Mobile logo bar */}
        <div className="lg:hidden bg-white border-b border-[#ededed] px-5 py-3 flex items-center gap-2.5">
          <div className="h-8 w-8 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
            <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
          </div>
          <span className="text-[14px] text-[#121212] tracking-tight">baselinq</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-12">
          <div className="w-full max-w-md my-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

              <div className="text-center mb-6">
                <h2 className="text-xl text-foreground">Sign in</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={LABEL_CLS}>Email Address</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={INPUT_CLS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLS}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
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

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="mt-2 w-full py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign in"}
                </button>
              </form>

            </div>

            <p className="text-center text-sm text-gray-500 mt-5">
              Don't have an account?{" "}
              <button onClick={() => navigate("/signup")} className="text-[#8081F6] hover:underline">
                Create one
              </button>
            </p>

            <p className="text-center text-xs text-gray-400 mt-3">
              By signing in you agree to our{" "}
              <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms of Service</span>
              {" "}and{" "}
              <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
