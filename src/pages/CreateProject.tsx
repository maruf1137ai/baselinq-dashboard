import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  MapPin,
  Pencil,
  X,
  FileText,
  Calendar as CalendarIcon,
  Rocket,
  Info,
  CloudUpload,
  ChevronDown,
  DollarSign,
  LogOut,
  Building2,
  User,
  Phone,
  Mail,
  CreditCard,
  ScrollText,
  Plus,
  Search,
  Loader2,
  ChevronsUpDown,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { validateFile, registerS3Document, ALLOWED_FILE_EXTENSIONS, lookupCompany, inviteClient, inviteAppointedCompany, postData } from "@/lib/Api";
import { useS3Upload } from "@/hooks/useS3Upload";
import { useCreateProject } from "@/hooks/useProjects";
import { useRoles } from "@/hooks/useRoles";
import { toast } from "sonner";
import {
  format,
  parseISO,
  differenceInDays,
  differenceInMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import useFetch from "@/hooks/useFetch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  project_number: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  total_budget: string;
  currency: string;
  fx_rate: string;
  retention_rate: string;
  vat_rate: string;
  contract_type: string;
}

interface FormErrors {
  name?: string;
  project_number?: string;
  start_date?: string;
  end_date?: string;
  date_range?: string;
  total_budget?: string;
  attachments?: string;
}

interface PersonnelState {
  name: string;
  email: string;
  position: string;
}

interface AddressState {
  street: string;
  city: string;
  province: string;
  postal_code: string;
}


interface ClientFormState {
  company_name: string;
  company_registration: string;
  vat_number: string;
  physical_address: AddressState;
  postal_address: AddressState;
  office_number: string;
  client: PersonnelState;
  client_representative: PersonnelState;
}

interface ClientErrors {
  company_name?: string;
}

interface AppointedFormState {
  company_name: string;
  company_registration: string;
  vat_number: string;
  physical_address: AddressState;
  postal_address: AddressState;
  office_number: string;
  role_as_per_appointment: string;
  principal: PersonnelState;
  technical_representative: PersonnelState;
}

interface TaskOrderState {
  brief: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Project Details", description: "Name, number, and location" },
  { id: 2, label: "Scope of Works", description: "Description & requirements" },
  { id: 3, label: "Client Details", description: "Client company & contacts" },
  { id: 4, label: "Appointed Company", description: "Professional firm & contacts" },
  { id: 5, label: "Documents", description: "Upload project files" },
  { id: 6, label: "Financials & Timeline", description: "Budget, dates, and rates" },
];

const CONTRACT_TYPES = ["JBCC", "NEC", "FIDIC", "GCC"];
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];
const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const DEFAULT_ADDRESS: AddressState = { street: "", city: "", province: "", postal_code: "" };

const DEFAULT_PERSONNEL: PersonnelState = { name: "", email: "", position: "" };

const DEFAULT_FORM: FormState = {
  name: "",
  project_number: "",
  description: "",
  location: "",
  start_date: "",
  end_date: "",
  total_budget: "",
  currency: "ZAR",
  fx_rate: "1",
  retention_rate: "5",
  vat_rate: "15",
  contract_type: "JBCC",
};

const DEFAULT_CLIENT_FORM: ClientFormState = {
  company_name: "",
  company_registration: "",
  vat_number: "",
  physical_address: { ...DEFAULT_ADDRESS },
  postal_address: { ...DEFAULT_ADDRESS },
  office_number: "",
  client: { ...DEFAULT_PERSONNEL },
  client_representative: { ...DEFAULT_PERSONNEL },
};

const DEFAULT_APPOINTED_FORM: AppointedFormState = {
  company_name: "",
  company_registration: "",
  vat_number: "",
  physical_address: { ...DEFAULT_ADDRESS },
  postal_address: { ...DEFAULT_ADDRESS },
  office_number: "",
  role_as_per_appointment: "",
  principal: { ...DEFAULT_PERSONNEL },
  technical_representative: { ...DEFAULT_PERSONNEL },
};



// ── Helpers ────────────────────────────────────────────────────────────────────

function generateProjectNumber(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const prefix =
    words.length === 1
      ? words[0].substring(0, 3).toUpperCase()
      : words.map((w) => w[0]).join("").toUpperCase().substring(0, 4);
  return prefix ? `${prefix}-001` : "";
}

