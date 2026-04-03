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
  ArrowRight,
  Lock,
  Sparkles,
  Users,
  Info,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { useSignup } from "@/hooks/useSignup";
import type { RegisterPayload } from "@/lib/Api";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";

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
  { id: 1, label: "Create Login", description: "Email & password", icon: <Lock className="w-3.5 h-3.5" /> },
  { id: 2, label: "Your Role", description: "Select your profession", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: 3, label: "Account Type", description: "Company or individual?", icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 4, label: "Company Details", description: "Entity & professional info", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 5, label: "Invite Team", description: "Add colleagues", icon: <Users className="w-3.5 h-3.5" /> },
  { id: 6, label: "Get Started", description: "You're all set", icon: <Sparkles className="w-3.5 h-3.5" /> },
];

const IND_STEPS = [
  { id: 1, label: "Create Login", description: "Email & password", icon: <Lock className="w-3.5 h-3.5" /> },
  { id: 2, label: "Your Role", description: "Select your profession", icon: <Briefcase className="w-3.5 h-3.5" /> },
  { id: 3, label: "Account Type", description: "Company or individual?", icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 4, label: "Your Details", description: "Identity & professional info", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 5, label: "Get Started", description: "You're all set", icon: <Sparkles className="w-3.5 h-3.5" /> },
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
      {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
    </label>
    {children}
  </div>
);

const InfoBox = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#f0edff] border border-[#d6d3ff]">
    <Info className="w-3.5 h-3.5 text-[#8081F6] shrink-0 mt-0.5" />
    <p className="text-[12px] text-[#5b5bcc] leading-snug">{children}</p>
  </div>
);

const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 pt-1">
    <div className="h-px flex-1 bg-gray-100" />
    <span className="text-[10px] text-gray-400 uppercase tracking-widest">{label}</span>
    <div className="h-px flex-1 bg-gray-100" />
  </div>
);

