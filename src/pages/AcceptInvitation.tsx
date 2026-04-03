import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchInvitation, acceptInvitation } from "@/lib/Api";
import { cn } from "@/lib/utils";

const PROFESSIONAL_BODIES = ["SACAP", "ECSA", "ASAQS", "CIDB", "SACPCMP", "Other", "None"];

const STEPS_BASE = [
  { id: 1, label: "Account Setup", description: "Name & password" },
  { id: 2, label: "Professional", description: "Identity & registration" },
];

const STEPS_CLIENT = [
  { id: 1, label: "Account Setup", description: "Name & password" },
  { id: 2, label: "Company Details", description: "Legal & tax info" },
  { id: 3, label: "Professional", description: "Identity & registration" },
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

  // Step 2 — Company (Client Only)
  const [companyName, setCompanyName] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [error, setError] = useState("");


  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitation(token!),
    enabled: !!token,
    retry: false,
  });

  const isClient = invite?.position === "client";
  const steps = isClient ? STEPS_CLIENT : STEPS_BASE;
  const totalSteps = steps.length;

  useEffect(() => {
    if (!invite) return;
    // Pre-fill name from invitation
    if (invite.contact_name && !name) setName(invite.contact_name);
    // Suggest professional body based on role
    if (invite.position && !professionalBody) {
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
    }
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
      // Client fields
      ...(isClient ? {
        company_name: companyName,
        company_reg_number: companyRegNumber,
        vat_number: vatNumber,
        address,
        city,
        state,
        postal_code: postalCode,
        account_type: 'organisation',
      } : {})
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
          <p className="text-[18px] text-[#101828] leading-tight font-normal">Accept Invitation</p>
          <p className="text-[12px] text-[#9ca3af] mt-1">Set up your profile to join</p>
        </div>

        {/* Stepper */}
        <nav className="px-4 pt-3 flex-1 overflow-y-auto">
          {steps.map((s, i) => {
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
                {i < steps.length - 1 && (
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

      </aside>

      {/* ══════════════════════════════ RIGHT PANEL ═══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* Mobile progress bar */}
        <div className="lg:hidden bg-white border-b border-[#ededed] px-5 py-3">
          <div className="flex gap-1.5 mb-2">
            {steps.map((s) => (
              <div
                key={s.id}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s.id <= step ? "#8081F6" : "#e5e7eb" }}
              />
            ))}
          </div>
          <p className="text-[13px] text-[#374151]">
            Step {step} of {totalSteps}: {steps[step - 1]?.label}
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
                    <h2 className="text-xl text-[#1A1A1A] font-normal">Create your account</h2>
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

              {/* ── STEP 2 (Client): Company Details ── */}
              {isClient && step === 2 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A] font-normal">Company Details</h2>
                    <p className="text-sm text-gray-500 mt-1">Legal and registration information</p>
                  </div>

                  <div className="space-y-4">
                    <Field label="Company Name">
                      <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" className={INPUT_CLS} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Registration No.">
                        <input type="text" value={companyRegNumber} onChange={e => setCompanyRegNumber(e.target.value)} placeholder="2024/..." className={INPUT_CLS} />
                      </Field>
                      <Field label="VAT No." optional>
                        <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="41234567" className={INPUT_CLS} />
                      </Field>
                    </div>
                    <Field label="Physical Address">
                      <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" className={INPUT_CLS} />
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="City">
                        <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City" className={INPUT_CLS} />
                      </Field>
                      <Field label="State">
                        <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="State" className={INPUT_CLS} />
                      </Field>
                      <Field label="Postal Code">
                        <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Code" className={INPUT_CLS} />
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
                </div>
              )}

              {/* ── STEP 2 (Base) / 3 (Client): Professional ── */}
              {step === (isClient ? 3 : 2) && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A] font-normal">Identity & Professional</h2>
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
                    <button type="button" onClick={() => setStep(isClient ? 2 : 1)}
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
