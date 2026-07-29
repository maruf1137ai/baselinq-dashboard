import React, { useState, useMemo, useRef, useEffect } from "react";
import useFetch from "@/hooks/useFetch";
import { useProject } from "@/hooks/useProjects";
import { CloseIcon } from "../icons/icons";
import { Plus, Trash2, Paperclip, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatZAR } from "@/lib/formatCurrency";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkLineItem {
  id: string;
  description: string;
  contractValue: number;
  /**
   * NOT auto-pulled, unlike a VO line — and the comment here used to claim it
   * was. A work item is free text with an id generated at the moment the row
   * is added, so there is no stable key to match the same line of work across
   * certificates. Until work items are linked records (a bill-of-quantities
   * item, or a milestone), this has to be entered by the person preparing the
   * valuation.
   *
   * VO lines DO carry a real history — they key on the VO number. See
   * `certifiedByVo`.
   */
  previouslyCertified: number;
  thisPeriod: number; // key editable field
}

interface VOLineItem {
  voNumber: string;
  description: string;
  approvedValue: number;
  /** Summed from this project's earlier certificates, not assumed to be zero. */
  previouslyCertified: number;
  thisPeriod: number;
  included: boolean;
  /** approvedValue − previouslyCertified, floored at zero. */
  remainingValue?: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Money goes through formatZAR, the app's single currency formatter. These
// were `Intl.NumberFormat("en-US")`, which renders South African rands in US
// convention — "R 1,377,500.00" instead of "R 1 377 500,00" — so the drawer
// disagreed with every table it feeds.
const fmt = (v: number) => formatZAR(Math.abs(v));

const pct = (v: number) =>
  isNaN(v) || !isFinite(v) ? "0.0%" : `${Math.min(v, 999).toFixed(1)}%`;

const fmtCard = (v: number) => formatZAR(Math.abs(v));

/** Thousands grouping for the raw amount inside a currency input: same
 *  non-breaking space separator formatZAR uses, without the R prefix. */
const groupDigits = (v: number) =>
  String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 className="text-sm font-medium text-foreground mb-3">{children}</h3>
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
      ? groupDigits(value)
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
      className={`flex items-center border border-border rounded-md overflow-hidden bg-card focus-within:ring-1 focus-within:ring-primary focus-within:border-primary ${disabled ? "bg-muted/50" : ""
        } ${className}`}
    >
      <span className="px-2.5 py-1.5 text-sm text-muted-foreground bg-muted/50 border-r border-border select-none">
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
        className="flex-1 px-2.5 py-1.5 text-sm text-foreground focus:outline-none bg-transparent disabled:bg-muted/50 disabled:text-muted-foreground w-full"
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
      ? "border-t-2 border-foreground mt-3 pt-3"
      : border
        ? "border-t border-border mt-2 pt-3"
        : ""
      } ${indent ? "pl-4" : ""}`}
  >
    <span
      className={`text-sm ${bold ? "text-foreground" : "text-muted-foreground"}`}
    >
      {label}
    </span>
    <span
      className={`text-sm tabular-nums ${deduction ? "text-red-500" : addition ? "text-green-600" : "text-foreground"
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
    // First day of the current month — not a date pinned to a demo dataset.
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [certificateDate, setCertificateDate] = useState<Date | undefined>(
    new Date()
  );

  // Work Completed
  const [workItems, setWorkItems] = useState<WorkLineItem[]>([]);

  // Variation Orders — populated from the project's approved VOs, never seeded.
  const [voItems, setVoItems] = useState<VOLineItem[]>([]);

  const { data: voResponse, isLoading: isLoadingVOs } = useFetch<{ results: any[] }>(
    isOpen && projectId ? `tasks/tasks/?taskType=VO&project=${projectId}` : "",
    { enabled: !!(isOpen && projectId) }
  );

  // Retention/VAT rates were hardcoded here (5% / 15%) regardless of the
  // project's own project.retention_rate / vat_rate — correct for the
  // seeded demo project, wrong for any project on different terms. Read the
  // real rates, falling back to 5/15 only while the project hasn't loaded yet
  // (matches the same fallback used in CreateProject.tsx / EditProject.tsx).
  const { data: projectDetail } = useProject(isOpen ? projectId ?? undefined : undefined);
  const retentionRatePct = Number(
    (projectDetail as any)?.retentionRate ?? (projectDetail as any)?.retention_rate ?? 5
  );
  const vatRatePct = Number(
    (projectDetail as any)?.vatRate ?? (projectDetail as any)?.vat_rate ?? 15
  );

  // Every certificate already issued on this project. Needed for
  // previouslyCertified — see below.
  const { data: priorPCResponse } = useFetch<{ results: any[] }>(
    isOpen && projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
    { enabled: !!(isOpen && projectId) }
  );

  /**
   * How much of each VO has already been certified on earlier certificates.
   *
   * This was hardcoded to 0 while the type declared it "readonly — auto-pulled
   * from prior PCs". It was not pulled from anything. Every certificate was
   * therefore built from an empty history, so "Cumulative" and "% Complete"
   * were wrong on every certificate after the first, and the same variation
   * could be certified in full on PC-001, PC-002 and PC-003 with nothing
   * anywhere noticing. The operator was shown a zero and told it came from
   * history, which is worse than showing nothing.
   */
  const certifiedByVo = useMemo<Record<string, number>>(() => {
    const totals: Record<string, number> = {};
    for (const pc of priorPCResponse?.results || []) {
      for (const row of pc?.voItems || pc?.vo_items || []) {
        const ref = String(row?.voNumber ?? row?.vo_number ?? "").trim();
        if (!ref) continue;
        totals[ref] = (totals[ref] || 0) + (Number(row?.thisPeriod ?? row?.this_period) || 0);
      }
    }
    return totals;
  }, [priorPCResponse]);

  const approvedVOs = useMemo<VOLineItem[]>(() => {
    return (voResponse?.results || [])
      // The VO's OWN status lives on the nested entity. The top-level `status`
      // on this payload is the KANBAN status, which is only ever
      // todo | in review | done — so comparing it to "approved" never matched
      // and this list was permanently empty. The whole VO-to-certificate link
      // has never worked.
      //
      // "closed" is included alongside "approved": Closed is a VO's normal
      // end-of-life status after successful completion (not a cancellation —
      // see billing/accrual.py's vo_status_reverses_charge, which treats
      // Closed the same as Approved for fee purposes). A VO that's been
      // approved and then closed still represents real, certifiable value.
      .filter((item: any) => ["approved", "closed"].includes(String(item.task?.status || "").toLowerCase()))
      .map((item: any) => {
        const voNumber =
          item.task?.voNumber || item.task?.vo_number || `VO-${item.taskId}`;
        const approvedValue = Number(item.task?.grandTotal) || 0;
        const previouslyCertified = certifiedByVo[voNumber] || 0;
        return {
          voNumber,
          description: item.task?.title || "",
          approvedValue,
          previouslyCertified,
          thisPeriod: 0,
          included: false,
          // What is left to certify. Surfaced so an operator can see at a
          // glance that a fully-certified variation has nothing remaining,
          // rather than re-certifying it because the drawer showed zero.
          remainingValue: Math.max(approvedValue - previouslyCertified, 0),
        };
      });
  }, [voResponse, certifiedByVo]);

  // Sync the editable VO rows with the fetched register, preserving any
  // inclusion / amount the user has already entered for a given VO.
  useEffect(() => {
    setVoItems((prev) =>
      approvedVOs.map((vo) => {
        const existing = prev.find((p) => p.voNumber === vo.voNumber);
        return existing ? { ...vo, included: existing.included, thisPeriod: existing.thisPeriod } : vo;
      })
    );
  }, [approvedVOs]);

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
    const retention = netValuationThisPeriod * (retentionRatePct / 100);
    const subtotal = netValuationThisPeriod - retention + retentionRelease;
    const vat = subtotal * (vatRatePct / 100);
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
    retentionRatePct,
    vatRatePct,
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
        className={`fixed top-0 right-0 h-full w-full max-w-5xl bg-card shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-pc-title"
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2
              id="create-pc-title"
              className="text-sm font-medium text-foreground"
            >
              New Payment Certificate
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pcNumber} · Creates as Draft — submit for certification afterwards from the table
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
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
                    className="w-full px-3 py-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-md cursor-not-allowed"
                  />
                </div>
                {/* Valuation Period */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Valuation Period
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground border border-border rounded-md hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary">
                        <span>
                          {valuationPeriod
                            ? format(valuationPeriod, "MMMM yyyy")
                            : "Select period"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                      <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground border border-border rounded-md hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary">
                        <span>
                          {certificateDate
                            ? format(certificateDate, "dd MMM yyyy")
                            : "Select date"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="overflow-x-auto no-scrollbar rounded-lg border border-border">
                <table className="w-full text-sm min-w-[780px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
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
                  <tbody className="divide-y divide-border bg-card">
                    {workItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8">
                          <div className="rounded-lg bg-muted/50 px-4 py-6 text-center">
                            <p className="text-sm text-foreground">No work items yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Add a line for each section of work being valued this period.
                            </p>
                            <button
                              onClick={addWorkItem}
                              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Line Item
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {workItems.map((item) => {
                      const cumulative =
                        item.previouslyCertified + item.thisPeriod;
                      const pctComplete =
                        item.contractValue > 0
                          ? (cumulative / item.contractValue) * 100
                          : 0;
                      return (
                        <tr key={item.id} className="hover:bg-muted/50">
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
                              className="w-full text-sm text-foreground focus:outline-none bg-transparent border-b border-transparent focus:border-primary py-0.5 min-w-[130px]"
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
                          <td className="px-3 py-2 text-right text-sm text-muted-foreground whitespace-nowrap tabular-nums">
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
                          <td className="px-3 py-2 text-right text-sm text-foreground whitespace-nowrap tabular-nums">
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
                              aria-label="Remove work item"
                              onClick={() => removeWorkItem(item.id)}
                              className="text-muted-foreground hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t-2 border-border">
                      <td className="px-3 py-2.5 text-xs text-foreground">
                        Totals
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-foreground tabular-nums">
                        {fmt(workTotals.contractValue)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                        {fmt(workTotals.previouslyCertified)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-primary tabular-nums">
                        {fmt(workTotals.thisPeriod)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-foreground tabular-nums">
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
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
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
                  <tbody className="divide-y divide-border bg-card">
                    {voItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8">
                          <div className="rounded-lg bg-muted/50 px-4 py-6 text-center">
                            <p className="text-sm text-foreground">
                              {isLoadingVOs ? "Loading approved variation orders…" : "No approved variation orders"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Variations appear here once they are approved on this project.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {voItems.map((vo) => (
                      <tr
                        key={vo.voNumber}
                        className={`transition-colors ${vo.included
                          ? "bg-primary/5"
                          : "hover:bg-muted/50"
                          }`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={vo.included}
                            onChange={() => toggleVO(vo.voNumber)}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3 text-primary text-sm">
                          {vo.voNumber}
                        </td>
                        <td className="px-3 py-3 text-foreground text-sm max-w-[220px] truncate">
                          {vo.description}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-foreground tabular-nums">
                          {fmt(vo.approvedValue)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-muted-foreground tabular-nums">
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
                              <span className="text-sm text-muted-foreground pr-2">
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
              <div className="bg-muted rounded-lg border border-border px-5 py-4">
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
                <div className="border-t border-border mt-2 pt-3 space-y-2">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">
                      Less: Retention @ {retentionRatePct}%
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
                <div className="border-t border-border mt-3 pt-3">
                  <SummaryLine
                    label="Subtotal (ex VAT)"
                    value={calc.subtotal}
                    bold
                  />
                  <SummaryLine
                    label={`Plus: VAT @ ${vatRatePct}%`}
                    value={calc.vat}
                    indent
                    addition
                  />
                </div>

                {/* Amount Due — Net column */}
                <div className="border-t-2 border-foreground mt-3 pt-4 flex justify-between items-center">
                  <span className="text-sm text-foreground">
                    Amount Due to Contractor
                  </span>
                  <span className="text-sm text-primary">
                    {fmt(calc.amountDue)}
                  </span>
                </div>
              </div>

              {/* Quick reference — 3 inline cards */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="flex justify-between items-center border border-border rounded-lg px-4 py-3">
                  <span className="text-xs text-muted-foreground">Claim</span>
                  <span className="text-sm text-foreground tabular-nums">{fmtCard(calc.netValuationThisPeriod)}</span>
                </div>
                <div className="flex justify-between items-center border border-border rounded-lg px-4 py-3">
                  <span className="text-xs text-muted-foreground">Retention @ {retentionRatePct}%</span>
                  <span className="text-sm text-foreground tabular-nums">{fmtCard(calc.retention)}</span>
                </div>
                <div className="flex justify-between items-center border border-border rounded-lg px-4 py-3 bg-primary/10">
                  <span className="text-xs text-muted-foreground">Net (Amount Due)</span>
                  <span className="text-sm text-primary tabular-nums">{fmtCard(calc.amountDue)}</span>
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
                    className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none placeholder:text-muted-foreground"
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
                    className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload valuations, site photos, delivery notes
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
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
                          className="flex items-center justify-between px-3 py-2 bg-muted/50 border border-border rounded-md"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate">
                              {file.name}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({(file.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            aria-label="Remove attachment"
                            onClick={() => removeAttachment(i)}
                            className="text-muted-foreground hover:text-red-600 ml-2 shrink-0 transition-colors"
                          >
                            <X className="h-4 w-4" />
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
        <footer className="flex items-center justify-between px-6 py-4 border-t border-border bg-card shrink-0">
          <p className="text-xs text-muted-foreground max-w-xs">
            Creates the certificate as Draft. Submit it for certification
            (QS → Client → Post) from the Payment Certificates table afterwards.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="h-10 px-4 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!projectId}
              title={!projectId ? "Select a project first" : undefined}
              className="h-10 px-5 text-sm text-primary-foreground bg-primary rounded-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Certificate
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};
