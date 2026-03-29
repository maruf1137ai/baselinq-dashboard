import React, { useState, useRef } from "react";
import {
  Eye,
  EyeOff,
  Check,
  Building2,
  User,
  Compass,
  Layers,
  Map,
  Zap,
  HardHat,
  ClipboardList,
  Calculator,
  Briefcase,
  Upload,
  FileText,
  X,
  UserPlus,
  Trash2,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import AiIcon from "@/components/icons/AiIcon";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/hooks/useSignup";
import type { RegisterPayload } from "@/lib/Api";
import { cn } from "@/lib/utils";

type AccountType = "organisation" | "individual";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  position: string;
}

const ROLES = [
  { id: "architect", label: "Architect", icon: <Compass className="w-4 h-4" />, body: "SACAP" },
  { id: "structural", label: "Structural Engineer", icon: <Layers className="w-4 h-4" />, body: "ECSA" },
  { id: "civil", label: "Civil Engineer", icon: <Map className="w-4 h-4" />, body: "ECSA" },
  { id: "mep", label: "MEP Engineer", icon: <Zap className="w-4 h-4" />, body: "ECSA" },
  { id: "contractor", label: "Contractor", icon: <HardHat className="w-4 h-4" />, body: "CIDB" },
  { id: "pm", label: "Project Manager", icon: <ClipboardList className="w-4 h-4" />, body: "SACPCMP" },
  { id: "qs", label: "Quantity Surveyor", icon: <Calculator className="w-4 h-4" />, body: "ASAQS" },
  { id: "client", label: "Client / Owner", icon: <Briefcase className="w-4 h-4" />, body: "" },
];

const PROFESSIONAL_BODIES = ["SACAP", "ECSA", "ASAQS", "CIDB", "SACPCMP", "Other", "None"];

const ACCOUNT_TYPES = [
  {
    id: "organisation" as AccountType,
    label: "Organisation",
    desc: "A registered company, firm or practice",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: "individual" as AccountType,
    label: "Individual / Sole Proprietor",
    desc: "Working independently, legal liability flows through you personally",
    icon: <User className="w-5 h-5" />,
  },
];

const ORG_STEPS = [
  { id: 1, label: "Your Role", description: "Select your profession" },
  { id: 2, label: "Account Type", description: "Company or individual?" },
  { id: 3, label: "Company Details", description: "Entity & professional info" },
  { id: 4, label: "Invite Team", description: "Add colleagues" },
  { id: 5, label: "Create Login", description: "Email & password" },
];

