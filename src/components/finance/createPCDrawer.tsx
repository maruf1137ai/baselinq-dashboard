import React, { useState, useMemo, useRef } from "react";
import { CloseIcon } from "../icons/icons";
import { Plus, Trash2, Paperclip, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkLineItem {
  id: string;
  description: string;
  contractValue: number;
  previouslyCertified: number; // readonly — auto-pulled from prior PCs
  thisPeriod: number; // key editable field
}

interface VOLineItem {
  voNumber: string;
  description: string;
  approvedValue: number;
  previouslyCertified: number;
  thisPeriod: number;
  included: boolean;
}

export interface PCFormData {
  pcNumber: string;
  valuationPeriod: string;
  certificateDate: string;
  workItems: WorkLineItem[];
  voItems: VOLineItem[];
  materialsOnSite: number;
  penalties: number;
  advanceRecovery: number;
  retentionRelease: number;
  notes: string;
  attachments: File[];
  // Computed fields (for saving to table)
  claim: number; // Net Valuation This Period
  retention: number;
  net: number; // Amount Due to Contractor
}

/** Payload for POST /api/tasks/payment-certificates/ — full form + projectId (backend stores all, auto-generates pcNumber) */
export interface CreatePCApiPayload {
  projectId: number;
  valuationPeriod: string;
  certificateDate: string;
  workItems: WorkLineItem[];
  voItems: VOLineItem[];
  materialsOnSite: number;
  penalties: number;
  advanceRecovery: number;
  retentionRelease: number;
  notes: string;
  claim: number;
  retention: number;
  net: number;
  approvalStatus?: "pending" | "partial" | "approved";
}

interface CreatePCDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  onSubmit?: (payload: CreatePCApiPayload) => void | Promise<void>;
}

// ─── Default seed data (from prior PCs) ──────────────────────────────────────

const DEFAULT_WORK_ITEMS: WorkLineItem[] = [
  {
    id: "1",
    description: "Preliminaries",
    contractValue: 4500000,
    previouslyCertified: 3825000,
    thisPeriod: 225000,
  },
  {
    id: "2",
    description: "Substructure",
    contractValue: 6800000,
    previouslyCertified: 6800000,
    thisPeriod: 0,
  },
  {
    id: "3",
    description: "Superstructure",
    contractValue: 12000000,
    previouslyCertified: 9600000,
    thisPeriod: 600000,
  },
  {
    id: "4",
    description: "Roof Works",
    contractValue: 3800000,
    previouslyCertified: 2660000,
    thisPeriod: 380000,
  },
  {
    id: "5",
    description: "Internal Finishes",
    contractValue: 8500000,
    previouslyCertified: 2975000,
    thisPeriod: 850000,
  },
  {
    id: "6",
    description: "Mechanical",
    contractValue: 4200000,
    previouslyCertified: 1260000,
    thisPeriod: 630000,
  },
  {
    id: "7",
    description: "Electrical",
    contractValue: 3800000,
    previouslyCertified: 1140000,
    thisPeriod: 570000,
  },
  {
    id: "8",
    description: "External Works",
    contractValue: 2100000,
    previouslyCertified: 0,
    thisPeriod: 210000,
  },
];