function parseBudget(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function formatWithCommas(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCurrency(amount: number, currency = "ZAR"): string {
  const sym = CURRENCY_SYMBOLS[currency] || "R";
  return `${sym} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Input helpers ──────────────────────────────────────────────────────────────

function inputCls(error?: boolean, extra?: string) {
  return cn(
    "w-full h-12 px-4 rounded-[10px] text-sm text-[#111827] outline-none transition-all",
    "bg-[#f5f6f8] border border-[#e2e5ea]",
    "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
    error && "!border-red-400 focus:!border-red-400 focus:ring-red-400/10",
    extra
  );
}

const selectWrapCls = "relative w-full";
function selectCls() {
  return cn(
    "w-full h-12 px-4 pr-9 rounded-[10px] text-sm text-[#111827] outline-none",
    "bg-[#f5f6f8] border border-[#e2e5ea] appearance-none cursor-pointer",
    "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 transition-all"
  );
}

// ── FileTypeIcon ───────────────────────────────────────────────────────────────

function FileTypeIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf")
    return (
      <div className="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center text-[9px] font-normal border border-red-100 shrink-0">
        PDF
      </div>
    );
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext))
    return (
      <div className="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  if (["xlsx", "xls"].includes(ext))
    return (
      <div className="w-9 h-9 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-[9px] font-normal border border-green-100 shrink-0">
        XLS
      </div>
    );
  return (
    <div className="w-9 h-9 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center border border-gray-100 shrink-0">
      <FileText className="w-4 h-4" />
    </div>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex items-center">
      <Info className="w-3.5 h-3.5 text-[#9ca3af] cursor-help" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1a1a2e] text-white text-[11px] rounded-lg px-3 py-2 w-48 text-center z-20 shadow-lg leading-relaxed">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1a1a2e]" />
      </div>
    </div>
  );
}

// ── SelectWrapper ──────────────────────────────────────────────────────────────

function SelectField({
  value,
  onChange,
  children,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className={selectWrapCls}>
      <select
        className={cn(selectCls(), error && "!border-red-400")}
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
    </div>
  );
}

// ── PersonnelEntryCard ─────────────────────────────────────────────────────────

interface AssignedPersonnel {
  id: string;
  role: string;
  name: string;
  email: string;
  position: string;
  userId?: number;
}

function PersonnelEntryCard({
  entry,
  roleOptions,
  takenRoles,
  onChange,
  onRemove,
  canRemove,
}: {
  entry: AssignedPersonnel;
  roleOptions: { value: string; badge: string; badgeColor: string; iconColor: string }[];
  takenRoles: string[];
  onChange: (v: AssignedPersonnel) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const selectedRole = roleOptions.find((r) => r.value === entry.role);
  const { roles: appRoles } = useRoles();
  return (
    <div className="rounded-xl border border-[#e2e5ea] bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: (selectedRole?.iconColor ?? "#6b7280") + "18" }}>
            <User className="w-3.5 h-3.5" style={{ color: selectedRole?.iconColor ?? "#6b7280" }} />
          </div>
          <select
            value={entry.role}
            onChange={(e) => onChange({ ...entry, role: e.target.value })}
            className="flex-1 text-[13px] text-[#374151] bg-transparent border-none outline-none cursor-pointer appearance-none"
          >
            <option value="">Select role...</option>
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value} disabled={takenRoles.includes(r.value) && r.value !== entry.role}>
                {r.value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedRole && (
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-normal text-white"
              style={{ background: selectedRole.badgeColor }}>
              {selectedRole.badge}
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-red-400 hover:bg-red-50 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          <input
            className={inputCls(false, "pl-9")}
            placeholder="Full name"
            value={entry.name}
            onChange={(e) => onChange({ ...entry, name: e.target.value })}
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          <input
            className={inputCls(false, "pl-9")}
            placeholder="Email address"
            type="email"
            value={entry.email}
            onChange={(e) => onChange({ ...entry, email: e.target.value })}
          />
        </div>
        <div className="relative">
          <select
            value={entry.position}
            onChange={(e) => onChange({ ...entry, position: e.target.value })}
            className={inputCls(false)}
          >
            <option value="">Select position...</option>
            {appRoles.map(r => (
              <option key={r.code} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── OrgPersonnelSelectCard ────────────────────────────────────────────────────

interface OrgUser {
  id: number;
  name: string;
  email: string;
  role: { name: string; code: string } | null;
}

function OrgPersonnelSelectCard({
  entry,
  roleOptions,
  takenRoles,
  orgUsers,
  allRoles,
  onChange,
  onRemove,
  canRemove,
}: {
  entry: AssignedPersonnel;
  roleOptions: { value: string; badge: string; badgeColor: string; iconColor: string }[];
  takenRoles: string[];
  orgUsers: OrgUser[];
  allRoles: { id?: number; name: string; code: string }[];
  onChange: (v: AssignedPersonnel) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const selectedRole = roleOptions.find((r) => r.value === entry.role);
  const selectedOrgUser = orgUsers.find((u) => u.email === entry.email);

  return (
    <div className="rounded-xl border border-[#e2e5ea] bg-white p-5 space-y-4">
      {/* Role selector row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: (selectedRole?.iconColor ?? "#6b7280") + "18" }}>
            <User className="w-3.5 h-3.5" style={{ color: selectedRole?.iconColor ?? "#6b7280" }} />
          </div>
          <select
            value={entry.role}
            onChange={(e) => onChange({ ...entry, role: e.target.value })}
            className="flex-1 text-[13px] text-[#374151] bg-transparent border-none outline-none cursor-pointer appearance-none">
            <option value="">Select role...</option>
            {roleOptions.map((r) => (
              <option
                key={r.value}
                value={r.value}
                disabled={takenRoles.includes(r.value) && r.value !== entry.role}>
                {r.value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedRole && (
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-normal text-white"
              style={{ background: selectedRole.badgeColor }}>
              {selectedRole.badge}
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-red-400 hover:bg-red-50 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* User combobox */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[#e2e5ea] bg-[#f9fafb] hover:bg-white hover:border-[#6c5ce7] transition-all text-left">
            {selectedOrgUser ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-[11px] shrink-0">
                  {(selectedOrgUser.name || selectedOrgUser.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] text-[#374151]">{selectedOrgUser.name}</p>
                  <p className="text-[11px] text-[#9ca3af]">
                    {selectedOrgUser.email}{selectedOrgUser.role?.name ? ` · ${selectedOrgUser.role.name}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-[13px] text-[#9ca3af]">Select team member...</span>
            )}
            <ChevronsUpDown className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white border border-[#e2e5ea] shadow-lg rounded-xl" align="start">
          <Command>
            <CommandInput placeholder="Search team members..." className="text-[13px]" />
            <CommandList>
              <CommandEmpty className="text-[13px] text-[#9ca3af] py-4 text-center">No team members found.</CommandEmpty>
              <CommandGroup>
                {orgUsers.map((u) => {
                  const isSelected = entry.email === u.email;
                  return (
                    <CommandItem
                      key={u.id}
                      value={u.name || u.email}
                      onSelect={() => {
                        const matchedRole = roleOptions.find(
                          (r) => r.value === u.role?.code || r.value === u.role?.name
                        );
                        onChange({
                          ...entry,
                          name: u.name,
                          email: u.email,
                          position: u.role?.name || "",
                          userId: u.id,
                          role: matchedRole ? matchedRole.value : entry.role,
                        });
                        setPopoverOpen(false);
                      }}
                      className="cursor-pointer px-3 py-2.5">
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-[11px] shrink-0">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] text-[#374151]">{u.name || u.email}</p>
                            <p className="text-[11px] text-[#9ca3af]">{u.email}{u.role?.name ? ` · ${u.role.name}` : ""}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6c5ce7] shrink-0" />}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Org role — editable dropdown, pre-filled with user's role */}
      {selectedOrgUser && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#e2e5ea] bg-[#f9fafb]">
          <User className="w-3.5 h-3.5 text-[#9ca3af] shrink-0" />
          <div className="flex-1">
            <p className="text-[11px] text-[#9ca3af] mb-0.5">Organisation Role</p>
            <select
              value={entry.position}
              onChange={(e) => onChange({ ...entry, position: e.target.value })}
              className="w-full text-[13px] text-[#374151] bg-transparent border-none outline-none cursor-pointer appearance-none"
            >
              <option value="">Select role...</option>
              {allRoles.map((r) => (
                <option key={r.code} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AddressFields ─────────────────────────────────────────────────────────────

function AddressFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AddressState;
  onChange: (v: AddressState) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-[13px] font-normal text-[#374151]">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className={inputCls()}
          placeholder="Street address"
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
        />
        <input
          className={inputCls()}
          placeholder="City"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        />
        <input
          className={inputCls()}
          placeholder="State / Province"
          value={value.province}
          onChange={(e) => onChange({ ...value, province: e.target.value })}
        />
        <input
          className={inputCls()}
          placeholder="Postal Code"
          value={value.postal_code}
          onChange={(e) => onChange({ ...value, postal_code: e.target.value })}
        />
      </div>
    </div>
  );
}


// ── SectionHeader ──────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f3f4f6]">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <span className="text-[13px] font-normal text-[#374151]">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreateProject() {
  const [isInvitingClient, setIsInvitingClient] = useState(false);
  const [inviteClientData, setInviteClientData] = useState({ name: "", email: "" });
  const [isInvited, setIsInvited] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: createProject, isPending } = useCreateProject();
  const s3Upload = useS3Upload("project-documents/pending");
  const { roles: appRoles } = useRoles();

  // ── State ──────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [stepDir, setStepDir] = useState<"fwd" | "back">("fwd");
  const [stepKey, setStepKey] = useState(0);
  const [pnEditable, setPnEditable] = useState(false);
  const files = s3Upload.entries;
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New steps state
  const [clientForm, setClientForm] = useState<ClientFormState>(DEFAULT_CLIENT_FORM);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [appointedForm, setAppointedForm] = useState<AppointedFormState>(DEFAULT_APPOINTED_FORM);
  const [taskOrder, setTaskOrder] = useState<TaskOrderState>({ brief: "" });
  const [clientPersonnelList, setClientPersonnelList] = useState<AssignedPersonnel[]>([]);
  const [appointedPersonnelList, setAppointedPersonnelList] = useState<AssignedPersonnel[]>([]);

  interface AppointedInviteEntry {
    id: string;
    company_name: string;
    company_type: string;
    contact_name: string;
    email: string;
    position: string; // professional role key e.g. 'architect','contractor','qs','pm'
  }
  const [appointedInvites, setAppointedInvites] = useState<AppointedInviteEntry[]>([
    { id: crypto.randomUUID(), company_name: '', company_type: '', contact_name: '', email: '', position: 'architect' }
  ]);

  const CLIENT_ROLE_OPTIONS = [
    { value: "Client", badge: "Super User", badgeColor: "#6c5ce7", iconColor: "#6c5ce7" },
    { value: "Client Representative", badge: "Tech User", badgeColor: "#00b894", iconColor: "#00b894" },
  ];
  const APPOINTED_ROLE_OPTIONS = [
    { value: "Principal Architect", badge: "Principal", badgeColor: "#3A6FF7", iconColor: "#3A6FF7" },
    { value: "Technical Representative", badge: "Tech Rep", badgeColor: "#00b894", iconColor: "#00b894" },
  ];
  const [showTaskOrderBrief, setShowTaskOrderBrief] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [userProfileLoaded, setUserProfileLoaded] = useState(false);

  const handleCompanyLookup = async (target: "client" | "appointed") => {
    const reg = (target === "client" ? clientForm.company_registration : appointedForm.company_registration).trim();
    if (!reg) {
      toast.error("Please enter a registration number to look up.");
      return;
    }

    setIsLookingUp(true);
    try {
      const data = await lookupCompany(reg);
      if (data) {
        if (target === "client") {
          setClientForm((prev) => ({
            ...prev,
            company_name: data.company_name || prev.company_name,
            vat_number: data.vat_number || prev.vat_number,
            office_number: data.office_number || prev.office_number,
            physical_address: data.physical_address ? {
              ...prev.physical_address,
              ...data.physical_address,
            } : prev.physical_address,
          }));
        } else {
          setAppointedForm((prev) => ({
            ...prev,
            company_name: data.company_name || prev.company_name,
            vat_number: data.vat_number || prev.vat_number,
            office_number: data.office_number || prev.office_number,
            physical_address: data.physical_address ? {
              ...prev.physical_address,
              ...data.physical_address,
            } : prev.physical_address,
          }));
        }
        toast.success("Company details retrieved successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Company not found or lookup failed. Please enter details manually.");
    } finally {
      setIsLookingUp(false);
    }
  };

  // Invite is sent automatically after project creation — see onSuccess handler
  const handleInviteClient = async (projectId: number | string) => {
    if (!inviteClientData.email.trim()) return;
    try {
      await inviteClient({
        client_name: inviteClientData.name,
        client_email: inviteClientData.email,
        project_id: projectId,
      });
      setIsInvited(true);
      toast.success(`Client invitation sent to ${inviteClientData.email}`);
    } catch (err: any) {
      toast.warning(`Project created, but client invite failed: ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleInviteAppointedCompanies = async (projectId: number | string) => {
    const toInvite = appointedInvites.filter(e => e.email.trim());
    if (toInvite.length === 0) return;
    await Promise.all(toInvite.map(async (entry) => {
      try {
        await inviteAppointedCompany({
          company_name: entry.company_name,
          contact_name: entry.contact_name,
          contact_email: entry.email,
          project_id: projectId,
          position: entry.position || 'architect',
        });
      } catch (err: any) {
        toast.warning(`Failed to invite ${entry.email}: ${err?.response?.data?.error || err.message}`);
      }
    }));
    if (toInvite.length > 0) toast.success(`Appointed company invitation(s) sent`);
  };

  const handleAddPersonnelToProject = async (projectId: number | string, personnel: AssignedPersonnel[]) => {
    const toAdd = personnel.filter(e => e.userId);
    if (toAdd.length === 0) return;
    await Promise.all(toAdd.map(async (entry) => {
      try {
        await postData({
          url: `projects/${projectId}/team-members/`,
          data: { userId: entry.userId, roleName: entry.role || "Member" },
        });
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || "Unknown error";
        toast.error(`Could not add ${entry.name || entry.email} to project: ${msg}`);
      }
    }));
  };

  const { data: user } = useCurrentUser();
  const { data: orgUsersData } = useFetch<{ results: OrgUser[] }>('auth/users/?my_org=true&page_size=500');
  const orgUsers: OrgUser[] = orgUsersData?.results || [];
  const CLIENT_ROLE_CODES = ['CLIENT', 'OWNER', 'CONTRACTOR'];
  const isClientOrContractor = CLIENT_ROLE_CODES.includes(user?.role?.code ?? '');

  // ── Pre-populate from User Organization ───────────────────────────────────

  useEffect(() => {
    if (user) {
      // 1. Pre-populate Client details if user is CLIENT/OWNER/CONTRACTOR — from organization
      if (CLIENT_ROLE_CODES.includes(user.role?.code ?? '') && !clientForm.company_name) {
        const org = user.organization;
        const profile = user.profile;

        if (org) {
          setClientForm((prev) => ({
            ...prev,
            company_name: org.name || "",
            company_registration: org.company_reg_number || "",
            vat_number: org.vat_number || "",
            office_number: profile?.phone_number || "",
            physical_address: {
              street: profile?.address || "",
              city: profile?.city || "",
              province: profile?.state || "",
              postal_code: profile?.postal_code || "",
            },
            client: {
              name: user.name || prev.client.name,
              email: user.email || prev.client.email,
              position: prev.client.position,
            }
          }));
        } else {
          // No organization — use user's name as client name and fill from profile
          setClientForm((prev) => ({
            ...prev,
            company_name: user.name || "",
            office_number: profile?.phone_number || "",
            physical_address: {
              street: profile?.address || "",
              city: profile?.city || "",
              province: profile?.state || "",
              postal_code: profile?.postal_code || "",
            },
            client: {
              name: user.name || prev.client.name,
              email: user.email || prev.client.email,
              position: prev.client.position,
            }
          }));
        }
      }

      // 2. Pre-populate Appointed details — only if user has an organization
      if (!appointedForm.company_name) {
        const org = user.organization;
        const profile = user.profile;

        if (org) {
          setAppointedForm((prev) => ({
            ...prev,
            company_name: org.name || "",
            company_registration: org.company_reg_number || "",
            vat_number: org.vat_number || "",
            office_number: profile?.phone_number || "",
            physical_address: {
              street: profile?.address || "",
              city: profile?.city || "",
              province: profile?.state || "",
              postal_code: profile?.postal_code || "",
            },
            principal: {
              ...prev.principal,
              name: user.name || prev.principal.name,
              email: user.email || prev.principal.email,
            }
          }));
        }
      }
    }
  }, [user, appointedForm.company_name, clientForm.company_name]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const budget = parseBudget(form.total_budget);
  const vatRate = parseFloat(form.vat_rate) || 0;
  const retentionRate = parseFloat(form.retention_rate) || 0;
  const vatAmount = budget * (vatRate / 100);
  const totalWithVat = budget + vatAmount;
  const retentionAmount = budget * (retentionRate / 100);

  const getDuration = useCallback(() => {
    if (!form.start_date || !form.end_date) return null;
    try {
      const start = parseISO(form.start_date);
      const end = parseISO(form.end_date);
      if (end <= start) return null;
      const months = differenceInMonths(end, start);
      const days = differenceInDays(
        end,
        new Date(
          start.getFullYear(),
          start.getMonth() + months,
          start.getDate()
        )
      );
      return { months, days, start, end };
    } catch {
      return null;
    }
  }, [form.start_date, form.end_date]);

  const getDurationLabel = useCallback(() => {
    const d = getDuration();
    if (!d) return null;
    if (d.months === 0)
      return `${differenceInDays(d.end, d.start)} day${differenceInDays(d.end, d.start) !== 1 ? "s" : ""}`;
    if (d.days === 0)
      return `${d.months} month${d.months !== 1 ? "s" : ""}`;
    return `${d.months} month${d.months !== 1 ? "s" : ""}, ${d.days} day${d.days !== 1 ? "s" : ""}`;
  }, [getDuration]);

  const duration = getDuration();

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errors[key as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
      }
    },
    [errors]
  );

  const handleNameChange = (value: string) => {
    if (!pnEditable) {
      setForm((prev) => ({
        ...prev,
        name: value,
        project_number: generateProjectNumber(value),
      }));
    } else {
      setField("name", value);
    }
    setErrors((prev) => ({ ...prev, name: undefined }));
  };

  // ── File handling ──────────────────────────────────────────────────────────

  const addFiles = useCallback(
    (newFiles: File[]) => {
      let addedCount = 0;
      newFiles.forEach((file) => {
        const result = validateFile(file);
        if (result.valid) {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          s3Upload.startUpload(id, file);
          addedCount++;
        } else {
          toast.error(`${file.name}: ${result.error}`);
        }
      });
      if (addedCount > 0) {
        setErrors((prev) => ({ ...prev, attachments: undefined }));
      }
    },
    [s3Upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      const next: FormErrors = {};
      if (!form.name.trim() || form.name.trim().length < 2)
        next.name = "Project name must be at least 2 characters";
      if (!form.project_number.trim())
        next.project_number = "Project number is required";
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    if (step === 2) {
      // Scope of Works — all optional
      return true;
    }
    if (step === 3) {
      // Client Details
      if (isInvitingClient) setIsInvitingClient(false);
      if (isInvited || inviteClientData.email.trim()) return true;
      const next: ClientErrors = {};
      if (!clientForm.company_name.trim())
        next.company_name = "Client name or company is required";
      setClientErrors(next);
      return Object.keys(next).length === 0;
    }
    if (step === 4) {
      return true; // All fields optional — invites are sent after project creation
    }
    if (step === 5) {
      const next: FormErrors = {};
      if (files.length === 0)
        next.attachments = "Please upload at least one document";
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    if (step === 6) {
      const next: FormErrors = {};
      if (form.start_date && form.end_date && form.end_date <= form.start_date)
        next.date_range = "End date must be after start date";
      if (parseBudget(form.total_budget) <= 0)
        next.total_budget = "Total budget must be greater than 0";
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    return true;
  };

  // ── Step navigation ────────────────────────────────────────────────────────

  const goToStep = (next: number) => {
    setStepDir(next > currentStep ? "fwd" : "back");
    setStepKey((k) => k + 1);
    setCurrentStep(next);
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    goToStep(currentStep - 1);
  };

  const handleSkip = () => {
    goToStep(currentStep + 1);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!validateStep(6)) return;
    setIsSubmitting(true);
    // Snapshot mutable state so onSuccess closure always has the latest values
    const personnelSnapshot = [...clientPersonnelList];

    const b = parseBudget(form.total_budget);
    const fx = parseFloat(form.fx_rate) || 1;
    const ret = parseFloat(form.retention_rate) || 5;
    const vat = parseFloat(form.vat_rate) || 15;

    const data = {
      name: form.name,
      description: form.description,
      project_number: form.project_number,
      projectNumber: form.project_number,
      start_date: form.start_date || null,
      startDate: form.start_date || null,
      end_date: form.end_date || null,
      endDate: form.end_date || null,
      fx_rate: fx,
      fxRate: fx,
      retention_rate: ret,
      retentionRate: ret,
      vat_rate: vat,
      vatRate: vat,
      contract_type: form.contract_type,
      contractType: form.contract_type,
      total_budget: b,
      totalBudget: b,
      location: form.location,
      currency: form.currency,
      status: "Draft",
      // New onboarding fields — backend needs to support these
      client_details: {
        company_name: clientForm.company_name,
        company_registration: clientForm.company_registration,
        vat_number: clientForm.vat_number,
        physical_address: clientForm.physical_address,
        postal_address: clientForm.postal_address,
        office_number: clientForm.office_number,
        client: (() => { const e = clientPersonnelList.find(x => x.role === "Client"); return e ? { name: e.name, email: e.email, position: e.position } : DEFAULT_PERSONNEL; })(),
        client_representative: (() => { const e = clientPersonnelList.find(x => x.role === "Client Representative"); return e ? { name: e.name, email: e.email, position: e.position } : DEFAULT_PERSONNEL; })(),
      },
      appointed_company: {
        company_name: appointedForm.company_name,
        company_registration: appointedForm.company_registration,
        vat_number: appointedForm.vat_number,
        physical_address: appointedForm.physical_address,
        postal_address: appointedForm.postal_address,
        office_number: appointedForm.office_number,
        role_as_per_appointment: appointedForm.role_as_per_appointment,
        principal: (() => { const e = appointedPersonnelList.find(x => x.role === "Principal Architect"); return e ? { name: e.name, email: e.email, position: e.position } : DEFAULT_PERSONNEL; })(),
        technical_representative: (() => { const e = appointedPersonnelList.find(x => x.role === "Technical Representative"); return e ? { name: e.name, email: e.email, position: e.position } : DEFAULT_PERSONNEL; })(),
      },
      task_order_brief: taskOrder.brief,
    };

    createProject(data, {
      onSuccess: async (result: any) => {
        const projectData = result?.project || result;
        if (!projectData) {
          toast.error("Failed to retrieve project details after save");
          setIsSubmitting(false);
          return;
        }

        const pId = projectData._id || projectData.id;

        if (pId) {
          localStorage.setItem("selectedProjectId", String(pId));
          if (projectData.location)
            localStorage.setItem("projectLocation", projectData.location);
          window.dispatchEvent(new Event("project-change"));
        }

        if (files.length > 0 && pId) {
          const ids = files.map((e) => e.id);
          const s3Keys = await s3Upload.waitForAll(ids);

          let anyFailed = false;
          await Promise.all(
            files.map(async (entry) => {
              const key = s3Keys.get(entry.id);
              if (!key) { anyFailed = true; return; }
              try {
                await registerS3Document(pId, { file_name: entry.file.name, s3_key: key });
              } catch {
                anyFailed = true;
              }
            })
          );

          if (anyFailed) {
            toast.warning("Project created, but some documents failed to register.");
          } else {
            toast.success("Project created with attachments!");
          }
        } else {
          toast.success("Project created successfully!");
        }

        await queryClient.refetchQueries({ queryKey: [`projects/?userId=${user?.id}`] });
        if (pId) queryClient.invalidateQueries({ queryKey: ["project", pId] });

        // Send client invite if email was provided — linked to this project
        if (inviteClientData.email.trim() && pId) {
          await handleInviteClient(pId);
        }
        if (isClientOrContractor) await handleInviteAppointedCompanies(pId);
        if (pId) await handleAddPersonnelToProject(pId, personnelSnapshot);

        setIsSubmitting(false);
        navigate("/");
      },
      onError: (error: any) => {
        setIsSubmitting(false);
        if (error?.response?.data) {
          const d = error.response.data;
          if (typeof d === "object" && !Array.isArray(d)) {
            Object.entries(d).forEach(([field, msgs]) => {
              const msg = Array.isArray(msgs) ? msgs[0] : msgs;
              toast.error(`${field}: ${msg}`);
            });
            return;
          }
          if (typeof d === "string") { toast.error(d); return; }
          if (d.message) { toast.error(d.message); return; }
        }
        toast.error(
          `Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      },
    });
  };

  const isLoading = isPending || isSubmitting;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Animation + date picker styles */}
      <style>{`
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(22px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-22px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        .anim-fwd  { animation: slideFromRight 0.2s ease-out; }
        .anim-back { animation: slideFromLeft  0.2s ease-out; }

        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          position: absolute;
          right: 0; top: 0;
          width: 100%; height: 100%;
          cursor: pointer;
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-white">

        {/* ══════════════════════════════ LEFT SIDEBAR ══════════════════════ */}
        <aside className="hidden lg:flex w-[280px] bg-sidebar border-r border-[#ededed] flex-col h-full shrink-0">

          {/* Logo */}
          <div className="px-6 pt-6 pb-5 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 bg-[#121212] rounded-xl flex items-center justify-center shrink-0">
                <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-[14px] font-normal text-[#121212] tracking-tight">
                Baselinq
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="px-6 pt-5 pb-2">
            <p className="text-[18px] font-normal text-[#101828] leading-tight">
              New Project
            </p>
            <p className="text-[12px] text-[#9ca3af] mt-1">
              Set up your project workspace
            </p>
          </div>

          {/* Stepper */}
          <nav className="px-4 pt-3 flex-1 overflow-y-auto">
            {STEPS.map((step, i) => {
              const done = currentStep > step.id;
              const active = currentStep === step.id;
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                      active ? "bg-[#f0edff]" : "bg-transparent"
                    )}
                  >
                    {/* Circle */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-normal shrink-0 mt-0.5 transition-colors",
                        done
                          ? "bg-[#6c5ce7] text-white"
                          : active
                            ? "bg-[#6c5ce7] text-white"
                            : "bg-[#f3f4f6] text-[#9ca3af]"
                      )}>
                      {done ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    {/* Label */}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[13px] font-normal leading-tight",
                          done || active ? "text-[#101828]" : "text-[#9ca3af]"
                        )}>
                        {step.label}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] mt-0.5",
                          done || active ? "text-[#6b7280]" : "text-[#d1d5db]"
                        )}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="mx-auto my-0.5"
                      style={
                        done
                          ? { width: "2px", height: "16px", background: "#6c5ce7", marginLeft: "28px" }
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile progress bar */}
          <div className="lg:hidden bg-white border-b border-[#ededed] px-5 py-3">
            <div className="flex gap-1.5 mb-2">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background:
                      s.id <= currentStep ? "#6c5ce7" : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            <p className="text-[13px] font-normal text-[#374151]">
              Step {currentStep} of {STEPS.length}:{" "}
              {STEPS[currentStep - 1].label}
            </p>
          </div>

          {/* Back to Dashboard / Logout */}
          <div className="flex justify-between px-8 pt-5 pb-1 shrink-0">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </button>
            <button
              onClick={() => { localStorage.clear(); navigate("/login"); }}
              className="flex items-center gap-1.5 text-[13px] text-[#9ca3af] hover:text-red-500 border border-transparent hover:border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-10">
            <div className="max-w-[720px] mx-auto pt-4">
              {/* Step heading */}
              <div className="mb-6">
                <h1 className="text-[24px] font-normal text-[#101828] leading-tight">
                  {STEPS[currentStep - 1].label}
                </h1>
                <p className="text-[14px] text-[#6b7280] mt-1.5 leading-relaxed">
                  {currentStep === 1 &&
                    "Give your project a name and number so your team can identify it."}
                  {currentStep === 2 &&
                    "Describe the full scope of construction works. This will auto-populate into contract documents and appointment letters."}
                  {currentStep === 3 &&
                    "Fill in the client's company details and assign personnel. This information will auto-populate into contracts and letters."}
                  {currentStep === 4 &&
                    "Enter the details of the appointed professional firm and their key team members."}
                  {currentStep === 5 &&
                    "Upload the key documents for this project. You can always add more later."}
                  {currentStep === 6 &&
                    "Define the financial parameters and schedule for this project."}
                </p>
              </div>

              {/* Animated step card */}
              <div
                key={stepKey}
                className={stepDir === "fwd" ? "anim-fwd" : "anim-back"}>
                <div
                  className="bg-sidebar rounded-2xl"
                  style={{
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04)",
                  }}>

                  {/* ────────────── STEP 1: PROJECT DETAILS ────────────── */}
                  {currentStep === 1 && (
                    <div className="p-8 space-y-5">

                      {/* Row 1: Name (3/5) + Number (2/5) */}
                      <div className="grid grid-cols-5 gap-4">
                        {/* Project Name */}
                        <div className="col-span-3">
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                            Project Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            className={inputCls(!!errors.name)}
                            placeholder="e.g. Marina Bay Tower"
                            value={form.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                          />
                          {errors.name && (
                            <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                              {errors.name}
                            </p>
                          )}
                        </div>

                        {/* Project Number */}
                        <div className="col-span-2">
                          <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                            Project Number
                          </label>
                          <div className="relative">
                            <input
                              className={cn(
                                "w-full h-12 px-4 pr-10 rounded-[10px] text-sm outline-none transition-all",
                                pnEditable
                                  ? "bg-[#f5f6f8] border border-[#e2e5ea] text-[#111827] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10"
                                  : "bg-[#f0edff] border border-[#d4ccff] text-[#6c5ce7] cursor-pointer",
                                errors.project_number && "!border-red-400"
                              )}
                              value={form.project_number}
                              readOnly={!pnEditable}
                              placeholder="Auto-generated"
                              onClick={() => { if (!pnEditable) setPnEditable(true); }}
                              onChange={(e) => setField("project_number", e.target.value)}
                              onBlur={() => setPnEditable(false)}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setPnEditable((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c5ce7] hover:text-[#5a4bd1] transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-[#9ca3af] mt-1">
                            Auto-generated · click to edit
                          </p>
                          {errors.project_number && (
                            <p className="text-[12px] text-red-500 mt-0.5">
                              {errors.project_number}
                            </p>
                          )}
                        </div>
                      </div>



                      {/* Location */}
                      <div>
                        <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                          Project Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                          <input
                            className={inputCls(false, "pl-10")}
                            placeholder="e.g. Cape Town, Western Cape"
                            value={form.location}
                            onChange={(e) => setField("location", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─────────────── STEP 3: CLIENT DETAILS ─────────────── */}
                  {currentStep === 3 && (
                    <div className="p-8 space-y-6">

                      {/* ── Invite Client (if not CLIENT/OWNER/CONTRACTOR) ── */}
                      {!CLIENT_ROLE_CODES.includes(user?.role?.code ?? '') && (
                        <div className={cn(
                          "p-5 rounded-2xl border transition-all duration-300 mb-2",
                          isInvited || (inviteClientData.email.trim() && !isInvitingClient) ? "bg-emerald-50 border-emerald-200" : "bg-[#f8f9fb] border-[#e2e5ea] border-dashed"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                isInvited || inviteClientData.email.trim() ? "bg-emerald-100 text-emerald-600" : "bg-white text-[#6c5ce7] shadow-sm"
                              )}>
                                {isInvited || inviteClientData.email.trim() ? <Check className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                              </div>
                              <div>
                                <h3 className="text-[14px] font-normal text-[#101828]">
                                  {isInvited ? "Client Invited Successfully" : inviteClientData.email.trim() ? "Client invite confirmed" : "Invite Client to fill details"}
                                </h3>
                                <p className="text-[12px] text-[#6b7280] mt-0.5">
                                  {isInvited
                                    ? `Invitation sent to ${inviteClientData.email}`
                                    : inviteClientData.email.trim()
                                      ? `${inviteClientData.name || "—"} · ${inviteClientData.email}`
                                      : "We'll send an email with a link for them to complete this section."}
                                </p>
                              </div>
                            </div>
                            {!isInvited && (
                              <button
                                type="button"
                                onClick={() => setIsInvitingClient(!isInvitingClient)}
                                className="text-[13px] text-[#6c5ce7] font-normal hover:text-[#5a4bd1] px-3 py-1.5 rounded-lg hover:bg-[#6c5ce7]/5 transition-colors"
                              >
                                {isInvitingClient ? "Cancel" : inviteClientData.email.trim() ? "Edit" : "Invite Client"}
                              </button>
                            )}
                          </div>

                          {isInvitingClient && !isInvited && (
                            <div className="mt-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] text-[#6b7280] uppercase tracking-wider font-normal mb-1.5 ml-1">Client Name</label>
                                  <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                    <input
                                      className={cn(inputCls(), "pl-10 h-11")}
                                      placeholder="e.g. John Smith"
                                      value={inviteClientData.name}
                                      onChange={(e) => setInviteClientData({ ...inviteClientData, name: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[11px] text-[#6b7280] uppercase tracking-wider font-normal mb-1.5 ml-1">Client Email</label>
                                  <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                                    <input
                                      className={cn(inputCls(), "pl-10 h-11")}
                                      placeholder="email@example.com"
                                      type="email"
                                      value={inviteClientData.email}
                                      onChange={(e) => setInviteClientData({ ...inviteClientData, email: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsInvitingClient(false)}
                                disabled={!inviteClientData.email}
                                className="w-full h-11 bg-[#6c5ce7] text-white rounded-xl text-[13px] font-normal hover:bg-[#5a4bd1] shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Confirm, Invite will be sent after project is created
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Company Info (Only for Clients) ── */}
                      {CLIENT_ROLE_CODES.includes(user?.role?.code ?? '') && (
                        <div>
                          <SectionHeader
                            icon={<Building2 className="w-3.5 h-3.5" />}
                            label="Client Company Information"
                            iconBg="#eef2ff"
                            iconColor="#6c5ce7"
                          />
                          <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                            Fill in once, this will auto-populate into all contracts and appointment letters.
                          </p>

                          <div className="space-y-4">
                            {/* Client Name or Company */}
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                Client Name or Company <span className="text-red-500">*</span>
                              </label>
                              <input
                                className={inputCls(!!clientErrors.company_name)}
                                placeholder="e.g. Mr John Smith or ABC Holdings (Pty) Ltd"
                                value={clientForm.company_name}
                                onChange={(e) => {
                                  setClientForm((p) => ({ ...p, company_name: e.target.value }));
                                  setClientErrors((p) => ({ ...p, company_name: undefined }));
                                }}
                              />
                              {clientErrors.company_name && (
                                <p className="text-[12px] text-red-500 mt-1">
                                  {clientErrors.company_name}
                                </p>
                              )}
                            </div>

                            {/* Registration + VAT */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                  Company Registration / ID
                                </label>
                                <div className="relative group">
                                  <input
                                    className={cn(inputCls(), "pr-10")}
                                    placeholder="e.g. 1970/014526/07"
                                    value={clientForm.company_registration}
                                    onChange={(e) =>
                                      setClientForm((p) => ({
                                        ...p,
                                        company_registration: e.target.value,
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCompanyLookup("client")}
                                    disabled={isLookingUp}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#6c5ce7] hover:bg-[#6c5ce7]/5 transition-all"
                                    title="Auto-fill from registration"
                                  >
                                    {isLookingUp ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6c5ce7]" />
                                    ) : (
                                      <Search className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                  VAT Number
                                </label>
                                <input
                                  className={inputCls()}
                                  placeholder="e.g. 4123456789"
                                  value={clientForm.vat_number}
                                  onChange={(e) =>
                                    setClientForm((p) => ({ ...p, vat_number: e.target.value }))
                                  }
                                />
                              </div>
                            </div>

                            {/* Physical + Postal Address */}
                            <div className="space-y-5">
                              <AddressFields
                                label="Physical Address"
                                value={clientForm.physical_address}
                                onChange={(v) =>
                                  setClientForm((p) => ({ ...p, physical_address: v }))
                                }
                              />
                              <AddressFields
                                label="Postal Address"
                                value={clientForm.postal_address}
                                onChange={(v) =>
                                  setClientForm((p) => ({ ...p, postal_address: v }))
                                }
                              />
                            </div>

                            {/* Office */}
                            <div className="space-y-5">
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                                  Office Number
                                </label>
                                <div className="relative">
                                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                  <input
                                    className={inputCls(false, "pl-10")}
                                    placeholder="e.g. +27 11 123 4567"
                                    type="tel"
                                    value={clientForm.office_number}
                                    onChange={(e) =>
                                      setClientForm((p) => ({ ...p, office_number: e.target.value }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Assigned Personnel (Only for Clients) ── */}
                      {CLIENT_ROLE_CODES.includes(user?.role?.code ?? '') && (
                        <div>
                          <SectionHeader
                            icon={<User className="w-3.5 h-3.5" />}
                            label="Assigned Personnel"
                            iconBg="#f0fdf4"
                            iconColor="#00b894"
                          />
                          <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                            These members will be given predetermined access rights to the project.
                          </p>
                          <div className="space-y-3">
                            {clientPersonnelList.map((entry) => (
                              <OrgPersonnelSelectCard
                                key={entry.id}
                                entry={entry}
                                roleOptions={CLIENT_ROLE_OPTIONS}
                                takenRoles={clientPersonnelList.filter(e => e.id !== entry.id).map(e => e.role)}
                                orgUsers={orgUsers}
                                allRoles={appRoles}
                                onChange={(v) => setClientPersonnelList((prev) => prev.map((e) => e.id === v.id ? v : e))}
                                onRemove={() => setClientPersonnelList((prev) => prev.filter((e) => e.id !== entry.id))}
                                canRemove={true}
                              />
                            ))}
                            {clientPersonnelList.length < CLIENT_ROLE_OPTIONS.length && (
                              <button
                                type="button"
                                onClick={() => setClientPersonnelList((prev) => [...prev, { id: crypto.randomUUID(), role: "", name: "", email: "", position: "" }])}
                                className="w-full py-4 border-2 border-dashed border-[#e2e5ea] rounded-xl flex items-center justify-center gap-2 text-[13px] text-[#6b7280] hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-[#f8f7ff] transition-all group">
                                <div className="w-6 h-6 rounded-full bg-[#f3f4f6] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-normal">Add User</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─────────────── STEP 4: APPOINTED COMPANY ─────────────── */}
                  {currentStep === 4 && (
                    <div className="p-8 space-y-6">

                      {/* CLIENT/OWNER/CONTRACTOR: simplified invite form */}
                      {isClientOrContractor && (
                        <>
                          <div>
                            <SectionHeader
                              icon={<Building2 className="w-3.5 h-3.5" />}
                              label="Invite Appointed Companies"
                              iconBg="#eff6ff"
                              iconColor="#3A6FF7"
                            />
                            <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                              Invite the professional firms appointed to this project. They'll receive an email to fill in their company details.
                            </p>
                          </div>
                          <div className="space-y-4">
                            {appointedInvites.map((entry) => (
                              <div key={entry.id} className="bg-[#f8f9fb] rounded-xl p-4 space-y-3 border border-[#e2e5ea]">
                                <div className="flex items-center justify-end">
                                  {appointedInvites.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setAppointedInvites(prev => prev.filter(e => e.id !== entry.id))}
                                      className="text-[#9ca3af] hover:text-red-500 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-[12px] font-normal text-[#6b7280] mb-1">Company Name</label>
                                  <input
                                    className={inputCls()}
                                    placeholder="e.g. Base Architects and Associates"
                                    value={entry.company_name}
                                    onChange={e => setAppointedInvites(prev => prev.map(x => x.id === entry.id ? { ...x, company_name: e.target.value } : x))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[12px] font-normal text-[#6b7280] mb-1">Company Type</label>
                                  <select
                                    className={inputCls()}
                                    value={entry.company_type}
                                    onChange={e => setAppointedInvites(prev => prev.map(x => x.id === entry.id ? { ...x, company_type: e.target.value } : x))}
                                  >
                                    <option value="">Select type...</option>
                                    <option value="Pty Ltd">Pty Ltd (Private Company)</option>
                                    <option value="Ltd">Ltd (Public Company)</option>
                                    <option value="CC">CC (Close Corporation)</option>
                                    <option value="Inc">Inc (Incorporated)</option>
                                    <option value="Partnership">Partnership</option>
                                    <option value="Sole Proprietor">Sole Proprietor</option>
                                    <option value="Trust">Trust</option>
                                    <option value="NPO">NPO (Non-Profit Organisation)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[12px] font-normal text-[#6b7280] mb-1">Professional Role</label>
                                  <select
                                    className={inputCls()}
                                    value={entry.position}
                                    onChange={e => setAppointedInvites(prev => prev.map(x => x.id === entry.id ? { ...x, position: e.target.value } : x))}
                                  >
                                    <option value="">Select role...</option>
                                    {appRoles.map(r => (
                                      <option key={r.code} value={r.code}>{r.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[12px] font-normal text-[#6b7280] mb-1">Contact Person Name</label>
                                    <input
                                      className={inputCls()}
                                      placeholder="e.g. John Smith"
                                      value={entry.contact_name}
                                      onChange={e => setAppointedInvites(prev => prev.map(x => x.id === entry.id ? { ...x, contact_name: e.target.value } : x))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[12px] font-normal text-[#6b7280] mb-1">Email Address</label>
                                    <input
                                      className={inputCls()}
                                      placeholder="e.g. john@firm.co.za"
                                      type="email"
                                      value={entry.email}
                                      onChange={e => setAppointedInvites(prev => prev.map(x => x.id === entry.id ? { ...x, email: e.target.value } : x))}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setAppointedInvites(prev => [...prev, { id: crypto.randomUUID(), company_name: '', company_type: '', contact_name: '', email: '', position: 'architect' }])}
                              className="w-full py-4 border-2 border-dashed border-[#e2e5ea] rounded-xl flex items-center justify-center gap-2 text-[13px] text-[#6b7280] hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-[#f8f7ff] transition-all group"
                            >
                              <div className="w-6 h-6 rounded-full bg-[#f3f4f6] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-normal">Add Another Company</span>
                            </button>
                          </div>
                        </>
                      )}

                      {/* Other roles: full appointed company details form */}
                      {!isClientOrContractor && (
                        <>
                          <div>
                            <SectionHeader
                              icon={<Building2 className="w-3.5 h-3.5" />}
                              label="Appointed Company Information"
                              iconBg="#eff6ff"
                              iconColor="#3A6FF7"
                            />
                            <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                              Fill in once, this will auto-populate into all contracts and appointment letters.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Company Name</label>
                              <input
                                className={inputCls()}
                                placeholder="e.g. Base Architects and Associates"
                                value={appointedForm.company_name}
                                onChange={(e) => setAppointedForm((p) => ({ ...p, company_name: e.target.value }))}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Company Registration / ID</label>
                                <div className="relative group">
                                  <input
                                    className={cn(inputCls(), "pr-10")}
                                    placeholder="e.g. 1970/014526/07"
                                    value={appointedForm.company_registration}
                                    onChange={(e) => setAppointedForm((p) => ({ ...p, company_registration: e.target.value }))}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleCompanyLookup("appointed")}
                                    disabled={isLookingUp}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-[#6c5ce7] hover:bg-[#6c5ce7]/5 transition-all"
                                    title="Auto-fill from registration"
                                  >
                                    {isLookingUp ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6c5ce7]" />
                                    ) : (
                                      <Search className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">VAT Number</label>
                                <input
                                  className={inputCls()}
                                  placeholder="e.g. 4123456789"
                                  value={appointedForm.vat_number}
                                  onChange={(e) => setAppointedForm((p) => ({ ...p, vat_number: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Office Number</label>
                                <div className="relative">
                                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
                                  <input
                                    className={inputCls(false, "pl-10")}
                                    placeholder="e.g. +27 11 123 4567"
                                    type="tel"
                                    value={appointedForm.office_number}
                                    onChange={(e) => setAppointedForm((p) => ({ ...p, office_number: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[13px] font-normal text-[#374151] mb-1.5">Role / Responsibility</label>
                                <input
                                  className={inputCls()}
                                  placeholder="e.g. Principal Architect"
                                  value={appointedForm.role_as_per_appointment}
                                  onChange={(e) => setAppointedForm((p) => ({ ...p, role_as_per_appointment: e.target.value }))}
                                />
                              </div>
                            </div>

                            <div className="space-y-5">
                              <AddressFields
                                label="Physical Address"
                                value={appointedForm.physical_address}
                                onChange={(v) => setAppointedForm((p) => ({ ...p, physical_address: v }))}
                              />
                              <AddressFields
                                label="Postal Address"
                                value={appointedForm.postal_address}
                                onChange={(v) => setAppointedForm((p) => ({ ...p, postal_address: v }))}
                              />
                            </div>
                          </div>

                          <div>
                            <SectionHeader
                              icon={<User className="w-3.5 h-3.5" />}
                              label="Key Personnel"
                              iconBg="#f0fdf4"
                              iconColor="#00b894"
                            />
                            <p className="text-[12px] text-[#9ca3af] -mt-2 mb-4">
                              These members will be given predetermined access rights to the project.
                            </p>
                            <div className="space-y-3">
                              {appointedPersonnelList.map((entry) => (
                                <PersonnelEntryCard
                                  key={entry.id}
                                  entry={entry}
                                  roleOptions={APPOINTED_ROLE_OPTIONS}
                                  takenRoles={appointedPersonnelList.filter(e => e.id !== entry.id).map(e => e.role)}
                                  onChange={(v) => setAppointedPersonnelList((prev) => prev.map((e) => e.id === v.id ? v : e))}
                                  onRemove={() => setAppointedPersonnelList((prev) => prev.filter((e) => e.id !== entry.id))}
                                  canRemove={true}
                                />
                              ))}
                              {appointedPersonnelList.length < APPOINTED_ROLE_OPTIONS.length && (
                                <button
                                  type="button"
                                  onClick={() => setAppointedPersonnelList((prev) => [...prev, { id: crypto.randomUUID(), role: "", name: "", email: "", position: "" }])}
                                  className="w-full py-4 border-2 border-dashed border-[#e2e5ea] rounded-xl flex items-center justify-center gap-2 text-[13px] text-[#6b7280] hover:border-[#6c5ce7] hover:text-[#6c5ce7] hover:bg-[#f8f7ff] transition-all group"
                                >
                                  <div className="w-6 h-6 rounded-full bg-[#f3f4f6] flex items-center justify-center group-hover:bg-[#6c5ce7] group-hover:text-white transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-normal">Add Personnel</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  )}

                  {/* ─────────────── STEP 5: DOCUMENTS ─────────────── */}
                  {currentStep === 5 && (
                    <div className="p-8 space-y-4 text-left">

                      {/* Label + tooltip */}
                      <div className="flex items-center gap-2">
                        <label className="text-[13px] font-normal text-[#374151]">
                          Upload your project contract document <span className="text-red-500">*</span>
                        </label>
                        <Tooltip text="Recommended: JBCC contract, BOQ, architectural drawings, specifications" />
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                        onChange={(e) => {
                          if (e.target.files) addFiles(Array.from(e.target.files));
                          e.target.value = "";
                        }}
                      />

                      {/* Drop zone */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={cn(
                          "flex items-center gap-5 rounded-xl px-6 py-5 cursor-pointer transition-all duration-200",
                          "border-2 border-dashed",
                          isDragging
                            ? "border-[#6c5ce7] bg-[#f8f7ff]"
                            : errors.attachments
                              ? "border-red-400 bg-red-50"
                              : "border-[#d1d5db] bg-white hover:border-[#6c5ce7] hover:bg-[#f8f7ff]"
                        )}>
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isDragging ? "bg-[#ede9fb]" : "bg-[#f3f4f6]"
                        )}>
                          <CloudUpload className={cn(
                            "w-6 h-6 transition-colors",
                            isDragging ? "text-[#6c5ce7]" : "text-[#6b7280]"
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#374151]">
                            Drag and drop your files here
                          </p>
                          <p className="text-[12px] text-[#6b7280] mt-0.5">
                            or{" "}
                            <span className="text-[#6c5ce7] underline font-normal">
                              click to browse
                            </span>
                          </p>
                          <p className="text-[11px] text-[#9ca3af] mt-1">
                            PDF, JPG, PNG, GIF, WEBP, XLSX, XLS (max 20MB)
                          </p>
                        </div>
                      </div>

                      {errors.attachments && (
                        <p className="text-[12px] text-red-500 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                          {errors.attachments}
                        </p>
                      )}

                      {/* File list */}
                      {files.length > 0 && (
                        <div className="space-y-2 mt-1 px-1">
                          {files.map((f) => (
                            <div
                              key={f.id}
                              className="bg-[#f9fafb] rounded-[10px] px-4 py-3 border border-[#f3f4f6]">
                              <div className="flex items-center gap-3">
                                <FileTypeIcon filename={f.file.name} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-normal text-[#111827] truncate">
                                    {f.file.name}
                                  </p>
                                  <p className="text-[11px] text-[#9ca3af]">
                                    {(f.file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                {f.status === "error" && (
                                  <button
                                    type="button"
                                    onClick={() => s3Upload.retryUpload(f.id)}
                                    className="text-[11px] text-[#6c5ce7] hover:underline shrink-0 px-1">
                                    Retry
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => s3Upload.removeEntry(f.id)}
                                  className="text-[#9ca3af] hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {f.status === "uploading" && (
                                <div className="mt-2.5">
                                  <div className="h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#6c5ce7] rounded-full transition-all duration-300"
                                      style={{ width: `${f.progress}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-[#9ca3af] mt-1">{f.progress}%</p>
                                </div>
                              )}
                              {f.status === "done" && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <Check className="w-3 h-3 text-[#00b894]" />
                                  <span className="text-[10px] text-[#00b894] font-normal">Uploaded</span>
                                </div>
                              )}
                              {f.status === "error" && (
                                <p className="text-[11px] text-red-500 mt-1">
                                  {f.error ?? "Upload failed"}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─────────────── STEP 2: SCOPE OF WORKS ─────────────── */}
                  {currentStep === 2 && (
                    <div className="p-8 space-y-6 text-left">
                      <div>
                        <SectionHeader
                          icon={<ScrollText className="w-3.5 h-3.5" />}
                          label="Scope of Works"
                          iconBg="#f0edff"
                          iconColor="#6c5ce7"
                        />
                        <p className="text-[13px] text-[#6b7280] -mt-2">
                          Describe the full scope of construction works. This will auto-populate into contract documents and appointment letters.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="relative group">
                          <textarea
                            className={cn(
                              "w-full px-4 py-4 rounded-[12px] text-[14px] text-[#111827] outline-none transition-all resize-none leading-relaxed",
                              "bg-[#f5f6f8] border border-[#e2e5ea]",
                              "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
                              "min-h-[250px]"
                            )}
                            placeholder={`e.g. The Client wishes to appoint an Architect to measure up the existing residential building with the intention for alterations and additions to the existing guest house...`}
                            value={taskOrder.brief}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTaskOrder({ brief: val });
                              setField("description", val); // Sync with description
                            }}
                          />

                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────── STEP 6: FINANCIALS & TIMELINE ──────────── */}
                  {currentStep === 6 && (
                    <div className="p-8 space-y-7">

                      {/* ── Timeline group ── */}
                      <div>
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f3f4f6]">
                          <div className="w-6 h-6 bg-[#eef2ff] rounded-lg flex items-center justify-center shrink-0">
                            <CalendarIcon className="w-3.5 h-3.5 text-[#6c5ce7]" />
                          </div>
                          <span className="text-[13px] font-normal text-[#374151]">Timeline</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Start date */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Start Date <span className="text-gray-400 text-[12px]">(optional)</span>
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    inputCls(!!errors.start_date),
                                    "flex items-center gap-2 text-left",
                                    !form.start_date && "text-[#9ca3af]"
                                  )}>
                                  <CalendarIcon className="w-4 h-4 shrink-0" />
                                  {form.start_date ? format(parseISO(form.start_date), "PPP") : "Pick a date"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={form.start_date ? parseISO(form.start_date) : undefined}
                                  onSelect={(date) => {
                                    setField("start_date", date ? format(date, "yyyy-MM-dd") : "");
                                    setErrors((p) => ({ ...p, start_date: undefined, date_range: undefined }));
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {errors.start_date && (
                              <p className="text-[12px] text-red-500 mt-1">{errors.start_date}</p>
                            )}
                          </div>

                          {/* End date */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              End Date <span className="text-gray-400 text-[12px]">(optional)</span>
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    inputCls(!!(errors.end_date || errors.date_range)),
                                    "flex items-center gap-2 text-left",
                                    !form.end_date && "text-[#9ca3af]"
                                  )}>
                                  <CalendarIcon className="w-4 h-4 shrink-0" />
                                  {form.end_date ? format(parseISO(form.end_date), "PPP") : "Pick a date"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 bg-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={form.end_date ? parseISO(form.end_date) : undefined}
                                  onSelect={(date) => {
                                    setField("end_date", date ? format(date, "yyyy-MM-dd") : "");
                                    setErrors((p) => ({ ...p, end_date: undefined, date_range: undefined }));
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {(errors.end_date || errors.date_range) && (
                              <p className="text-[12px] text-red-500 mt-1">
                                {errors.end_date || errors.date_range}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Duration bar */}
                        {duration && (
                          <div className="mt-4">
                            <div
                              className="h-2 rounded-full"
                              style={{ background: "linear-gradient(90deg, #6c5ce7, #a78bfa)" }}
                            />
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[11px] text-[#9ca3af]">
                                {format(duration.start, "MMM d, yyyy")}
                              </span>
                              <span className="text-[13px] font-normal text-[#6c5ce7]">
                                {getDurationLabel()}
                              </span>
                              <span className="text-[11px] text-[#9ca3af]">
                                {format(duration.end, "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Financial group ── */}
                      <div>
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#f3f4f6]">
                          <div className="w-6 h-6 bg-[#f0fdf4] rounded-lg flex items-center justify-center shrink-0">
                            <DollarSign className="w-3.5 h-3.5 text-[#00b894]" />
                          </div>
                          <span className="text-[13px] font-normal text-[#374151]">Financial Parameters</span>
                        </div>

                        {/* Row 1: Budget + Currency + Contract Type */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          {/* Budget */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Total Budget <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-normal text-[#6b7280] pointer-events-none select-none">
                                {CURRENCY_SYMBOLS[form.currency] || "R"}
                              </span>
                              <input
                                className={cn(
                                  "w-full rounded-[10px] outline-none transition-all",
                                  "bg-[#f5f6f8] border border-[#e2e5ea]",
                                  "focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10",
                                  "pl-10 pr-4 text-[18px] font-normal text-[#111827] h-[52px]",
                                  errors.total_budget && "!border-red-400 focus:ring-red-400/10"
                                )}
                                placeholder="0"
                                value={form.total_budget}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  setField("total_budget", raw ? formatWithCommas(parseInt(raw, 10)) : "");
                                }}
                              />
                            </div>
                            {errors.total_budget && (
                              <p className="text-[12px] text-red-500 mt-1">{errors.total_budget}</p>
                            )}
                          </div>

                          {/* Currency */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Currency
                            </label>
                            <SelectField value={form.currency} onChange={(v) => setField("currency", v)}>
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </SelectField>
                          </div>

                          {/* Contract Type */}
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Contract Type
                            </label>
                            <SelectField value={form.contract_type} onChange={(v) => setField("contract_type", v)}>
                              {CONTRACT_TYPES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </SelectField>
                          </div>
                        </div>

                        {/* Row 2: FX Rate + Retention + VAT */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <label className="text-[13px] font-normal text-[#374151]">FX Rate</label>
                              <Tooltip text="Exchange rate to project base currency" />
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              className={inputCls()}
                              value={form.fx_rate}
                              onChange={(e) => setField("fx_rate", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              Retention Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              max={10}
                              className={inputCls()}
                              value={form.retention_rate}
                              onChange={(e) => setField("retention_rate", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-normal text-[#374151] mb-1.5">
                              VAT Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              max={25}
                              className={inputCls()}
                              value={form.vat_rate}
                              onChange={(e) => setField("vat_rate", e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Live financial summary */}
                        <div
                          className="mt-5 rounded-xl p-4 border"
                          style={{ background: "#f0edff", borderColor: "#e0d9ff" }}>
                          <p className="text-[11px] font-normal text-[#6c5ce7] uppercase tracking-widest mb-3">
                            Budget Summary
                          </p>
                          <div className="space-y-2">
                            {[
                              { label: `Contract Value (excl. VAT)`, value: budget },
                              { label: `VAT (${vatRate}%)`, value: vatAmount },
                              { label: `Total (incl. VAT)`, value: totalWithVat, bold: true },
                              { label: `Retention (${retentionRate}%)`, value: retentionAmount },
                            ].map(({ label, value, bold }) => (
                              <div
                                key={label}
                                className={cn(
                                  "flex justify-between items-center",
                                  bold && "pt-2 mt-1 border-t border-[#d4ccff]"
                                )}>
                                <span className={cn("text-[12px] text-[#6b7280]", bold && "font-normal text-[#374151]")}>
                                  {label}
                                </span>
                                <span className={cn("text-[13px] tabular-nums", bold ? "font-normal text-[#101828]" : "text-[#374151]")}>
                                  {budget > 0 ? formatCurrency(value, form.currency) : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Navigation buttons ── */}
                  <div
                    className={cn(
                      "flex items-center px-8 pb-8",
                      currentStep === 1 ? "justify-end" : "justify-between"
                    )}>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        disabled={isLoading}
                        className={cn(
                          "flex items-center gap-2 h-12 px-6 rounded-[10px] text-[14px] font-normal transition-all",
                          "bg-white text-[#374151] border-[1.5px] border-[#e5e7eb]",
                          "hover:border-[#d1d5db] hover:bg-[#f9fafb]",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}>
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}

                    {currentStep < STEPS.length ? (
                      <div className="flex items-center gap-2">
                        {[2, 3, 4, 5].includes(currentStep) && (
                          <button
                            type="button"
                            onClick={handleSkip}
                            className="flex items-center gap-1.5 h-12 px-5 rounded-[10px] text-[14px] font-normal text-[#6b7280] border-[1.5px] border-[#e5e7eb] bg-white hover:bg-[#f9fafb] hover:text-[#374151] transition-all">
                            Skip
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleNext}
                          className={cn(
                            "flex items-center gap-2 h-12 px-8 rounded-[10px] text-[14px] font-normal text-white transition-all",
                            "bg-[#6c5ce7] hover:bg-[#5a4bd1]",
                            "hover:shadow-[0_4px_12px_rgba(108,92,231,0.3)] hover:-translate-y-px"
                          )}>
                          Continue
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn(
                          "flex items-center gap-2.5 h-[52px] px-10 rounded-[10px] text-[15px] font-normal text-white transition-all border-0 cursor-pointer",
                          isLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.99]"
                        )}
                        style={{
                          background: "linear-gradient(135deg, #6c5ce7, #5a4bd1)",
                          boxShadow: isLoading ? "none" : "0 4px 14px rgba(108,92,231,0.4)",
                        }}>
                        <Rocket className="w-4 h-4" />
                        {isLoading ? "Creating…" : "Create Project"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div >
        </div >
      </div >
    </>
  );
}

// make test