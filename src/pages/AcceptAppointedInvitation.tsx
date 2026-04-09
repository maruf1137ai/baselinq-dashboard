import React, { useState, useEffect } from "react";
import { useRoles } from "@/hooks/useRoles";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { Plus, X, Building2, User, Eye, EyeOff, Check, ChevronRight, ArrowRight, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPresignedUrl, uploadFileToPresignedUrl } from "@/lib/Api";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

type AccountType = "organisation" | "individual";

interface PersonnelEntry {
  id: string;
  name: string;
  email: string;
  position: string;
}


const ORG_STEPS = [
  { id: 1, label: "Account Setup", description: "Name & password" },
  { id: 2, label: "Account Type", description: "Company or individual?" },
  { id: 3, label: "Company Details", description: "Legal & address info" },
  { id: 4, label: "Team Members", description: "Add your personnel" },
];

const IND_STEPS = [
  { id: 1, label: "Account Setup", description: "Name & password" },
  { id: 2, label: "Account Type", description: "Company or individual?" },
  { id: 3, label: "Your Details", description: "Personal & professional info" },
];

const INPUT_CLS =
  "w-full px-4 py-3 bg-[#f5f5f8] border border-transparent rounded-xl text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8081F6]/20 focus:border-[#8081F6]/30 focus:bg-white transition-all";

const inputCls = (err = false) =>
  err
    ? "w-full px-4 py-3 border border-red-400 bg-red-50 rounded-xl text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
    : INPUT_CLS;

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