const DEFAULT_VO_ITEMS: VOLineItem[] = [
  {
    voNumber: "VO-005",
    description: "HVAC system upgrade for server room",
    approvedValue: 2850000,
    previouslyCertified: 1425000,
    thisPeriod: 0,
    included: false,
  },
  {
    voNumber: "VO-003",
    description: "Structural steel upgrade - main columns",
    approvedValue: 3200000,
    previouslyCertified: 3200000,
    thisPeriod: 0,
    included: false,
  },
  {
    voNumber: "VO-002",
    description: "Facade panel material change",
    approvedValue: 1750000,
    previouslyCertified: 1050000,
    thisPeriod: 0,
    included: false,
  },
  {
    voNumber: "VO-001",
    description: "Electrical capacity increase",
    approvedValue: 980000,
    previouslyCertified: 980000,
    thisPeriod: 0,
    included: false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  `R ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(Math.abs(v))
  )}`;

const pct = (v: number) =>
  isNaN(v) || !isFinite(v) ? "0.0%" : `${Math.min(v, 999).toFixed(1)}%`;

// Card formatter — commas + 2 decimal places (R 1,377,500.00)
const fmtCard = (v: number) =>
  `R ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(v))}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 className="text-sm text-foreground mb-3">{children}</h3>
);

const CurrencyInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
}> = ({ value, onChange, disabled = false, className = "" }) => {
  const [focused, setFocused] = React.useState(false);
  const [raw, setRaw] = React.useState(value === 0 ? "" : String(value));

  const formatted =
    !focused && value !== 0
      ? new Intl.NumberFormat("en-US").format(value)
      : raw;

  const handleFocus = () => {
    setFocused(true);
    setRaw(value === 0 ? "" : String(value));
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setRaw(digits);
    onChange(digits === "" ? 0 : Number(digits));
  };

  return (
    <div
      className={`flex items-center border border-gray-200 rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-[#8081F6] focus-within:border-[#8081F6] ${disabled ? "bg-gray-50" : ""
        } ${className}`}
    >
      <span className="px-2.5 py-1.5 text-sm text-muted-foreground bg-gray-50 border-r border-gray-200 select-none">
        R
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={focused ? raw : formatted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        disabled={disabled}
        className="flex-1 px-2.5 py-1.5 text-sm text-foreground focus:outline-none bg-transparent disabled:bg-gray-50 disabled:text-muted-foreground w-full"
        placeholder="0"
      />
    </div>
  );
};

interface SummaryLineProps {
  label: string;
  value: number;
  bold?: boolean;
  deduction?: boolean; // renders "- R X" in red
  addition?: boolean; // renders "+ R X"
  indent?: boolean;
  border?: boolean;
  doubleBorder?: boolean;
}

const SummaryLine: React.FC<SummaryLineProps> = ({
  label,
  value,
  bold,
  deduction,
  addition,
  indent,
  border,
  doubleBorder,
}) => (
  <div
    className={`flex justify-between items-center py-2 ${doubleBorder
      ? "border-t-2 border-[#0E1C2E] mt-3 pt-3"
      : border
        ? "border-t border-gray-200 mt-2 pt-3"
        : ""
      } ${indent ? "pl-4" : ""}`}
  >
    <span
      className={`text-sm ${bold ? "text-foreground" : "text-muted-foreground"}`}
    >
      {label}
    </span>
    <span
      className={`text-sm ${deduction ? "text-red-500" : addition ? "text-green-600" : "text-foreground"
        }`}
    >
      {deduction ? `- ${fmt(value)}` : addition ? `+ ${fmt(value)}` : fmt(value)}
    </span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const CreatePCDrawer: React.FC<CreatePCDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  onSubmit,
}) => {
  // Certificate Info (pcNumber is set by backend on create)
  const pcNumber = "—"; // readonly; backend returns PC-001, PC-002, etc.
  const [valuationPeriod, setValuationPeriod] = useState<Date | undefined>(
    new Date(2025, 10, 1) // Nov 2025 — next after last PC
  );
  const [certificateDate, setCertificateDate] = useState<Date | undefined>(
    new Date()
  );

  // Work Completed
  const [workItems, setWorkItems] = useState<WorkLineItem[]>(DEFAULT_WORK_ITEMS);

  // Variation Orders
  const [voItems, setVoItems] = useState<VOLineItem[]>(DEFAULT_VO_ITEMS);

  // Materials on Site
  const [materialsOnSite, setMaterialsOnSite] = useState(0);

  // Adjustments
  const [penalties, setPenalties] = useState(0);
  const [advanceRecovery, setAdvanceRecovery] = useState(0);

  // Retention Release (editable)
  const [retentionRelease, setRetentionRelease] = useState(0);

  // Notes & Attachments
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Auto-calculations ──────────────────────────────────────────────────────

  const calc = useMemo(() => {
    const grossWorkValue = workItems.reduce((s, i) => s + i.thisPeriod, 0);
    const voThisPeriod = voItems
      .filter((v) => v.included)
      .reduce((s, v) => s + v.thisPeriod, 0);
    const grossValuation = grossWorkValue + voThisPeriod + materialsOnSite;
    const grossValuationAdjusted = grossValuation - penalties - advanceRecovery;
    // "Net Valuation This Period" = Claim column
    const netValuationThisPeriod = grossValuationAdjusted;
    // Retention @ 5%
    const retention = netValuationThisPeriod * 0.05;
    const subtotal = netValuationThisPeriod - retention + retentionRelease;
    const vat = subtotal * 0.15;
    // Amount Due = Net column
    const amountDue = subtotal + vat;

    return {
      grossWorkValue,
      voThisPeriod,
      grossValuation,
      grossValuationAdjusted,
      netValuationThisPeriod,
      retention,
      subtotal,
      vat,
      amountDue,
    };
  }, [
    workItems,
    voItems,
    materialsOnSite,
    penalties,
    advanceRecovery,
    retentionRelease,
  ]);

  // ─── Work item helpers ──────────────────────────────────────────────────────

  const updateWorkItem = (
    id: string,
    field: keyof WorkLineItem,
    value: string | number
  ) => {
    setWorkItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addWorkItem = () => {
    setWorkItems((items) => [
      ...items,
      {
        id: String(Date.now()),
        description: "",
        contractValue: 0,
        previouslyCertified: 0,
        thisPeriod: 0,
      },
    ]);
  };

  const removeWorkItem = (id: string) => {
    setWorkItems((items) => items.filter((i) => i.id !== id));
  };

  // ─── VO helpers ─────────────────────────────────────────────────────────────

  const toggleVO = (voNumber: string) => {
    setVoItems((items) =>
      items.map((v) =>
        v.voNumber === voNumber ? { ...v, included: !v.included } : v
      )
    );
  };

  const updateVOThisPeriod = (voNumber: string, value: number) => {
    setVoItems((items) =>
      items.map((v) =>
        v.voNumber === voNumber ? { ...v, thisPeriod: value } : v
      )
    );
  };

  // ─── File helpers ────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  // const payload = {
  //   "pcNumber": "PC-004",
  //   "valuationPeriod": "2025-11",
  //   "certificateDate": "2026-02-25",
  //   "workItems": [
  //     {
  //       "id": "1",
  //       "description": "Preliminaries",
  //       "contractValue": 4500000,
  //       "previouslyCertified": 3825000,
  //       "thisPeriod": 225000
  //     },
  //     {
  //       "id": "2",
  //       "description": "Substructure",
  //       "contractValue": 6800000,
  //       "previouslyCertified": 6800000,
  //       "thisPeriod": 0
  //     },
  //     {
  //       "id": "3",
  //       "description": "Superstructure",
  //       "contractValue": 12000000,
  //       "previouslyCertified": 9600000,
  //       "thisPeriod": 600000
  //     },
  //     {
  //       "id": "4",
  //       "description": "Roof Works",
  //       "contractValue": 3800000,
  //       "previouslyCertified": 2660000,
  //       "thisPeriod": 380000
  //     },
  //     {
  //       "id": "5",
  //       "description": "Internal Finishes",
  //       "contractValue": 8500000,
  //       "previouslyCertified": 2975000,
  //       "thisPeriod": 850000
  //     },
  //     {
  //       "id": "6",
  //       "description": "Mechanical",
  //       "contractValue": 4200000,
  //       "previouslyCertified": 1260000,
  //       "thisPeriod": 630000
  //     },
  //     {
  //       "id": "7",
  //       "description": "Electrical",
  //       "contractValue": 3800000,
  //       "previouslyCertified": 1140000,
  //       "thisPeriod": 570000
  //     },
  //     {
  //       "id": "8",
  //       "description": "External Works",
  //       "contractValue": 2100000,
  //       "previouslyCertified": 0,
  //       "thisPeriod": 210000
  //     }
  //   ],
  //   "voItems": [],
  //   "materialsOnSite": 0,
  //   "penalties": 0,
  //   "advanceRecovery": 0,
  //   "retentionRelease": 0,
  //   "notes": "",
  //   "attachments": [],
  //   "claim": 3465000,
  //   "retention": 173250,
  //   "net": 3785512.5
  // }
  // API payload = above + projectId (see CreatePCApiPayload). Backend stores full structure.

  const handleSubmit = () => {
    if (!projectId) {
      return;
    }
    const payload: CreatePCApiPayload = {
      projectId: Number(projectId),
      valuationPeriod: valuationPeriod ? format(valuationPeriod, "yyyy-MM") : "",
      certificateDate: certificateDate ? format(certificateDate, "yyyy-MM-dd") : "",
      workItems,
      voItems,
      materialsOnSite,
      penalties,
      advanceRecovery,
      retentionRelease,
      notes,
      claim: calc.netValuationThisPeriod,
      retention: calc.retention,
      net: calc.amountDue,
      approvalStatus: "pending",
    };
    onSubmit?.(payload);
    onClose();
  };

  // ─── Derived totals for work table footer ────────────────────────────────────

  const workTotals = {
    contractValue: workItems.reduce((s, i) => s + i.contractValue, 0),
    previouslyCertified: workItems.reduce(
      (s, i) => s + i.previouslyCertified,
      0
    ),
    thisPeriod: calc.grossWorkValue,
    cumulative: workItems.reduce(
      (s, i) => s + i.previouslyCertified + i.thisPeriod,
      0
    ),
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-5xl bg-white shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-pc-title"
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2
              id="create-pc-title"
              className="text-base text-foreground"
            >
              New Payment Certificate
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pcNumber} · Draft — approvals triggered on submission
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        </header>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* ── 1. Certificate Information ──────────────────────────────────── */}
            <section>
              <SectionHeader>Certificate Information</SectionHeader>
              <div className="grid grid-cols-3 gap-4">
                {/* PC Number */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    PC Number
                  </label>
                  <input
                    type="text"
                    value={pcNumber}
                    readOnly
                    className="w-full px-3 py-2 text-sm text-muted-foreground bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed"
                  />
                </div>
                {/* Valuation Period */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Valuation Period
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8081F6]">
                        <span>
                          {valuationPeriod
                            ? format(valuationPeriod, "MMMM yyyy")
                            : "Select period"}
                        </span>
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={valuationPeriod}
                        onSelect={(date) =>
                          date &&
                          setValuationPeriod(
                            new Date(date.getFullYear(), date.getMonth(), 1)
                          )
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {/* Certificate Date */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Certificate Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#8081F6]">
                        <span>
                          {certificateDate
                            ? format(certificateDate, "dd MMM yyyy")
                            : "Select date"}
                        </span>
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={certificateDate}
                        onSelect={setCertificateDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </section>

            {/* ── 2. Work Completed ────────────────────────────────────────────── */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <SectionHeader>Work Completed</SectionHeader>
                <button
                  onClick={addWorkItem}
                  className="flex items-center gap-1 text-xs text-[#8081F6] hover:text-[#8081F6] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="overflow-x-auto no-scrollbar rounded-lg border border-gray-200">
                <table className="w-full text-sm min-w-[780px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-xs font-normal text-muted-foreground ">
                        Description
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground  whitespace-nowrap">
                        Contract Value
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground  whitespace-nowrap">
                        Prev. Certified
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground  whitespace-nowrap">
                        This Period
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground ">
                        Cumulative
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground ">
                        % Complete
                      </th>
                      <th className="px-3 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {workItems.map((item) => {
                      const cumulative =
                        item.previouslyCertified + item.thisPeriod;
                      const pctComplete =
                        item.contractValue > 0
                          ? (cumulative / item.contractValue) * 100
                          : 0;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/60">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                updateWorkItem(
                                  item.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              className="w-full text-sm text-foreground focus:outline-none bg-transparent border-b border-transparent focus:border-[#8081F6] py-0.5 min-w-[130px]"
                              placeholder="Description"
                            />
                          </td>
                          <td className="px-3 py-2 w-36">
                            <CurrencyInput
                              value={item.contractValue}
                              onChange={(v) =>
                                updateWorkItem(item.id, "contractValue", v)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-muted-foreground whitespace-nowrap">
                            {fmt(item.previouslyCertified)}
                          </td>
                          <td className="px-3 py-2 w-36">
                            <CurrencyInput
                              value={item.thisPeriod}
                              onChange={(v) =>
                                updateWorkItem(item.id, "thisPeriod", v)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-foreground whitespace-nowrap">
                            {fmt(cumulative)}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <span
                              className={`text-sm ${pctComplete >= 100
                                ? "text-green-600"
                                : pctComplete >= 75
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                                }`}
                            >
                              {pct(pctComplete)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeWorkItem(item.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-3 py-2.5 text-xs text-foreground">
                        Totals
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-foreground">
                        {fmt(workTotals.contractValue)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                        {fmt(workTotals.previouslyCertified)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-[#8081F6]">
                        {fmt(workTotals.thisPeriod)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-foreground">
                        {fmt(workTotals.cumulative)}
                      </td>
                      <td className="px-3 py-2.5" colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* ── 3. Approved Variation Orders ─────────────────────────────────── */}
            <section>
              <SectionHeader>Approved Variation Orders</SectionHeader>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 w-10" />
                      <th className="px-3 py-2.5 text-left text-xs font-normal text-muted-foreground ">
                        VO #
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-normal text-muted-foreground ">
                        Description
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground  whitespace-nowrap">
                        Approved Value
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground  whitespace-nowrap">
                        Prev. Certified
                      </th>
                      <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground  whitespace-nowrap">
                        This Period
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {voItems.map((vo) => (
                      <tr
                        key={vo.voNumber}
                        className={`transition-colors ${vo.included
                          ? "bg-[#8081F6]/5"
                          : "hover:bg-gray-50/60"
                          }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={vo.included}
                            onChange={() => toggleVO(vo.voNumber)}
                            className="w-4 h-4 rounded border-gray-300 accent-[#8081F6] cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 text-[#3A6FF7] text-sm">
                          {vo.voNumber}
                        </td>
                        <td className="px-3 py-3 text-foreground text-sm max-w-[220px] truncate">
                          {vo.description}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-foreground">
                          {fmt(vo.approvedValue)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                          {fmt(vo.previouslyCertified)}
                        </td>
                        <td className="px-3 py-3 w-36">
                          <div className="flex justify-end">
                            {vo.included ? (
                              <CurrencyInput
                                value={vo.thisPeriod}
                                onChange={(v) =>
                                  updateVOThisPeriod(vo.voNumber, v)
                                }
                              />
                            ) : (
                              <span className="text-sm text-gray-300 pr-2">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tick the checkbox to include a VO in this certificate and enter
                the amount certified this period.
              </p>
            </section>

            {/* ── 4 & 5. Materials on Site + Adjustments ──────────────────────── */}
            <div className="grid grid-cols-2 gap-6">
              {/* Materials on Site */}
              <section>
                <SectionHeader>Materials on Site</SectionHeader>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Unfixed materials delivered but not yet incorporated
                </label>
                <CurrencyInput
                  value={materialsOnSite}
                  onChange={setMaterialsOnSite}
                />
              </section>

              {/* Adjustments */}
              <section>
                <SectionHeader>Adjustments</SectionHeader>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      Contractual Penalties / Deductions
                    </label>
                    <CurrencyInput
                      value={penalties}
                      onChange={setPenalties}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      Advance Payment Recovery
                    </label>
                    <CurrencyInput
                      value={advanceRecovery}
                      onChange={setAdvanceRecovery}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* ── 6. Financial Summary ─────────────────────────────────────────── */}
            <section>
              <SectionHeader>Financial Summary</SectionHeader>
              <div className="bg-muted rounded-lg border border-gray-200 px-5 py-4">
                {/* Build-up */}
                <SummaryLine
                  label="Gross Work Value"
                  value={calc.grossWorkValue}
                />
                <SummaryLine
                  label="Plus: Variation Orders (this period)"
                  value={calc.voThisPeriod}
                  indent
                  addition
                />
                <SummaryLine
                  label="Plus: Materials on Site"
                  value={materialsOnSite}
                  indent
                  addition
                />

                <SummaryLine
                  label="Gross Valuation"
                  value={calc.grossValuation}
                  bold
                  border
                />

                {/* Adjustments */}
                {(penalties > 0 || advanceRecovery > 0) && (
                  <>
                    {penalties > 0 && (
                      <SummaryLine
                        label="Less: Contractual Penalties"
                        value={penalties}
                        indent
                        deduction
                      />
                    )}
                    {advanceRecovery > 0 && (
                      <SummaryLine
                        label="Less: Advance Payment Recovery"
                        value={advanceRecovery}
                        indent
                        deduction
                      />
                    )}
                  </>
                )}

                {/* Net Valuation This Period = Claim */}
                <SummaryLine
                  label="Net Valuation This Period (Claim)"
                  value={calc.netValuationThisPeriod}
                  bold
                  border={penalties > 0 || advanceRecovery > 0}
                />

                {/* Retention & Release */}
                <div className="border-t border-gray-200 mt-2 pt-3 space-y-2">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Less: Retention @ 5%
                    </span>
                    <span className="text-sm text-red-500">
                      - {fmt(calc.retention)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                      Plus: Retention Release
                    </span>
                    <div className="w-36">
                      <CurrencyInput
                        value={retentionRelease}
                        onChange={setRetentionRelease}
                      />
                    </div>
                  </div>
                </div>

                {/* Subtotal + VAT */}
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <SummaryLine
                    label="Subtotal (ex VAT)"
                    value={calc.subtotal}
                    bold
                  />
                  <SummaryLine
                    label="Plus: VAT @ 15%"
                    value={calc.vat}
                    indent
                    addition
                  />
                </div>

                {/* Amount Due — Net column */}
                <div className="border-t-2 border-[#0E1C2E] mt-3 pt-4 flex justify-between items-center">
                  <span className="text-base text-foreground">
                    Amount Due to Contractor
                  </span>
                  <span className="text-base text-[#8081F6]">
                    {fmt(calc.amountDue)}
                  </span>
                </div>
              </div>

              {/* Quick reference — 3 inline cards */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="flex justify-between items-center border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-xs text-muted-foreground">Claim</span>
                  <span className="text-sm text-foreground">{fmtCard(calc.netValuationThisPeriod)}</span>
                </div>
                <div className="flex justify-between items-center border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-xs text-muted-foreground">Retention @ 5%</span>
                  <span className="text-sm text-foreground">{fmtCard(calc.retention)}</span>
                </div>
                <div className="flex justify-between items-center border border-gray-200 rounded-lg px-4 py-3 bg-primary/10">
                  <span className="text-xs text-muted-foreground">Net (Amount Due)</span>
                  <span className="text-sm text-[#8081F6]">{fmtCard(calc.amountDue)}</span>
                </div>
              </div>
            </section>

            {/* ── 7. Notes & Attachments ───────────────────────────────────────── */}
            <section>
              <SectionHeader>Notes & Attachments</SectionHeader>
              <div className="space-y-4">
                {/* QS Notes */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    QS Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm text-foreground border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#8081F6] focus:border-[#8081F6] resize-none placeholder:text-gray-400"
                    placeholder="Add valuation methodology, site notes, or special instructions…"
                  />
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Supporting Documents
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-[#8081F6] hover:bg-[#8081F6]/5 transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload valuations, site photos, delivery notes
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PDF, PNG, JPG, XLSX
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {attachments.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {attachments.map((file, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-md"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({(file.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeAttachment(i)}
                            className="text-gray-400 hover:text-red-400 ml-2 shrink-0 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white shrink-0">
          <p className="text-xs text-muted-foreground max-w-xs">
            Submitting will trigger the QS → PA → Employer approval chain.
            Status and dates are system-managed.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!projectId}
              title={!projectId ? "Select a project first" : undefined}
              className="px-5 py-2 text-sm text-white bg-[#8081F6] rounded-md hover:bg-[#8081F6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Certificate
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};
