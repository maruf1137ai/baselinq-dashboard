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
          const selectedProjectId = localStorage.getItem("selectedProjectId");
          if (selectedProjectId) {
            navigate("/");
          } else {
            navigate("/account");
          }
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
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">

      {/* ── Left panel ── */}
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

        {/* Center content */}
        <div className="flex-1 flex flex-col justify-center px-10">
          <h1 className="text-[36px] font-normal text-white leading-tight tracking-tight">
            Welcome back.
          </h1>
          <p className="text-[14px] text-white/50 mt-3 leading-relaxed max-w-xs">
            Sign in to manage your projects, team, and documents — all in one place.
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#8081F6]/20 border border-[#8081F6]/30 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-[#8081F6]" />
                </div>
                <p className="text-[13px] text-white/60 leading-snug">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="px-10 pb-10 mt-auto">
          <div className="border-t border-white/10 pt-6 space-y-3">
            <p className="text-[13px] text-white/50">
              Don't have an account?{" "}
              <button onClick={() => navigate("/signup")} className="text-[#8081F6] hover:underline">
                Create one
              </button>
            </p>
            <p className="text-[11px] text-white/25 leading-relaxed">
              By signing in you agree to our{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms of Service</span>
              {" "}and{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f5f5f7]">

        {/* Mobile logo */}
        <div className="lg:hidden bg-white border-b border-[#ededed] px-5 py-3 flex items-center gap-2.5">
          <div className="h-8 w-8 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
            <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
          </div>
          <span className="text-[14px] text-[#121212] tracking-tight">baselinq</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">

            <div className="mb-8">
              <h2 className="text-[22px] font-normal text-foreground tracking-tight">Sign in</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
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
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
