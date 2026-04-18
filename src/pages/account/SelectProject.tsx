import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useFetch from "@/hooks/useFetch";
import { useUserRoleStore } from "@/store/useUserRoleStore";
import { fetchData, updateProfile, orgInviteMember, getPresignedUrl, uploadFileToPresignedUrl } from "@/lib/Api";
import { Button } from "@/components/ui/button";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen, Plus, ChevronRight, MapPin, Check, X,
  Compass, Layers, Map, Zap, HardHat, ClipboardList,
  Calculator, Briefcase, Building2, User, FileText,
  Upload, Info, UserPlus, Trash2, CalendarIcon, ArrowRight, LayoutDashboard, Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteProject } from "@/lib/Api";
import { toast } from "sonner";

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.5702 11.8508C13.6691 12.2307 12.2372 13.6627 11.8573 15.5638C11.4773 13.6627 10.0454 12.2307 8.14429 11.8508C10.0454 11.4709 11.4773 10.0389 11.8573 8.13782C12.2372 10.0389 13.6691 11.4709 15.5702 11.8508Z" fill="currentColor" />
    <path d="M25.0651 11.5748C23.4498 10.4996 23.0165 10.4996 21.4034 11.5748C22.4786 9.95954 22.4786 9.52623 21.4034 7.91309C23.0186 8.98828 23.452 8.98828 25.0651 7.91309C23.9899 9.52623 23.9899 9.96165 25.0651 11.5748Z" fill="currentColor" />
    <path d="M16.6377 22.8113C15.0224 21.7361 14.5891 21.7361 12.976 22.8113C14.0512 21.1961 14.0512 20.7628 12.976 19.1496C14.5912 20.2248 15.0246 20.2248 16.6377 19.1496C15.5625 20.7628 15.5625 21.1982 16.6377 22.8113Z" fill="currentColor" />
    <path d="M28.6566 18.1159C27.2211 17.1586 26.8306 17.1586 25.3973 18.1159C26.3545 16.6804 26.3545 16.2899 25.3973 14.8566C26.8327 15.8138 27.2232 15.8138 28.6566 14.8566C27.6994 16.292 27.6994 16.6797 28.6566 18.1159Z" fill="currentColor" />
  </svg>
);
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRoles } from "@/hooks/useRoles";
import AiIcon from "@/components/icons/AiIcon";

// ── Constants ────────────────────────────────────────────────────────────────

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

const ACCOUNT_TYPES = [
  { id: "organisation" as const, label: "Organisation", desc: "A registered company, firm or practice", icon: <Building2 className="w-5 h-5" /> },
  { id: "individual" as const, label: "Individual / Sole Proprietor", desc: "Working independently", icon: <User className="w-5 h-5" /> },
];

const PROFESSIONAL_BODIES = ["SACAP", "ECSA", "ASAQS", "CIDB", "SACPCMP", "Other", "None"];

const INPUT_CLS =
  "w-full px-4 py-3 bg-[#f5f5f8] border border-transparent rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8081F6]/20 focus:border-[#8081F6]/30 focus:bg-white transition-all";

const LABEL_CLS = "block text-xs text-gray-500 mb-1.5";

type AccountType = "organisation" | "individual";
interface ProjectUser { id: string; name: string; email: string; position: string; }

// ── Complete Profile Modal ────────────────────────────────────────────────────

function CompleteProfileModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { roles } = useRoles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Role
  const [role, setRole] = useState("");

  // Step 2 — Account type
  const [accountType, setAccountType] = useState<AccountType | "">("");

  // Step 3 — Details
  const [professionalBody, setProfessionalBody] = useState("");
  const [professionalRegNumber, setProfessionalRegNumber] = useState("");
  const [insuranceCertificate, setInsuranceCertificate] = useState<File | null>(null);
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | undefined>();
  const [insuranceCalendarOpen, setInsuranceCalendarOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [ckNumber, setCkNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Step 4 — Invite (org only)
  const [users, setUsers] = useState<ProjectUser[]>([
    { id: crypto.randomUUID(), name: "", email: "", position: "" },
  ]);

  const CLIENT_INVITE_CODES = ["CLIENT", "CPM", "ADMIN", "VIEWER", "LIMITED", "LIMITED_VIEWER"];
  const isClientOrContractor = role === "client" || role === "contractor";
  const inviteRoles = (() => {
    const seenCodes = new Set<string>();
    return roles.filter((r) => {
      if (!r.code) return false;
      if (!(isClientOrContractor ? CLIENT_INVITE_CODES.includes(r.code) : !CLIENT_INVITE_CODES.includes(r.code))) return false;
      if (seenCodes.has(r.code)) return false;
      seenCodes.add(r.code);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const totalSteps = accountType === "organisation" ? 4 : 3;

  const handleGoToDetails = () => {
    if (!professionalBody) {
      const sel = ROLES.find((r) => r.id === role);
      if (sel?.body) setProfessionalBody(sel.body);
    }
    setStep(3);
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      let insuranceS3Key: string | undefined;
      let insuranceFileName: string | undefined;

      // 1. Upload insurance if selected
      if (insuranceCertificate) {
        const presigned = await getPresignedUrl({
          filename: insuranceCertificate.name,
          content_type: insuranceCertificate.type,
          folder: "insurance",
        });
        await uploadFileToPresignedUrl(
          presigned.upload_url,
          insuranceCertificate,
          insuranceCertificate.type
        );
        insuranceS3Key = presigned.key;
        insuranceFileName = insuranceCertificate.name;
      }

      const payload: Record<string, any> = {
        role,
        account_type: accountType,
        professional_body: professionalBody || undefined,
        professional_reg_number: professionalRegNumber || undefined,
        insurance_expiry: insuranceExpiry ? format(insuranceExpiry, "yyyy-MM-dd") : undefined,
        insurance_s3_key: insuranceS3Key,
        insurance_file_name: insuranceFileName,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        postal_code: postalCode || undefined,
        phone_number: phoneNumber || undefined,
      };
      if (accountType === "organisation") {
        payload.company_name = companyName;
        payload.company_reg_number = companyRegNumber || undefined;
        payload.ck_number = ckNumber || undefined;
        payload.vat_number = vatNumber || undefined;
        payload.company_size = companySize || undefined;
      } else {
        payload.id_number = idNumber || undefined;
      }
      await updateProfile(payload);

      // Send team invites via dedicated endpoint (duplicate-safe, same flow as org page)
      if (accountType === "organisation") {
        const validInvites = users.filter((m) => m.email.trim());
        await Promise.all(
          validInvites.map((m) =>
            orgInviteMember({ name: m.name, email: m.email, position: m.position }).catch(() => { })
          )
        );
      }

      onDone();
    } catch (err: unknown) {
      console.error("Profile update error:", err);
      const respData = (err as { response?: { data?: any } })?.response?.data;
      let msg = "Failed to save profile.";

      if (respData) {
        if (typeof respData === "string") {
          msg = respData;
        } else if (respData.message) {
          msg = respData.message;
        } else if (typeof respData === "object") {
          // DRF often returns { "field": ["error message"] }
          const firstField = Object.keys(respData)[0];
          const firstError = respData[firstField];
          if (Array.isArray(firstError)) {
            msg = `${firstField}: ${firstError[0]}`;
          } else if (typeof firstError === "object") {
            // Handle nested errors like { "organization": { "name": ["error"] } }
            const nestedKey = Object.keys(firstError)[0];
            const nestedError = firstError[nestedKey];
            msg = `${firstField} ${nestedKey}: ${Array.isArray(nestedError) ? nestedError[0] : nestedError}`;
          } else {
            msg = JSON.stringify(respData);
          }
        }
      } else {
        msg = (err as { message?: string })?.message || msg;
      }

      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const STEP_LABELS = accountType === "organisation"
    ? ["Your Role", "Account Type", "Company Details", "Invite Team"]
    : ["Your Role", "Account Type", "Your Details"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-[5vh_5vw]">
      <div className="w-full h-full flex rounded-2xl overflow-hidden shadow-2xl" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>

        {/* ── Left dark panel ── */}
        <aside className="hidden lg:flex w-[42%] shrink-0 flex-col h-full"
          style={{ background: "linear-gradient(145deg, #1a1c3d 0%, #11132d 100%)" }}>

          {/* Logo + close */}
          <div className="px-10 pt-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white/10 rounded-[10px] flex items-center justify-center shrink-0 border border-white/10">
                <img src="/LOGO-ai.png" alt="Baselinq" className="w-full h-full object-contain" />
              </div>
              <span className="text-[15px] text-white/90 tracking-tight">baselinq</span>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Headline + stepper */}
          <div className="flex-1 flex flex-col justify-center px-10">
            <h1 className="text-[32px] font-normal text-white leading-tight tracking-tight">
              Complete your<br />profile.
            </h1>
            <p className="text-[14px] text-white/50 mt-3 leading-relaxed max-w-xs">
              A few more details so you can start creating and managing projects.
            </p>

            {/* Vertical stepper */}
            <nav className="mt-10 space-y-0">
              {STEP_LABELS.map((label, i) => {
                const sId = i + 1;
                const done = step > sId;
                const active = step === sId;
                return (
                  <React.Fragment key={sId}>
                    <div className="flex items-center gap-3 py-2">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] transition-all duration-200",
                        done || active ? "bg-[#8081F6] text-white" : "bg-white/10 text-white/40 border border-white/10"
                      )}>
                        {done ? <Check className="w-3.5 h-3.5" /> : sId}
                      </div>
                      <p className={cn(
                        "text-[13px] leading-tight transition-colors",
                        active ? "text-white" : done ? "text-white/70" : "text-white/35"
                      )}>
                        {label}
                      </p>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-[#8081F6] shrink-0 ml-auto" />}
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div style={{ marginLeft: "13px", paddingLeft: "10px", height: "12px", borderLeft: `2px solid ${done ? "#8081F6" : "rgba(255,255,255,0.1)"}` }} />
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          {/* Bottom */}
          <div className="px-10 pb-10">
            <div className="border-t border-white/10 pt-6">
              <p className="text-[11px] text-white/25 leading-relaxed">
                Your details will auto-populate into contracts and appointment letters.
              </p>
            </div>
          </div>
        </aside>

        {/* ── Right white panel ── */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">

          {/* Mobile progress bar / header */}
          <div className="lg:hidden border-b border-gray-100 px-6 py-4 shrink-0 bg-white">
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: (i + 1) <= step ? "#8081F6" : "#e5e7eb" }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-gray-700">
                Step {step} of {totalSteps}: {STEP_LABELS[step - 1]}
              </span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Step indicator + scrollable content */}
          <div className="flex-1 overflow-y-auto px-10 py-8">
            <div className="min-h-full flex flex-col justify-center">
              <div className="w-full max-w-[480px] mx-auto">

                {/* Multi-step progress indicator */}
                <div className="flex items-center gap-2 mb-8">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className="transition-all duration-300 rounded-full"
                      style={{
                        width: (i + 1) === step ? "20px" : "8px",
                        height: "8px",
                        background: (i + 1) <= step ? "#8081F6" : "#e5e7eb",
                      }}
                    />
                  ))}
                  <span className="ml-2 text-xs text-gray-400 font-medium">
                    Step {step} of {totalSteps}
                  </span>
                </div>

                {error && (
                  <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* ── Step 1: Role ── */}
                {step === 1 && (
                  <div className="animate-in fade-in duration-200">
                    <p className="text-[13px] text-gray-500 mb-5">Select your profession — we'll personalise your workspace around it.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all group",
                            role === r.id ? "border-[#8081F6] bg-[#8081F6]/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                            role === r.id ? "bg-[#8081F6] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                          )}>
                            {r.icon}
                          </div>
                          <span className={cn("text-[13px] flex-1 leading-snug", role === r.id ? "text-gray-800" : "text-gray-600")}>
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
                  </div>
                )}

                {/* ── Step 2: Account type ── */}
                {step === 2 && (
                  <div className="animate-in fade-in duration-200">
                    <p className="text-[13px] text-gray-500 mb-5">This determines your entity's legal and billing structure.</p>
                    <div className="space-y-3">
                      {ACCOUNT_TYPES.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setAccountType(type.id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all group",
                            accountType === type.id ? "border-[#8081F6] bg-[#8081F6]/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                          )}
                        >
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all",
                            accountType === type.id ? "bg-[#8081F6] text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                          )}>
                            {type.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-[14px] text-gray-800">{type.label}</p>
                            <p className="text-[12px] text-gray-400 mt-0.5">{type.desc}</p>
                          </div>
                          {accountType === type.id && (
                            <div className="w-5 h-5 rounded-full bg-[#8081F6] flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 3: Details ── */}
                {step === 3 && (
                  <div className="animate-in fade-in duration-200 space-y-4">
                    {accountType === "organisation" && (
                      <>
                        <div>
                          <label className={LABEL_CLS}>Company Name</label>
                          <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Construction (Pty) Ltd" className={INPUT_CLS} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={LABEL_CLS}>Company Registration No.</label>
                            <input type="text" value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)} placeholder="2023/123456/07" className={INPUT_CLS} />
                          </div>
                          <div>
                            <label className={LABEL_CLS}>CK Number <span className="text-gray-300">(optional)</span></label>
                            <input type="text" value={ckNumber} onChange={(e) => setCkNumber(e.target.value)} placeholder="CK 2023/123456" className={INPUT_CLS} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={LABEL_CLS}>VAT Number <span className="text-gray-300">(optional)</span></label>
                            <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="4123456789" className={INPUT_CLS} />
                          </div>
                          <div>
                            <label className={LABEL_CLS}>Company Size <span className="text-gray-300">(optional)</span></label>
                            <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className={INPUT_CLS}>
                              <option value="">Select...</option>
                              <option value="1-10">1–10 people</option>
                              <option value="11-50">11–50 people</option>
                              <option value="51-200">51–200 people</option>
                              <option value="201-500">201–500 people</option>
                              <option value="500+">500+ people</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#f0edff] border border-[#d6d3ff]">
                          <Info className="w-3.5 h-3.5 text-[#8081F6] shrink-0 mt-0.5" />
                          <p className="text-[12px] text-[#5b5bcc] leading-snug">These details will auto-populate into all contracts and appointment letters.</p>
                        </div>
                      </>
                    )}

                    {accountType === "individual" && (
                      <div>
                        <label className={LABEL_CLS}>ID Number</label>
                        <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="8001015009087" className={INPUT_CLS} />
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Address & Contact</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    <div>
                      <label className={LABEL_CLS}>Physical Address <span className="text-gray-300">(optional)</span></label>
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Street Name" className={INPUT_CLS} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>City <span className="text-gray-300">(optional)</span></label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Johannesburg" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Province / State <span className="text-gray-300">(optional)</span></label>
                        <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="Gauteng" className={INPUT_CLS} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Postal Code <span className="text-gray-300">(optional)</span></label>
                        <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="2001" className={INPUT_CLS} />
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Phone Number <span className="text-gray-300">(optional)</span></label>
                        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+27 11 ..." className={INPUT_CLS} />
                      </div>
                    </div>

                    {/* Professional */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Professional Registration</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL_CLS}>Professional Body</label>
                        <select value={professionalBody} onChange={(e) => setProfessionalBody(e.target.value)} className={INPUT_CLS}>
                          <option value="">Select...</option>
                          {PROFESSIONAL_BODIES.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL_CLS}>Registration Number <span className="text-gray-300">(optional)</span></label>
                        <input type="text" value={professionalRegNumber} onChange={(e) => setProfessionalRegNumber(e.target.value)} placeholder="e.g. P 12345" className={INPUT_CLS} />
                      </div>
                    </div>

                    {/* Insurance */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Insurance Certificate</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setInsuranceCertificate(e.target.files?.[0] ?? null)} />
                    {insuranceCertificate ? (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{insuranceCertificate.name}</span>
                        <button type="button" onClick={() => setInsuranceCertificate(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
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

                    <div>
                      <label className={LABEL_CLS}>Insurance Expiry Date <span className="text-gray-300">(optional)</span></label>
                      <Popover open={insuranceCalendarOpen} onOpenChange={setInsuranceCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className={cn(INPUT_CLS, "flex items-center justify-between text-left", !insuranceExpiry && "text-gray-400")}>
                            <span>{insuranceExpiry ? format(insuranceExpiry, "dd MMM yyyy") : "Pick a date"}</span>
                            <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={insuranceExpiry} onSelect={(d) => { setInsuranceExpiry(d); setInsuranceCalendarOpen(false); }} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Invite team (org only) ── */}
                {step === 4 && accountType === "organisation" && (
                  <div className="animate-in fade-in duration-200">
                    <p className="text-[13px] text-gray-500 mb-4">Invite users, you can also do this later from settings.</p>
                    <div className="space-y-2">
                      {users.map((member) => (
                        <div key={member.id} className="flex items-start gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/40">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <input type="text" placeholder="Full name" value={member.name} onChange={(e) => setUsers((p) => p.map((m) => m.id === member.id ? { ...m, name: e.target.value } : m))} className={INPUT_CLS} />
                            <input type="email" placeholder="Email address" value={member.email} onChange={(e) => setUsers((p) => p.map((m) => m.id === member.id ? { ...m, email: e.target.value } : m))} className={INPUT_CLS} />
                            <select value={member.position} onChange={(e) => setUsers((p) => p.map((m) => m.id === member.id ? { ...m, position: e.target.value } : m))} className={INPUT_CLS}>
                              <option value="">Position...</option>
                              {inviteRoles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                              <option value="admin">Administrator</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          {users.length > 1 && (
                            <button type="button" onClick={() => setUsers((p) => p.filter((m) => m.id !== member.id))} className="mt-2.5 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setUsers((p) => [...p, { id: crypto.randomUUID(), name: "", email: "", position: "" }])} className="mt-3 flex items-center gap-2 text-[13px] text-[#8081F6] hover:text-[#6c6de9] transition-colors">
                      <UserPlus className="w-3.5 h-3.5" />
                      Add another user
                    </button>
                  </div>
                )}
              </div>
            </div>{/* closes min-h-full center wrapper */}
          </div>{/* closes flex-1 overflow-y-auto scroll area */}

          {/* Footer */}
          <div className="px-10 py-6 border-t border-gray-100 bg-slate-50/50 shrink-0">
            <div className="max-w-[480px] mx-auto flex gap-3">
              {step > 1 && (
                <button type="button" onClick={() => setStep((s) => (s - 1) as any)} className="py-2.5 px-5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-all">
                  Back
                </button>
              )}

              {/* Step 1 → 2 */}
              {step === 1 && (
                <button type="button" disabled={!role} onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 2 → 3 */}
              {step === 2 && (
                <button type="button" disabled={!accountType} onClick={handleGoToDetails}
                  className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Step 3 → save (individual) or → 4 (org) */}
              {step === 3 && (
                accountType === "organisation" ? (
                  <button type="button" disabled={!companyName} onClick={() => setStep(4)}
                    className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" disabled={saving} onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? "Saving..." : "Complete Profile"} {!saving && <Check className="w-4 h-4" />}
                  </button>
                )
              )}

              {/* Step 4 → save */}
              {step === 4 && (
                <>
                  <button type="button" disabled={saving} onClick={handleSave}
                    className="flex-1 py-2.5 rounded-xl bg-[#8081F6] text-white text-sm hover:bg-[#6c6de9] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? "Saving..." : "Complete Profile"} {!saving && <Check className="w-4 h-4" />}
                  </button>
                  <button type="button" disabled={saving} onClick={handleSave} className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors px-2 disabled:opacity-50">
                    Skip invites
                  </button>
                </>
              )}
            </div>
          </div>{/* closes footer */}
        </div>{/* closes flex-1 flex-col bg-white right panel */}
      </div>{/* closes w-full h-full flex container */}
    </div>
  );
}

// ── SelectProject ─────────────────────────────────────────────────────────────

const SelectProject = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { setUserRole } = useUserRoleStore();
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isProfileReady = !userLoading && !!user;

  const { data: projectsData, isLoading: projectsLoading } = useFetch(
    user?.id && isProfileReady ? `projects/?userId=${user.id}` : "",
    { enabled: !!user?.id && !!isProfileReady }
  );
  const projects: any[] = projectsData?.results || projectsData || [];

  const selectedProjectId = localStorage.getItem("selectedProjectId") || "";

  const handleSelectProject = async (project: any) => {
    const pId = String(project._id || project.id);
    localStorage.setItem("selectedProjectId", pId);
    localStorage.setItem("projectLocation", project.location || "");
    if (user?.id) {
      try {
        const response = await fetchData(`projects/${pId}/user-role/?userId=${user.id}`);
        if (response?.roleName) {
          const raw = response.roleName as string;
          const normalized = /^(client.?owner|owner)$/i.test(raw.trim()) ? "CLIENT" : raw;
          setUserRole(normalized);
        }
      } catch { }
    }
    window.dispatchEvent(new Event("project-change"));
    navigate("/");
  };

  const handleProfileDone = async () => {
    setShowModal(false);
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const pId = String(projectToDelete._id || projectToDelete.id);
      await deleteProject(pId);
      toast.success("Project deleted successfully");

      // Clear selection if this project was active
      if (selectedProjectId === pId) {
        localStorage.removeItem("selectedProjectId");
        localStorage.removeItem("projectLocation");
      }

      await queryClient.invalidateQueries({ queryKey: [`projects/?userId=${user?.id}`] });
      setShowDeleteDialog(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <AwesomeLoader message="Loading..." />
      </div>
    );
  }

  // ── Profile incomplete screen ──
  // Only show when the user hasn't completed onboarding AND has no projects
  // (users invited by an owner may have role=null but should see their projects)
  if (!projectsLoading && projects.length === 0 && user && !user.role) {
    return (
      <>
        <div className="max-w-4xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-[#f0edff] flex items-center justify-center mx-auto mb-5">
              <SparkleIcon className="w-8 h-8 text-[#8081F6]" />
            </div>
            <h2 className="text-[22px] font-normal tracking-tight text-foreground mb-2">
              Complete your profile first
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Before you can create or join a project, we need a few more details about you — your role, account type, and professional information.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2 mx-auto"
            >
              <AiIcon size={16} className="text-white" />
              Complete Profile
            </Button>
          </div>
        </div>

        {showModal && (
          <CompleteProfileModal
            onClose={() => setShowModal(false)}
            onDone={handleProfileDone}
          />
        )}
      </>
    );
  }

  // ── Normal project selection ──
  return (
    <>
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-normal tracking-tight text-foreground">Select Project</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose a project to enter your workspace.</p>
          </div>
        </div>

        {projectsLoading ? (
          <div className="flex items-center justify-center py-24">
            <AwesomeLoader message="Loading projects..." />
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-border rounded-xl bg-white shadow-sm p-14 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f0edff] flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-normal text-foreground">No projects yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Create your first project to start managing tasks, documents, and your team.
              </p>
            </div>
            <Button
              onClick={() => navigate("/create-project")}
              className="h-9 px-5 rounded-lg bg-primary text-white hover:bg-primary/90 font-normal text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((project: any) => {
                const pId = String(project._id || project.id);
                const isActive = selectedProjectId === pId;
                const isDraft = project.status === "Draft" || project.status === "draft";
                return (
                  <button
                    key={pId}
                    onClick={() => handleSelectProject(project)}
                    className={cn(
                      "group text-left border rounded-xl bg-white shadow-sm px-5 py-4 hover:border-primary/40 hover:shadow-md transition-all duration-200",
                      isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#f0edff] flex items-center justify-center shrink-0 mt-0.5">
                          <FolderOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-normal text-foreground truncate">{project.name || "Untitled Project"}</p>
                          {project.location && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              {/* <MapPin className="w-3 h-3" /> */}
                              {project.location}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {isDraft ? (
                              <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Draft</span>
                            ) : (
                              <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Active</span>
                            )
                            }
                            {isActive && (
                              <span className="text-[9px] text-primary bg-primary/5 border border-primary/20 px-1.5 py-0.5 rounded uppercase tracking-wider">Current</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                          isActive ? "bg-primary text-white" : "bg-slate-100 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        )}>
                          {isActive ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                            setShowDeleteDialog(true);
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => navigate("/create-project")}
              className="w-full group border-2 border-dashed border-border rounded-xl bg-slate-50/50 px-6 py-8 hover:border-primary/40 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mb-3 group-hover:scale-110 transition-transform duration-200">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[15px] font-normal text-foreground">Create New Project</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">Start a new construction workspace</p>
              </div>
            </button>
          </div>
        )}

        {showModal && (
          <CompleteProfileModal
            onClose={() => setShowModal(false)}
            onDone={handleProfileDone}
          />
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default SelectProject;
