import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/useLogin";
import { cn } from "@/lib/utils";

const INPUT_CLS =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8081F6]/20 focus:border-[#8081F6] transition-all bg-white";

const LABEL_CLS = "block text-xs text-gray-500 mb-1.5";

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="mx-auto w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-9 w-9 bg-[#121212] rounded-xl flex items-center justify-center shrink-0">
            <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl text-foreground tracking-tight">baselinq</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <div className="text-center mb-6">
            <h2 className="text-xl text-foreground">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
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
              className="mt-2 w-full py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#8081F6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account?{" "}
            <button onClick={() => navigate("/signup")} className="text-[#8081F6] hover:underline">
              Create one
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By signing in you agree to our{" "}
          <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms of Service</span>
          {" "}and{" "}
          <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