export default function AcceptAppointedInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { roles } = useRoles();

  const [info, setInfo] = useState<{
    project_name: string;
    company_name: string;
    contact_name: string;
    contact_email: string;
    invited_by: string;
    position?: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState("");

  // Account type
  const [accountType, setAccountType] = useState<AccountType | "">("");

  // Step 1 — Account
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Step 3 (org) — Company
  const [company, setCompany] = useState({
    company_name: "",
    company_registration: "",
    vat_number: "",
    office_number: "",
    role_as_per_appointment: "",
    insurance_expiry: "",
    physical_address: { street: "", city: "", province: "", postal_code: "" },
    postal_address: { street: "", city: "", province: "", postal_code: "" },
  });
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  // Step 3 (individual) — Personal details
  const [individual, setIndividual] = useState({
    id_number: "",
    phone_number: "",
    physical_address: { street: "", city: "", province: "", postal_code: "" },
  });

  // Step 4 (org) — Personnel
  const [personnel, setPersonnel] = useState<PersonnelEntry[]>([
    { id: crypto.randomUUID(), name: "", email: "", position: "" },
  ]);

  const STEPS = accountType === "individual" ? IND_STEPS : ORG_STEPS;

  useEffect(() => {
    if (!token) return;
    api.get(`/auth/accept-appointed-invitation/${token}/`)
      .then(res => {
        setInfo(res.data);
        // Pre-fill fields if we have them
        if (res.data.company_name) setCompany(c => ({ ...c, company_name: res.data.company_name }));
        if (res.data.contact_name) setName(res.data.contact_name);
        if (res.data.position) setCompany(c => ({ ...c, role_as_per_appointment: res.data.position.replace('_', ' ').split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ') }));
      })
      .catch(err => {
        setLoadError(err?.response?.data?.error || "Invalid or expired invitation link.");
      });
  }, [token]);

  const handleNext = () => {
    setStepError("");
    if (step === 1) {
      if (!name.trim()) return setStepError("Name is required.");
      if (!password) return setStepError("Password is required.");
      if (password !== passwordConfirm) return setStepError("Passwords do not match.");
      if (password.length < 8) return setStepError("Password must be at least 8 characters.");
    }
    if (step === 2) {
      if (!accountType) return setStepError("Please select an account type.");
    }
    if (step === 3 && accountType === "organisation") {
      if (!company.company_name.trim()) return setStepError("Company name is required.");
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let insurance_s3_key: string | undefined;
      let insurance_file_name: string | undefined;
      if (insuranceFile) {
        const { upload_url, key } = await getPresignedUrl({
          filename: insuranceFile.name,
          content_type: insuranceFile.type || "application/octet-stream",
          folder: "projects/insurance",
        });
        await uploadFileToPresignedUrl(upload_url, insuranceFile, insuranceFile.type || "application/octet-stream");
        insurance_s3_key = key;
        insurance_file_name = insuranceFile.name;
      }

      const payload =
        accountType === "individual"
          ? {
            name,
            password,
            password_confirm: passwordConfirm,
            account_type: "individual",
            id_number: individual.id_number,
            phone_number: individual.phone_number,
            physical_address: individual.physical_address,
            // send empty company fields so backend stores cleanly
            company_name: name,
            personnel: [],
          }
          : {
            name,
            password,
            password_confirm: passwordConfirm,
            account_type: "organisation",
            ...company,
            insurance_s3_key,
            insurance_file_name,
            personnel: personnel.filter(p => p.name.trim() || p.email.trim()),
          };

      const res = await api.post(`/auth/accept-appointed-invitation/${token}/`, payload);
      localStorage.setItem("access", res.data.tokens.access);
      localStorage.setItem("refresh", res.data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Account created and details submitted!");
      navigate("/account");
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      toast.error(Array.isArray(msg) ? msg.join(" ") : msg || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <p className="text-[#1A1A1A] mb-1">Invitation error</p>
          <p className="text-sm text-gray-500">{loadError}</p>
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

  if (!info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading invitation…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">

      {/* ══════════════════════════════ LEFT SIDEBAR ══════════════════════ */}
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

        {/* Content area */}
        <div className="flex-1 flex flex-col justify-center px-10">
          <h1 className="text-[36px] font-normal text-white leading-tight tracking-tight">
            Join the project.
          </h1>
          <p className="text-[14px] text-white/50 mt-3 leading-relaxed max-w-xs">
            You've been invited to {info?.project_name || "a project"} on Baselinq. Complete your workspace setup to get started.
          </p>

          <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#8081F6]" />
            </div>
            <div>
              <p className="text-[13px] text-white/80 font-medium">Invited by {info?.invited_by || "a team member"}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{info?.position?.replace('_', ' ') || "Project Member"}</p>
            </div>
          </div>

          {/* Stepper (Dark Version) */}
          <nav className="mt-10 space-y-1">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all duration-300",
                    done ? "bg-[#8081F6] text-white" : active ? "bg-[#8081F6] text-white shadow-lg" : "bg-white/5 text-white/20 border border-white/10"
                  )}>
                    {done ? <Check className="w-3 h-3" /> : s.id}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[13px] transition-colors",
                      done ? "text-white/60" : active ? "text-white" : "text-white/20"
                    )}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}
        <div className="px-10 pb-10">
          <div className="border-t border-white/10 pt-6 space-y-3">
            <p className="text-[13px] text-white/50">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-[#8081F6] hover:underline">
                Sign in
              </button>
            </p>
            <p className="text-[11px] text-white/25 leading-relaxed max-w-xs">
              By joining this project you agree to our{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms of Service</span>
              {" "}and{" "}
              <span className="underline cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════ RIGHT PANEL ═══════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* Mobile progress bar */}
        <div className="lg:hidden border-b border-[#ededed] px-5 py-3 shrink-0">
          <div className="flex gap-1.5 mb-2">
            {STEPS.map((s) => (
              <div key={s.id} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s.id <= step ? "#8081F6" : "#e5e7eb" }} />
            ))}
          </div>
          <p className="text-[13px] text-[#374151]">Step {step} of {STEPS.length}: {STEPS[step - 1]?.label}</p>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 py-10">
          <div className="w-full max-w-lg">

            {/* Multi-step progress indicator */}
            <div className="hidden lg:flex items-center gap-2 mb-8">
              {STEPS.map((s) => (
                <div key={s.id} className="transition-all duration-300 rounded-full"
                  style={{ width: s.id === step ? "20px" : "8px", height: "8px", background: s.id <= step ? "#8081F6" : "#e5e7eb" }} />
              ))}
              <span className="ml-2 text-xs text-gray-400 font-medium">Step {step} of {STEPS.length}</span>
            </div>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="h-8 w-8 bg-[#121212] rounded-[10px] flex items-center justify-center shrink-0">
                <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
              </div>
              <span className="text-[14px] text-[#121212] tracking-tight">baselinq</span>
            </div>

            {/* Step heading */}
            <div className="mb-7">
              <h2 className="text-2xl text-[#1A1A1A] font-normal mb-1">{STEPS[step - 1]?.label}</h2>
              <p className="text-sm text-gray-500">{STEPS[step - 1]?.description}</p>
            </div>

            {/* ── Step 1: Account Setup ── */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-[12px] text-[#9ca3af]">
                  Signing up as <span className="text-[#374151]">{info.contact_email}</span>
                </p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Full Name <span className="text-red-400">*</span></label>
                  <input className={inputCls(!name.trim() && !!stepError)} value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        className={inputCls(!!stepError && !password)}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Confirm Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        className={inputCls(!!stepError && password !== passwordConfirm)}
                        type={showPasswordConfirm ? "text" : "password"}
                        value={passwordConfirm}
                        onChange={e => setPasswordConfirm(e.target.value)}
                        placeholder="Repeat password"
                      />
                      <button type="button" onClick={() => setShowPasswordConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Account Type ── */}
            {step === 2 && (
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
            )}

            {/* ── Step 3 (Org): Company Details ── */}
            {step === 3 && accountType === "organisation" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Company Name <span className="text-red-400">*</span></label>
                  <input className={inputCls(!company.company_name.trim() && !!stepError)} value={company.company_name} onChange={e => setCompany(c => ({ ...c, company_name: e.target.value }))} placeholder="Your company name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Company Registration</label>
                    <input className={INPUT_CLS} value={company.company_registration} onChange={e => setCompany(c => ({ ...c, company_registration: e.target.value }))} placeholder="e.g. 2012/123456/07" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">VAT Number</label>
                    <input className={INPUT_CLS} value={company.vat_number} onChange={e => setCompany(c => ({ ...c, vat_number: e.target.value }))} placeholder="e.g. 4123456789" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Office Number</label>
                    <input className={INPUT_CLS} value={company.office_number} onChange={e => setCompany(c => ({ ...c, office_number: e.target.value }))} placeholder="+27 11 123 4567" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Responsibility / Role</label>
                    <input className={INPUT_CLS} value={company.role_as_per_appointment} onChange={e => setCompany(c => ({ ...c, role_as_per_appointment: e.target.value }))} placeholder="e.g. Principal Architect" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500">Physical Address</label>
                    <input className={INPUT_CLS} value={company.physical_address.street} onChange={e => setCompany(c => ({ ...c, physical_address: { ...c.physical_address, street: e.target.value } }))} placeholder="Street address" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={INPUT_CLS} value={company.physical_address.city} onChange={e => setCompany(c => ({ ...c, physical_address: { ...c.physical_address, city: e.target.value } }))} placeholder="City" />
                      <input className={INPUT_CLS} value={company.physical_address.postal_code} onChange={e => setCompany(c => ({ ...c, physical_address: { ...c.physical_address, postal_code: e.target.value } }))} placeholder="Postal code" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500">Postal Address</label>
                    <input className={INPUT_CLS} value={company.postal_address.street} onChange={e => setCompany(c => ({ ...c, postal_address: { ...c.postal_address, street: e.target.value } }))} placeholder="Street address" />
                    <div className="grid grid-cols-2 gap-2">
                      <input className={INPUT_CLS} value={company.postal_address.city} onChange={e => setCompany(c => ({ ...c, postal_address: { ...c.postal_address, city: e.target.value } }))} placeholder="City" />
                      <input className={INPUT_CLS} value={company.postal_address.postal_code} onChange={e => setCompany(c => ({ ...c, postal_address: { ...c.postal_address, postal_code: e.target.value } }))} placeholder="Postal code" />
                    </div>
                  </div>
                </div>

                {/* Insurance Certificate */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs text-gray-500">
                        Insurance Certificate <span className="text-gray-400">(optional)</span>
                      </label>
                      <label className={cn(
                        "flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-gray-200 rounded-xl text-sm cursor-pointer hover:border-[#8081F6] hover:text-[#8081F6] transition-all",
                        insuranceFile ? "border-[#8081F6] text-[#8081F6] bg-[#8081F6]/5" : "text-gray-400"
                      )}>
                        <Paperclip className="w-4 h-4 shrink-0" />
                        <span className="truncate text-xs">
                          {insuranceFile ? insuranceFile.name : "Upload certificate"}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={e => setInsuranceFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {insuranceFile && (
                        <button
                          type="button"
                          onClick={() => setInsuranceFile(null)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs text-gray-500">Expiry Date</label>
                      <input
                        type="date"
                        className={INPUT_CLS}
                        value={company.insurance_expiry}
                        onChange={e => setCompany(c => ({ ...c, insurance_expiry: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3 (Individual): Personal Details ── */}
            {step === 3 && accountType === "individual" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">ID Number</label>
                    <input
                      className={INPUT_CLS}
                      value={individual.id_number}
                      onChange={e => setIndividual(i => ({ ...i, id_number: e.target.value }))}
                      placeholder="8001015009087"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Phone Number</label>
                    <input
                      className={INPUT_CLS}
                      value={individual.phone_number}
                      onChange={e => setIndividual(i => ({ ...i, phone_number: e.target.value }))}
                      placeholder="+27 11 ..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Physical Address <span className="text-gray-400">(optional)</span></label>
                  <input
                    className={INPUT_CLS}
                    value={individual.physical_address.street}
                    onChange={e => setIndividual(i => ({ ...i, physical_address: { ...i.physical_address, street: e.target.value } }))}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className={INPUT_CLS}
                    value={individual.physical_address.city}
                    onChange={e => setIndividual(i => ({ ...i, physical_address: { ...i.physical_address, city: e.target.value } }))}
                    placeholder="City"
                  />
                  <input
                    className={INPUT_CLS}
                    value={individual.physical_address.postal_code}
                    onChange={e => setIndividual(i => ({ ...i, physical_address: { ...i.physical_address, postal_code: e.target.value } }))}
                    placeholder="Postal code"
                  />
                </div>
              </div>
            )}

            {/* ── Step 4 (Org): Team Members ── */}
            {step === 4 && accountType === "organisation" && (
              <div className="space-y-3">
                <p className="text-[12px] text-[#9ca3af]">Optional, add the people who will work on this project.</p>
                {personnel.map((p) => (
                  <div key={p.id} className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                    <div className="flex justify-end mb-2">
                      {personnel.length > 1 && (
                        <button type="button" onClick={() => setPersonnel(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Name</label>
                        <input className={INPUT_CLS} value={p.name} onChange={e => setPersonnel(prev => prev.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} placeholder="Full name" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                        <input className={INPUT_CLS} value={p.email} type="email" onChange={e => setPersonnel(prev => prev.map(x => x.id === p.id ? { ...x, email: e.target.value } : x))} placeholder="email@firm.co.za" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Position</label>
                        <select className={INPUT_CLS} value={p.position} onChange={e => setPersonnel(prev => prev.map(x => x.id === p.id ? { ...x, position: e.target.value } : x))}>
                          <option value="">Select</option>
                          {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPersonnel(prev => [...prev, { id: crypto.randomUUID(), name: "", email: "", position: "" }])}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[13px] text-gray-400 hover:border-[#8081F6] hover:text-[#8081F6] transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Team Member
                </button>
              </div>
            )}

            {/* Error */}
            {stepError && (
              <p className="text-[13px] text-red-500 mt-3">{stepError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => { setStep(s => s - 1); setStepError(""); }}
                  className="py-2.5 px-5 border border-gray-200 text-[#374151] text-sm rounded-xl hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
              )}
              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2.5 bg-[#8081F6] text-white text-sm rounded-xl hover:bg-[#6c6de9] transition-all flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#8081F6] text-white text-sm rounded-xl hover:bg-[#6c6de9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Submitting…" : "Complete Setup"}
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