const SignupPage = () => {
  const navigate = useNavigate();
  const signupMutation = useSignup();
  const { roles } = useRoles();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

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

  // Step 1 — Credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState("");

  // Step 2 — Role
  const [role, setRole] = useState("");

  // Step 3 — Account type
  const [accountType, setAccountType] = useState<AccountType | "">("");

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

  // Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleGoToEntityDetails = () => {
    if (!professionalBody) {
      const selectedRole = ROLES.find((r) => r.id === role);
      if (selectedRole?.body) setProfessionalBody(selectedRole.body);
    }
    setStep(4);
  };

  const finishStep = accountType === "individual" ? 5 : 6;

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
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      postal_code: postalCode || undefined,
      phone_number: phoneNumber || undefined,
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
      onSuccess: () => setStep(finishStep as any),
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

  // Sidebar step list
  const STEPS = accountType === "individual" ? IND_STEPS : ORG_STEPS;
  const visualStep = step;
  const selectedRole = ROLES.find((r) => r.id === role);
  const isFinishStep = step === finishStep;

  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* ══════════════════════════════ LEFT SIDEBAR ══════════════════════ */}
      <aside className="hidden lg:flex w-[272px] bg-sidebar border-r border-[#ededed] flex-col h-full shrink-0">

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
        <div className="px-6 pt-5 pb-3">
          <p className="text-[17px] text-[#101828] leading-tight">Create your account</p>
          <p className="text-[12px] text-[#9ca3af] mt-1">Get started in a few simple steps</p>
        </div>

        {/* Stepper */}
        <nav className="px-4 pt-1 flex-1 overflow-y-auto">
          {STEPS.map((s, i) => {
            const done = visualStep > s.id;
            const active = visualStep === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  active ? "bg-[#f0edff]" : "hover:bg-gray-50/70"
                )}>
                  {/* Step circle */}
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 text-[11px]",
                    done ? "bg-[#8081F6] text-white shadow-sm shadow-[#8081F6]/30"
                      : active ? "bg-[#8081F6] text-white shadow-sm shadow-[#8081F6]/30"
                        : "bg-[#f3f4f6] text-[#9ca3af]"
                  )}>
                    {done ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>

                  {/* Labels */}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      "text-[13px] leading-tight transition-colors",
                      done ? "text-[#374151]" : active ? "text-[#101828]" : "text-[#9ca3af]"
                    )}>
                      {s.label}
                    </p>
                    <p className={cn(
                      "text-[11px] mt-0.5 transition-colors",
                      done || active ? "text-[#9ca3af]" : "text-[#d1d5db]"
                    )}>
                      {s.description}
                    </p>
                  </div>

                  {/* Active indicator */}
                  {active && (
                    <ChevronRight className="w-3.5 h-3.5 text-[#8081F6] shrink-0" />
                  )}
                </div>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="flex items-center" style={{ marginLeft: "22px", height: "14px" }}>
                    <div
                      className="transition-all duration-300"
                      style={{
                        width: "2px",
                        height: "100%",
                        background: done ? "#8081F6" : "#e5e7eb",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="px-5 pb-5 pt-3 border-t border-[#f3f4f6] mt-2">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-[12px] text-[#9ca3af] hover:text-[#374151] transition-colors"
          >
            <ArrowRight className="w-3 h-3 rotate-180" />
            Back to Sign in
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════ RIGHT PANEL ═══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa]">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-5 pb-3 shrink-0">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-7 w-7 bg-[#121212] rounded-[8px] flex items-center justify-center">
              <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
            </div>
            <span className="text-[13px] text-[#121212] tracking-tight">baselinq</span>
          </div>
          <div className="hidden lg:block" />

          <button
            onClick={() => navigate("/login")}
            className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors"
          >
            Already have an account?{" "}
            <span className="text-[#8081F6]">Sign in</span>
          </button>
        </div>

        {/* Mobile progress bar */}
        <div className="lg:hidden px-6 pb-3">
          <div className="flex gap-1 mb-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s.id <= visualStep ? "#8081F6" : "#e5e7eb" }}
              />
            ))}
          </div>
          <p className="text-[12px] text-[#9ca3af]">
            Step {visualStep} of {STEPS.length}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-6">
          <div className="w-full max-w-[560px] my-auto">

            {/* Desktop step pill */}
            {!isFinishStep && (
              <div className="hidden lg:flex items-center gap-2 mb-5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0edff] border border-[#ddd9ff]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8081F6]" />
                  <span className="text-[11px] text-[#8081F6] uppercase tracking-wider">
                    Step {visualStep} of {STEPS.length}
                  </span>
                </div>
                <span className="text-[12px] text-[#9ca3af]">{STEPS[visualStep - 1]?.label}</span>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Progress bar across top of card */}
              {!isFinishStep && (
                <div className="flex h-[3px]">
                  {STEPS.map((s) => (
                    <div
                      key={s.id}
                      className="flex-1 transition-all duration-500"
                      style={{ background: s.id <= visualStep ? "#8081F6" : "#f3f4f6" }}
                    />
                  ))}
                </div>
              )}

              <div className="p-8">

                {/* ── STEP 1: Create Login ── */}
                {step === 1 && (
                  <div className="animate-in fade-in duration-200">
                    <div className="mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[#f0edff] flex items-center justify-center mb-4">
                        <Lock className="w-4.5 h-4.5 text-[#8081F6]" style={{ width: "18px", height: "18px" }} />
                      </div>
                      <h2 className="text-[20px] text-[#101828]">Create your login</h2>
                      <p className="text-[13px] text-gray-500 mt-1">Your secure credentials to access Baselinq</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (password !== passwordConfirm) { setError("Passwords do not match"); return; }
                        if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
                        setError("");
                        setStep(2);
                      }}
                      className="space-y-4"
                    >
                      <Field label="Full Name">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Smith"
                          className={INPUT_CLS}
                        />
                      </Field>

                      <Field label="Work Email">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className={INPUT_CLS}
                        />
                      </Field>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Password">
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
                        </Field>

                        <Field label="Confirm Password">
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
                        </Field>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="mt-1 w-full py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all flex items-center justify-center gap-2"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* ── STEP 2: Role ── */}
                {step === 2 && (
                  <div className="animate-in fade-in duration-200">
                    <div className="mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[#f0edff] flex items-center justify-center mb-4">
                        <Briefcase className="text-[#8081F6]" style={{ width: "18px", height: "18px" }} />
                      </div>
                      <h2 className="text-[20px] text-[#101828]">What's your role?</h2>
                      <p className="text-[13px] text-gray-500 mt-1">We'll personalise your workspace around your profession</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all group",
                            role === r.id
                              ? "border-[#8081F6] bg-[#8081F6]/5 shadow-sm shadow-[#8081F6]/10"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                            role === r.id ? "bg-[#8081F6] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                          )}>
                            {r.icon}
                          </div>
                          <span className={cn(
                            "text-[13px] flex-1 leading-snug transition-colors",
                            role === r.id ? "text-[#101828]" : "text-gray-600"
                          )}>
                            {r.label}
                          </span>
                          {role === r.id && (
                            <div className="w-4 h-4 rounded-full bg-[#8081F6] flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-white" />
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
                        disabled={!role}
                        onClick={() => setStep(3)}
                        className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Account type ── */}
                {step === 3 && (
                  <div className="animate-in fade-in duration-200">
                    <div className="mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[#f0edff] flex items-center justify-center mb-4">
                        <Building2 className="text-[#8081F6]" style={{ width: "18px", height: "18px" }} />
                      </div>
                      <h2 className="text-[20px] text-[#101828]">How will you use Baselinq?</h2>
                      <p className="text-[13px] text-gray-500 mt-1">This determines your entity's legal and billing structure</p>
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
                              ? "border-[#8081F6] bg-[#8081F6]/5 shadow-sm shadow-[#8081F6]/10"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                          )}
                        >
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
                            accountType === type.id ? "bg-[#8081F6] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                          )}>
                            {type.icon}
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "text-[14px] leading-tight transition-colors",
                              accountType === type.id ? "text-[#101828]" : "text-[#1A1A1A]"
                            )}>
                              {type.label}
                            </p>
                            <p className="text-[12px] text-gray-500 mt-0.5">{type.desc}</p>
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
                        onClick={() => setStep(2)}
                        className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={!accountType}
                        onClick={handleGoToEntityDetails}
                        className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Entity details ── */}
                {step === 4 && (
                  <div className="animate-in fade-in duration-200">
                    <div className="mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[#f0edff] flex items-center justify-center mb-4">
                        <FileText className="text-[#8081F6]" style={{ width: "18px", height: "18px" }} />
                      </div>
                      <h2 className="text-[20px] text-[#101828]">
                        {accountType === "organisation" ? "Company details" : "Your details"}
                      </h2>
                      <p className="text-[13px] text-gray-500 mt-1">
                        Used across contracts, compliance documents, and appointment letters
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (accountType === "organisation") {
                          setStep(5);
                        } else {
                          handleCredentialsSubmit(e);
                        }
                      }}
                      className="space-y-4"
                    >
                      {accountType === "organisation" && (
                        <>
                          <Field label="Company Name">
                            <input
                              type="text"
                              required
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Acme Construction (Pty) Ltd"
                              className={INPUT_CLS}
                            />
                          </Field>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Company Registration No.">
                              <input
                                type="text"
                                required
                                value={companyRegNumber}
                                onChange={(e) => setCompanyRegNumber(e.target.value)}
                                placeholder="2023/123456/07"
                                className={INPUT_CLS}
                              />
                            </Field>
                            <Field label="CK Number" optional>
                              <input
                                type="text"
                                value={ckNumber}
                                onChange={(e) => setCkNumber(e.target.value)}
                                placeholder="CK 2023/123456"
                                className={INPUT_CLS}
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="VAT Number" optional>
                              <input
                                type="text"
                                value={vatNumber}
                                onChange={(e) => setVatNumber(e.target.value)}
                                placeholder="4123456789"
                                className={INPUT_CLS}
                              />
                            </Field>
                            <Field label="Company Size" optional>
                              <select
                                value={companySize}
                                onChange={(e) => setCompanySize(e.target.value)}
                                className={INPUT_CLS}
                              >
                                <option value="">Select...</option>
                                <option value="1-10">1–10 people</option>
                                <option value="11-50">11–50 people</option>
                                <option value="51-200">51–200 people</option>
                                <option value="201-500">201–500 people</option>
                                <option value="500+">500+ people</option>
                              </select>
                            </Field>
                          </div>

                          <InfoBox>
                            These details will auto-populate into all contracts and appointment letters generated in your projects.
                          </InfoBox>
                        </>
                      )}

                      {accountType === "individual" && (
                        <>
                          <Field label="ID Number">
                            <input
                              type="text"
                              required
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              placeholder="8001015009087"
                              className={INPUT_CLS}
                            />
                          </Field>
                          <InfoBox>
                            Your ID number is used to verify your identity for professional registration and compliance purposes.
                          </InfoBox>
                        </>
                      )}

                      <SectionDivider label="Address & Contact" />

                      <Field label="Physical Address" optional>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Street Name"
                          className={INPUT_CLS}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="City" optional>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Johannesburg"
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Province / State" optional>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="Gauteng"
                            className={INPUT_CLS}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Postal Code" optional>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="2001"
                            className={INPUT_CLS}
                          />
                        </Field>
                        <Field label="Phone Number" optional>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+27 11 ..."
                            className={INPUT_CLS}
                          />
                        </Field>
                      </div>

                      <SectionDivider label="Professional Registration" />

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Professional Body">
                          <select
                            value={professionalBody}
                            onChange={(e) => setProfessionalBody(e.target.value)}
                            className={INPUT_CLS}
                          >
                            <option value="">Select...</option>
                            {PROFESSIONAL_BODIES.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Registration Number" optional>
                          <input
                            type="text"
                            value={professionalRegNumber}
                            onChange={(e) => setProfessionalRegNumber(e.target.value)}
                            placeholder="e.g. P 12345"
                            className={INPUT_CLS}
                          />
                        </Field>
                      </div>

                      <SectionDivider label="Insurance Certificate" />

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
                          <button
                            type="button"
                            onClick={() => setInsuranceCertificate(null)}
                            className="text-gray-400 hover:text-gray-600 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:border-[#8081F6]/40 hover:text-[#8081F6] transition-all"
                        >
                          <Upload className="w-4 h-4" />
                          Upload certificate, PDF or image (optional)
                        </button>
                      )}

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

                      {error && (
                        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStep(3)}
                          className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={signupMutation.isPending}
                          className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {signupMutation.isPending ? "Saving..." : accountType === "organisation" ? "Continue" : "Complete Signup"}
                          {!signupMutation.isPending && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ── STEP 5: Team members (organisations only) ── */}
                {step === 5 && accountType === "organisation" && (
                  <div className="animate-in fade-in duration-200">
                    <div className="mb-7">
                      <div className="w-10 h-10 rounded-xl bg-[#f0edff] flex items-center justify-center mb-4">
                        <Users className="text-[#8081F6]" style={{ width: "18px", height: "18px" }} />
                      </div>
                      <h2 className="text-[20px] text-[#101828]">Invite your team</h2>
                      <p className="text-[13px] text-gray-500 mt-1">Add colleagues to your organisation on Baselinq</p>
                    </div>

                    <InfoBox>
                      Invites are optional. You can always add team members later from your organisation settings.
                    </InfoBox>

                    <div className="space-y-2 mt-4">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/40"
                        >
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
                              {roles.map((r) => (
                                <option key={r.code} value={r.code}>{r.name}</option>
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
                      className="mt-3 flex items-center gap-2 text-[13px] text-[#8081F6] hover:text-[#6c6de9] transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add another member
                    </button>

                    {error && (
                      <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={signupMutation.isPending}
                        onClick={(e) => handleCredentialsSubmit(e as any)}
                        className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {signupMutation.isPending ? "Creating account..." : "Complete Signup"}
                        {!signupMutation.isPending && <ArrowRight className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={signupMutation.isPending}
                      onClick={(e) => handleCredentialsSubmit(e as any)}
                      className="mt-3 w-full text-center text-[13px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                      Skip for now
                    </button>
                  </div>
                )}

                {/* ── FINISH STEP: Welcome ── */}
                {isFinishStep && (
                  <div className="animate-in fade-in duration-300 text-center py-4">
                    {/* Animated success circle */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-[#f0edff] flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-[#8081F6] flex items-center justify-center shadow-lg shadow-[#8081F6]/30">
                            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#f0edff] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-[#8081F6]" />
                        </div>
                      </div>
                    </div>

                    <h2 className="text-[22px] text-[#101828] mb-2">
                      Welcome to Baselinq{name ? `, ${name.split(" ")[0]}` : ""}!
                    </h2>
                    <p className="text-[13px] text-gray-500 max-w-sm mx-auto mb-8">
                      Your account is ready. You can now manage projects, collaborate with your team, and let AI handle the paperwork.
                    </p>

                    {/* Summary pills */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                      {selectedRole && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0edff] text-[12px] text-[#5b5bcc]">
                          {selectedRole.icon}
                          {selectedRole.label}
                        </span>
                      )}
                      {accountType && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-[12px] text-gray-600">
                          {accountType === "organisation" ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          {accountType === "organisation" ? "Organisation" : "Individual"}
                        </span>
                      )}
                      {companyName && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-[12px] text-gray-600">
                          <Building2 className="w-3.5 h-3.5" />
                          {companyName}
                        </span>
                      )}
                    </div>

                    {/* What's next */}
                    <div className="text-left bg-gray-50/80 rounded-xl border border-gray-100 p-4 mb-7 space-y-3">
                      <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-3">What's next</p>
                      {[
                        "Create your first project",
                        "Upload contracts and drawings",
                        "Invite appointed companies",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#8081F6]/10 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-[#8081F6]" />
                          </div>
                          <span className="text-[13px] text-gray-600">{item}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => navigate("/login")}
                      className="w-full py-3 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#8081F6]/20"
                    >
                      Go to Sign In
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            {!isFinishStep && (
              <p className="text-center text-[12px] text-gray-400 mt-5">
                By creating an account you agree to our{" "}
                <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Terms of Service</span>{" "}
                and{" "}
                <span className="underline cursor-pointer hover:text-gray-600 transition-colors">Privacy Policy</span>.
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