const IND_STEPS = [
  { id: 1, label: "Your Role", description: "Select your profession" },
  { id: 2, label: "Account Type", description: "Company or individual?" },
  { id: 3, label: "Your Details", description: "Identity & professional info" },
  { id: 4, label: "Create Login", description: "Email & password" },
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

const SignupPage = () => {
  const navigate = useNavigate();
  const signupMutation = useSignup();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 5 — Team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: crypto.randomUUID(), name: "", email: "", position: "" },
  ]);

  const addTeamMember = () =>
    setTeamMembers((prev) => [...prev, { id: crypto.randomUUID(), name: "", email: "", position: "" }]);

  const removeTeamMember = (id: string) =>
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));

  const updateTeamMember = (id: string, field: keyof Omit<TeamMember, "id">, value: string) =>
    setTeamMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  // Step 1 — Role
  const [role, setRole] = useState("");

  // Step 2 — Account type
  const [accountType, setAccountType] = useState<AccountType | "">("");

  // Step 3 — Credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");

  // Step 4 — Entity details (shared)
  const [professionalBody, setProfessionalBody] = useState("");
  const [professionalRegNumber, setProfessionalRegNumber] = useState("");
  const [insuranceCertificate, setInsuranceCertificate] = useState<File | null>(null);
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | undefined>(undefined);
  const [insuranceCalendarOpen, setInsuranceCalendarOpen] = useState(false);

  // Step 4 — Organisation only
  const [companyName, setCompanyName] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [ckNumber, setCkNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [companySize, setCompanySize] = useState("");

  // Step 4 — Individual only
  const [idNumber, setIdNumber] = useState("");

  const handleGoToEntityDetails = () => {
    if (!professionalBody) {
      const selectedRole = ROLES.find((r) => r.id === role);
      if (selectedRole?.body) setProfessionalBody(selectedRole.body);
    }
    setStep(3);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== passwordConfirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    const payload: RegisterPayload = {
      name,
      email,
      password,
      password_confirm: passwordConfirm,
      role,
      account_type: accountType as "organisation" | "individual",
      professional_body: professionalBody || undefined,
      professional_reg_number: professionalRegNumber || undefined,
      insurance_expiry: insuranceExpiry ? format(insuranceExpiry, "yyyy-MM-dd") : undefined,
      ...(accountType === "organisation"
        ? {
          company_name: companyName,
          company_reg_number: companyRegNumber,
          ck_number: ckNumber || undefined,
          vat_number: vatNumber || undefined,
          company_size: companySize || undefined,
          team_invites: teamMembers
            .filter((m) => m.email)
            .map((m) => ({ email: m.email, position: m.position })),
        }
        : {
          id_number: idNumber || undefined,
        }),
    };

    signupMutation.mutate(payload, {
      onSuccess: () => navigate("/login"),
      onError: (err: unknown) => {
        const errorMessage =
          (err as { response?: { data?: { message?: string; email?: string[] } } })
            ?.response?.data?.message ||
          (err as { response?: { data?: { email?: string[] } } })
            ?.response?.data?.email?.[0] ||
          (err as { message?: string })?.message ||
          "An error occurred during signup.";
        setError(errorMessage);
      },
    });
  };

  // Sidebar step list (resolves to 4 or 5 steps depending on account type)
  const STEPS = accountType === "individual" ? IND_STEPS : ORG_STEPS;

  // Map internal step number to sidebar visual position
  const visualStep = accountType !== "organisation" && step === 5 ? 4 : step;

  const selectedRole = ROLES.find((r) => r.id === role);

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
          <p className="text-[18px] text-[#101828] leading-tight">Create Account</p>
          <p className="text-[12px] text-[#9ca3af] mt-1">Get started with Baselinq</p>
        </div>

        {/* Stepper */}
        <nav className="px-4 pt-3 flex-1 overflow-y-auto">
          {STEPS.map((s, i) => {
            const done = visualStep > s.id;
            const active = visualStep === s.id;
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

        {/* Account preview card */}
        {/* <div className="px-4 pb-5 mt-auto">
          <div className="rounded-2xl p-4" style={{ background: "#1a1a2e" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <AiIcon size={14} />
              <span className="text-[10px] text-[#a78bfa] uppercase tracking-widest">Account Preview</span>
            </div>
            {!role && !accountType ? (
              <p className="text-[12px] text-white leading-relaxed">
                Your account details will appear here as you fill them in.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedRole && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#8081F6]/20 flex items-center justify-center text-[#a78bfa] shrink-0">
                      {selectedRole.icon}
                    </div>
                    <p className="text-[12px] text-white truncate">{selectedRole.label}</p>
                  </div>
                )}
                {accountType && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#8081F6]/20 flex items-center justify-center text-[#a78bfa] shrink-0">
                      {accountType === "organisation" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>
                    <p className="text-[12px] text-[#9ca3af]">
                      {accountType === "organisation" ? "Organisation" : "Individual"}
                    </p>
                  </div>
                )}
                {name && (
                  <div className="pt-2 border-t border-[#2d2d4e]">
                    <p className="text-[14px] text-white truncate">{name}</p>
                    {email && <p className="text-[11px] text-[#9ca3af] mt-0.5 truncate">{email}</p>}
                  </div>
                )}
              </div>
            )}
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
                style={{ background: s.id <= visualStep ? "#8081F6" : "#e5e7eb" }}
              />
            ))}
          </div>
          <p className="text-[13px] text-[#374151]">
            Step {visualStep} of {STEPS.length}: {STEPS[visualStep - 1]?.label}
          </p>
        </div>

        {/* Sign in link */}
        <div className="flex justify-end px-8 pt-5 pb-1 shrink-0">
          <button
            onClick={() => navigate("/login")}
            className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors"
          >
            Already have an account?{" "}
            <span className="text-[#8081F6]">Sign in</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

              {/* ── STEP 1: Role ── */}
              {step === 1 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">What's your role?</h2>
                    <p className="text-sm text-gray-500 mt-1">We'll personalise your experience around it</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all group",
                          role === r.id
                            ? "border-[#8081F6] bg-[#8081F6]/5"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                          role === r.id ? "bg-[#8081F6] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                        )}>
                          {r.icon}
                        </div>
                        <span className="text-sm flex-1 text-gray-600">{r.label}</span>
                        {role === r.id && <Check className="w-3.5 h-3.5 text-[#8081F6] shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!role}
                    onClick={() => setStep(2)}
                    className="mt-6 w-full py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* ── STEP 2: Account type ── */}
              {step === 2 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">How will you use Baselinq?</h2>
                    <p className="text-sm text-gray-500 mt-1">This determines your entity's legal structure</p>
                  </div>

                  <div className="space-y-3">
                    {ACCOUNT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setAccountType(type.id)}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all group",
                          accountType === type.id
                            ? "border-[#8081F6] bg-[#8081F6]/5"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                        )}
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
                          accountType === type.id ? "bg-[#8081F6] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                        )}>
                          {type.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-[#1A1A1A]">{type.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                        </div>
                        {accountType === type.id && (
                          <div className="w-5 h-5 rounded-full bg-[#8081F6] flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!accountType}
                      onClick={handleGoToEntityDetails}
                      className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Entity details ── */}
              {step === 3 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">
                      {accountType === "organisation" ? "Company details" : "Your details"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Used for contracts, compliance, and insurance tracking
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep(accountType === "organisation" ? 4 : 5); }} className="space-y-4">

                    {accountType === "organisation" && (
                      <>
                        <Field label="Company Name">
                          <input type="text" required value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Acme Construction (Pty) Ltd" className={INPUT_CLS} />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Company Registration No.">
                            <input type="text" required value={companyRegNumber}
                              onChange={(e) => setCompanyRegNumber(e.target.value)}
                              placeholder="2023/123456/07" className={INPUT_CLS} />
                          </Field>
                          <Field label="CK Number" optional>
                            <input type="text" value={ckNumber}
                              onChange={(e) => setCkNumber(e.target.value)}
                              placeholder="CK 2023/123456" className={INPUT_CLS} />
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="VAT Number" optional>
                            <input type="text" value={vatNumber}
                              onChange={(e) => setVatNumber(e.target.value)}
                              placeholder="4123456789" className={INPUT_CLS} />
                          </Field>
                          <Field label="Company Size" optional>
                            <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                              className={INPUT_CLS}>
                              <option value="">Select...</option>
                              <option value="1-10">1–10 people</option>
                              <option value="11-50">11–50 people</option>
                              <option value="51-200">51–200 people</option>
                              <option value="201-500">201–500 people</option>
                              <option value="500+">500+ people</option>
                            </select>
                          </Field>
                        </div>
                      </>
                    )}

                    {accountType === "individual" && (
                      <Field label="ID Number">
                        <input type="text" required value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="8001015009087" className={INPUT_CLS} />
                      </Field>
                    )}

                    <div className="pt-1 border-t border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Professional Registration</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Professional Body">
                          <select value={professionalBody} onChange={(e) => setProfessionalBody(e.target.value)}
                            className={INPUT_CLS}>
                            <option value="">Select...</option>
                            {PROFESSIONAL_BODIES.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Registration Number" optional>
                          <input type="text" value={professionalRegNumber}
                            onChange={(e) => setProfessionalRegNumber(e.target.value)}
                            placeholder="e.g. P 12345" className={INPUT_CLS} />
                        </Field>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-gray-100">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                        Insurance Certificate <span className="normal-case text-gray-400">(optional)</span>
                      </p>

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
                          Upload certificate (PDF or image)
                        </button>
                      )}

                      <div className="mt-3">
                        <Field label="Insurance Expiry Date" optional>
                          <Popover open={insuranceCalendarOpen} onOpenChange={setInsuranceCalendarOpen}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  INPUT_CLS,
                                  "flex items-center justify-between text-left",
                                  !insuranceExpiry && "text-gray-400"
                                )}
                              >
                                <span>{insuranceExpiry ? format(insuranceExpiry, "dd MMM yyyy") : "Pick a date"}</span>
                                <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={insuranceExpiry}
                                onSelect={(date) => {
                                  setInsuranceExpiry(date);
                                  setInsuranceCalendarOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </Field>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all"
                      >
                        Continue
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── STEP 4: Team members (organisations only) ── */}
              {step === 4 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">Invite your team</h2>
                    <p className="text-sm text-gray-500 mt-1">Add colleagues to your organisation on Baselinq</p>
                  </div>

                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Full name"
                            value={member.name}
                            onChange={(e) => updateTeamMember(member.id, "name", e.target.value)}
                            className={INPUT_CLS}
                          />
                          <input
                            type="email"
                            placeholder="Email address"
                            value={member.email}
                            onChange={(e) => updateTeamMember(member.id, "email", e.target.value)}
                            className={INPUT_CLS}
                          />
                          <select
                            value={member.position}
                            onChange={(e) => updateTeamMember(member.id, "position", e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="">Position...</option>
                            {ROLES.map((r) => (
                              <option key={r.id} value={r.id}>{r.label}</option>
                            ))}
                            <option value="admin">Administrator</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        {teamMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTeamMember(member.id)}
                            className="mt-2.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addTeamMember}
                    className="mt-3 flex items-center gap-2 text-sm text-[#8081F6] hover:text-[#6c6de9] transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add another member
                  </button>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all"
                    >
                      Continue
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              )}

              {/* ── STEP 5: Login details ── */}
              {step === 5 && (
                <div className="animate-in fade-in duration-200">
                  <div className="text-center mb-6">
                    <h2 className="text-xl text-[#1A1A1A]">Create your login</h2>
                    <p className="text-sm text-gray-500 mt-1">Your credentials to access Baselinq</p>
                  </div>

                  {error && (
                    <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                    <Field label="Full Name">
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith" className={INPUT_CLS} />
                    </Field>

                    <Field label="Email Address">
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com" className={INPUT_CLS} />
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

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(accountType === "organisation" ? 4 : 3)}
                        className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={signupMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {signupMutation.isPending ? "Creating account..." : "Create account"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 pb-5">
          <p className="text-center text-xs text-gray-400">
            By creating an account you agree to our{" "}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms of Service</span>
            {" "}and{" "}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
