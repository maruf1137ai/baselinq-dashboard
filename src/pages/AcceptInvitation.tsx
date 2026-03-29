import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Check,
  Upload,
  FileText,
  X,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import AiIcon from "@/components/icons/AiIcon";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchInvitation, acceptInvitation } from "@/lib/Api";
import { cn } from "@/lib/utils";

const PROFESSIONAL_BODIES = ["SACAP", "ECSA", "ASAQS", "CIDB", "SACPCMP", "Other", "None"];

const STEPS = [
  { id: 1, label: "Account Setup", description: "Name & password" },
  { id: 2, label: "Professional", description: "Identity & registration" },
  { id: 3, label: "Insurance", description: "Certificate & expiry" },
];

const INPUT_CLS =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8081F6]/20 focus:border-[#8081F6] transition-all bg-white";

const LABEL_CLS = "block text-xs text-gray-500 mb-1.5";

const Field = ({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className={LABEL_CLS}>
      {label}
      {optional && <span className="text-gray-400 ml-1">(optional)</span>}
    </label>
    {children}
  </div>
);

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);

  // Step 1 — Account
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Step 2 — Professional
  const [idNumber, setIdNumber] = useState("");
  const [professionalBody, setProfessionalBody] = useState("");
  const [professionalRegNumber, setProfessionalRegNumber] = useState("");

  // Step 3 — Insurance
  const [insuranceCertificate, setInsuranceCertificate] = useState<File | null>(null);
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [error, setError] = useState("");

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitation(token!),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!invite?.position || professionalBody) return;
    const bodyMap: Record<string, string> = {
      architect: "SACAP",
      structural: "ECSA",
      civil: "ECSA",
      mep: "ECSA",
      contractor: "CIDB",
      pm: "SACPCMP",
      qs: "ASAQS",
    };
    const suggested = bodyMap[invite.position];
    if (suggested) setProfessionalBody(suggested);
  }, [invite]);

  const acceptMutation = useMutation({
    mutationFn: (payload: Parameters<typeof acceptInvitation>[1]) =>
      acceptInvitation(token!, payload),
    onSuccess: (data) => {
      const tokens = data.tokens;
      localStorage.setItem("access", tokens.access);
      localStorage.setItem("refresh", tokens.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data?.error ||
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Something went wrong.";
      setError(Array.isArray(msg) ? msg.join(" ") : msg);
    },
  });

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setStep(2);
  };

  const handleSubmit = () => {
    setError("");
    acceptMutation.mutate({
      name,
      password,
      password_confirm: passwordConfirm,
      id_number: idNumber || undefined,
      professional_body: professionalBody || undefined,
      professional_reg_number: professionalRegNumber || undefined,
      insurance_expiry: insuranceExpiry ? format(insuranceExpiry, "yyyy-MM-dd") : undefined,
    });
  };

  const positionLabel = invite?.position
    ? invite.position.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Team Member";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading invitation...</p>
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <p className="text-[#1A1A1A] mb-1">Invitation not found</p>
          <p className="text-sm text-gray-500">This link may have expired or already been used.</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 w-full py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

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
        <div className="px-6 pt-5 pb-2">
          <p className="text-[18px] text-[#101828] leading-tight">Accept Invitation</p>
          <p className="text-[12px] text-[#9ca3af] mt-1">Set up your profile to join</p>
        </div>

        {/* Stepper */}
        <nav className="px-4 pt-3 flex-1 overflow-y-auto">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className={cn(
                  "flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                  active ? "bg-[#f0edff]" : "bg-transparent"
                )}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[13px] shrink-0 mt-0.5 transition-colors",
                    done || active ? "bg-[#8081F6] text-white" : "bg-[#f3f4f6] text-[#9ca3af]"
                  )}>
                    {done ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[13px] leading-tight",
                      done || active ? "text-[#101828]" : "text-[#9ca3af]"
                    )}>
                      {s.label}
                    </p>
                    <p className={cn(
                      "text-[11px] mt-0.5",
                      done || active ? "text-[#6b7280]" : "text-[#d1d5db]"
                    )}>
                      {s.description}
                    </p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="my-0.5"
                    style={
                      done
                        ? { width: "2px", height: "16px", background: "#8081F6", marginLeft: "28px" }
                        : { width: 0, height: "16px", borderLeft: "2px dashed #e5e7eb", marginLeft: "28px" }
                    }
                  />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Invitation preview card */}
        {/* <div className="px-4 pb-5 mt-auto">
          <div className="rounded-2xl p-4" style={{ background: "#1a1a2e" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <AiIcon size={14} />
              <span className="text-[10px] text-[#a78bfa] uppercase tracking-widest">Your Invitation</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />
                <p className="text-[12px] text-white truncate">{invite.organization ?? "Baselinq"}</p>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />
                <p className="text-[12px] text-[#9ca3af]">{positionLabel}</p>
              </div>
              <div className="pt-2 border-t border-[#2d2d4e]">
                <p className="text-[11px] text-[#6b7280]">Invited by</p>
                <p className="text-[13px] text-white mt-0.5">{invite.invited_by}</p>
                <p className="text-[11px] text-[#6b7280] mt-1">{invite.email}</p>
              </div>
            </div>
          </div>
        </div> */}


      </aside>

      {/* ══════════════════════════════ RIGHT PANEL ═══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* Mobile progress bar */}
        <div className="lg:hidden bg-white border-b border-[#ededed] px-5 py-3">
          <div className="flex gap-1.5 mb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s.id <= step ? "#8081F6" : "#e5e7eb" }}
              />
            ))}
          </div>
          <p className="text-[13px] text-[#374151]">
            Step {step} of {STEPS.length}: {STEPS[step - 1]?.label}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-2xl">

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

              {/* ── STEP 1: Account Setup ── */}
              {step === 1 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">Create your account</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Signing up as <span className="text-[#8081F6]">{invite.email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleStep1} className="space-y-4">
                    <Field label="Full Name">
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith" className={INPUT_CLS} />
                    </Field>

                    <Field label="Password">
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} required value={password}
                          onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters"
                          className={cn(INPUT_CLS, "pr-10")} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>

                    <Field label="Confirm Password">
                      <div className="relative">
                        <input type={showPasswordConfirm ? "text" : "password"} required value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Repeat your password"
                          className={cn(INPUT_CLS, "pr-10")} />
                        <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                          {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>

                    <button type="submit"
                      className="mt-2 w-full py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all">
                      Continue
                    </button>
                  </form>
                </div>
              )}

              {/* ── STEP 2: Professional ── */}
              {step === 2 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">Identity & Professional</h2>
                    <p className="text-sm text-gray-500 mt-1">Used for compliance and registration tracking</p>
                  </div>

                  <div className="space-y-4">
                    <Field label="ID Number" optional>
                      <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="8001015009087" className={INPUT_CLS} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Professional Body" optional>
                        <select value={professionalBody} onChange={(e) => setProfessionalBody(e.target.value)}
                          className={INPUT_CLS}>
                          <option value="">Select...</option>
                          {PROFESSIONAL_BODIES.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Registration No." optional>
                        <input type="text" value={professionalRegNumber}
                          onChange={(e) => setProfessionalRegNumber(e.target.value)}
                          placeholder="P 12345" className={INPUT_CLS} />
                      </Field>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep(1)}
                      className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)}
                      className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all">
                      Continue
                    </button>
                  </div>

                  <button type="button" onClick={() => setStep(3)}
                    className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
                    Skip for now
                  </button>
                </div>
              )}

              {/* ── STEP 3: Insurance ── */}
              {step === 3 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">Insurance Certificate</h2>
                    <p className="text-sm text-gray-500 mt-1">Professional indemnity or liability insurance</p>
                  </div>

                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setInsuranceCertificate(e.target.files?.[0] ?? null)}
                    />

                    {insuranceCertificate ? (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-[#1A1A1A] flex-1 truncate">{insuranceCertificate.name}</span>
                        <button type="button" onClick={() => setInsuranceCertificate(null)}
                          className="text-gray-400 hover:text-gray-600 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-[#8081F6]/50 hover:text-[#8081F6] transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Upload certificate (PDF or image) — optional
                      </button>
                    )}

                    <Field label="Insurance Expiry Date" optional>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button type="button"
                            className={cn(INPUT_CLS, "flex items-center justify-between text-left", !insuranceExpiry && "text-gray-400")}>
                            <span>{insuranceExpiry ? format(insuranceExpiry, "dd MMM yyyy") : "Pick a date"}</span>
                            <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={insuranceExpiry}
                            onSelect={(date) => { setInsuranceExpiry(date); setCalendarOpen(false); }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setStep(2)}
                      className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={acceptMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptMutation.isPending ? "Setting up your account..." : "Accept & join"}
                    </button>
                  </div>

                  <button type="button" onClick={handleSubmit}
                    disabled={acceptMutation.isPending}
                    className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
                    Skip for now
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 pb-5">
          <p className="text-center text-xs text-gray-400">
            By accepting you agree to our{" "}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms of Service</span>
            {" "}and{" "}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
