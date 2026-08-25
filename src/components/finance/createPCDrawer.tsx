import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import useFetch from "@/hooks/useFetch";
import { useMilestones } from "@/hooks/useMilestones";
import { useS3Upload } from "@/hooks/useS3Upload";
import { S3AttachmentSection } from "@/components/S3AttachmentSection";
import { registerS3TaskAttachment } from "@/lib/Api";
import { AlertTriangle, CalendarIcon, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatZAR } from "@/lib/formatCurrency";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import { clampToRemaining, sumCertifiedByVo } from "@/lib/pcHistory";
import {
  describePCSubmitError,
  extractPCIntegrityError,
  groupIntegrityIssues,
  type PCIntegrityError,
} from "@/lib/pcIntegrity";
import {
  loadTaskDraft,
  clearTaskDraft,
  useTaskDraftAutosave,
} from "@/lib/taskDrafts";

// ─── Types ───────────────────────────────────────────────────────────────────

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"] as const;

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
   * The drawer's SEED row (the first row when the form opens empty) is the
   * one exception: its `contractValue`/`previouslyCertified` are auto-filled
   * from the project's own figures — see `defaults` below — since that one
   * row represents the whole contract, not a sub-scope of it. Rows added
   * afterward via "+ Add Line Item" still start blank.
   *
   * VO lines DO carry a real history — they key on the VO number. See
   * `certifiedByVo`.
   */
  previouslyCertified: number;
  thisPeriod: number; // key editable field
  /**
   * True only for the seed row created when the drawer opens. Its Contract
   * Value is locked to the project's own original contract value — there is
   * only one real contract value for the project, so nothing should be able
   * to type over it here. Rows added afterward via "+ Add Line Item" are not
   * locked, since they may represent a sub-scope with its own budget (a
   * bill-of-quantities item).
   */
  locked?: boolean;
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

/**
 * Server-computed defaults for this project — see
 * `tasks/payment-certificates/defaults/`. `originalContractValue` /
 * `currentContractValue` are `project.total_budget` / `project.contract_value`
 * respectively; `previouslyCertified` counts only this project's
 * APPROVED/POSTED certificates, never drafts or pending ones — see
 * `pc_integrity.certified_to_date`.
 */
interface PCDefaults {
  originalContractValue: number;
  currentContractValue: number;
  previouslyCertified: number;
  retentionRatePct: number;
  vatRatePct: number;
  currency: string;
  /**
   * A PREVIEW of the number this certificate will get — pc_number is
   * globally unique across every project, and the backend re-generates and
   * retries under a row lock at actual creation time, so a concurrent create
   * elsewhere could still take this exact number first. Display only; never
   * sent back to the server.
   */
  nextPcNumber: string;
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
  // Programme Phase 3 — which milestones this claim is measured against, so
  // risk.gates.evaluate_pc_gate has something to cross-check work_items
  // against. Undefined when nothing was linked (leaves existing links, if
  // any, untouched on an update).
  milestoneLinks?: { milestoneId: string; claimedPct: number }[];
  // Retention/VAT/currency — default from the project's own settings but
  // overridable per certificate, since these can vary over a project's life.
  retentionApplies?: boolean;
  retentionRatePct?: number;
  vatRatePct?: number;
  currency?: string;
}

/** What `onSubmit` must resolve to — just enough to register attachments against it. */
export interface CreatedPC {
  id: string | number;
}

interface CreatePCDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  /**
   * Must resolve once the certificate exists and must reject when it does not.
   * The drawer awaits this: it stays open, with every line item intact, on a
   * rejection. It previously called this without awaiting and closed
   * regardless, so a certificate refused for over-certifying a variation
   * destroyed the user's work and told them nothing.
   */
  onSubmit?: (payload: CreatePCApiPayload) => Promise<CreatedPC>;
}

interface DraftShape {
  valuationPeriod?: string;
  certificateDate?: string;
  workItems?: WorkLineItem[];
  voOverrides?: Record<string, { included: boolean; thisPeriod: number }>;
  materialsOnSite?: number;
  penalties?: number;
  advanceRecovery?: number;
  retentionRelease?: number;
  notes?: string;
  claimedPctByMilestone?: Record<string, string>;
  retentionApplies?: boolean;
  retentionRatePctOverride?: number | null;
  vatRatePctOverride?: number | null;
  currencyOverride?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Money goes through formatZAR, the app's single currency formatter. These
// were `Intl.NumberFormat("en-US")`, which renders South African rands in US
// convention — "R 1,377,500.00" instead of "R 1 377 500,00" — so the drawer
// disagreed with every table it feeds.
//
// The `Math.abs` that used to sit here rendered a negative amount as a
// positive one, so a sign error on a certificate was invisible. formatZAR
// carries the sign itself.
const fmt = (v: number) => formatZAR(v);

const pct = (v: number) =>
  isNaN(v) || !isFinite(v) ? "0.0%" : `${Math.min(v, 999).toFixed(1)}%`;

const fmtCard = (v: number) => formatZAR(v);

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 className="text-sm font-medium text-foreground mb-3">{children}</h3>
);

/**
 * A money field that reads what the user typed.
 *
 * The previous implementation stripped every non-digit, so a decimal
 * separator and a minus sign were deleted rather than read: pasting
 * "1,250,000.00" out of a valuation stored 125 000 000, and "-5000" became
 * +5000. See `@/lib/money` for the parsing and the cases it covers.
 *
 * Two behaviours matter beyond parsing:
 *  • Unreadable text is not converted. The stored value is left alone and the
 *    field is marked, rather than a guess being written behind the user.
 *  • When the parent changes the value — the variation clamp does — the field
 *    re-renders it immediately, even while focused. It used to keep its own
 *    `raw` string, so the input read "250,000" while the summary below it read
 *    "R 0", and flipped to "0" on blur with no explanation.
 */
const CurrencyInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  invalid?: boolean;
}> = ({
  value,
  onChange,
  disabled = false,
  className = "",
  invalid = false,
  "aria-label": ariaLabel,
}) => {
    const [focused, setFocused] = React.useState(false);
    const [raw, setRaw] = React.useState(() => (value === 0 ? "" : formatMoneyInput(value)));
    const [unreadable, setUnreadable] = React.useState(false);

    // Follow the parent whenever it disagrees with what is on screen — a
    // clamped entry has to be visible the moment it happens.
    React.useEffect(() => {
      const shown = parseMoneyInput(raw);
      if (shown !== null && shown !== value) {
        setRaw(value === 0 ? "" : formatMoneyInput(value));
        setUnreadable(false);
      }
      // `raw` is deliberately not a dependency: this reacts to the parent, not
      // to typing.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleFocus = () => {
      setFocused(true);
      setRaw(value === 0 ? "" : formatMoneyInput(value));
      setUnreadable(false);
    };

    const handleBlur = () => {
      setFocused(false);
      // Settle on the stored value so what is shown is what will be submitted.
      setRaw(value === 0 ? "" : formatMoneyInput(value));
      setUnreadable(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setRaw(next);
      const parsed = parseMoneyInput(next);
      if (parsed === null) {
        setUnreadable(true);
        return; // keep the stored value; do not invent one
      }
      setUnreadable(false);
      onChange(parsed);
    };

    const showInvalid = invalid || unreadable;

    return (
      <div
        className={`flex items-center border rounded-md overflow-hidden bg-card focus-within:ring-1 ${showInvalid
          ? "border-red-300 focus-within:ring-red-400 focus-within:border-red-400"
          : "border-border focus-within:ring-primary focus-within:border-primary"
          } ${disabled ? "bg-muted/50" : ""} ${className}`}
      >
        <span className="px-2.5 py-1.5 text-sm text-muted-foreground bg-muted/50 border-r border-border select-none">
          R
        </span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          aria-invalid={showInvalid || undefined}
          value={focused ? raw : value === 0 ? "" : formatMoneyInput(value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          disabled={disabled}
          className="flex-1 px-2.5 py-1.5 text-sm text-foreground focus:outline-none bg-transparent disabled:bg-muted/50 disabled:text-muted-foreground w-full tabular-nums"
          placeholder="0,00"
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
  /** Renders "—" instead of a figure — used while a rate is still unknown. */
  pending?: boolean;
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
  pending,
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
      {pending
        ? "—"
        : deduction
          ? `- ${fmt(value)}`
          : addition
            ? `+ ${fmt(value)}`
            : fmt(value)}
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
  // Scoped per project so minimizing a draft on one project can't resurface
  // in another project's "New Certificate" drawer — see taskDrafts.ts.
  const draftType = `PC:${projectId ?? "none"}`;

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

  // Programme Phase 3 — which milestones this certificate's claim is
  // measured against. Keyed by milestone _id; a milestone with no entry is
  // not linked. Optional — omitting this section entirely still creates a
  // valid certificate, same as before this existed.
  const { data: milestones = [] } = useMilestones(isOpen ? projectId : null);
  const [claimedPctByMilestone, setClaimedPctByMilestone] = useState<Record<string, string>>({});

  const { data: voResponse, isLoading: isLoadingVOs } = useFetch<{ results: any[] }>(
    isOpen && projectId ? `tasks/tasks/?taskType=VO&project=${projectId}` : "",
    { enabled: !!(isOpen && projectId) }
  );

  // Original/current contract value, "previously certified" (certificate
  // memory), and the project's retention/VAT/currency — all computed
  // authoritatively server-side. See `tasks/payment-certificates/defaults/`
  // and `pc_integrity.certified_to_date`. Nothing here reimplements "which
  // certificates count as previous" — that lives in one place.
  const { data: defaults, isLoading: isLoadingDefaults } = useFetch<PCDefaults>(
    isOpen && projectId ? `tasks/payment-certificates/defaults/?projectId=${projectId}` : "",
    { enabled: !!(isOpen && projectId) }
  );
  const defaultsReady = !isLoadingDefaults && defaults != null;
  // A preview only — see PCDefaults.nextPcNumber. Falls back to a loading
  // dash while `defaults` is still in flight.
  const pcNumber = defaults?.nextPcNumber ?? "—";

  // Retention/VAT/currency default from the project's own settings, but are
  // overridable per certificate — retention and VAT can vary over a
  // project's life. `null` means "use the server default"; a number/string
  // means the operator has touched the field.
  const [retentionApplies, setRetentionApplies] = useState(true);
  const [retentionRatePctOverride, setRetentionRatePctOverride] = useState<number | null>(null);
  const [vatRatePctOverride, setVatRatePctOverride] = useState<number | null>(null);
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);

  const retentionRatePct = retentionRatePctOverride ?? defaults?.retentionRatePct ?? 0;
  const vatRatePct = vatRatePctOverride ?? defaults?.vatRatePct ?? 0;
  const currency = currencyOverride ?? defaults?.currency ?? "ZAR";
  const ratesReady = defaultsReady;

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
   *
   * It then summed *every* prior certificate regardless of status, so a draft
   * that was never issued, or one that was rejected, ate the remainder and the
   * clamp below forced the entry to zero. `sumCertifiedByVo` counts only the
   * certificates that took effect — see `@/lib/pcHistory`.
   */
  const { data: priorPCResponse } = useFetch<{ results: any[] }>(
    isOpen && projectId ? `tasks/payment-certificates/?projectId=${projectId}` : "",
    { enabled: !!(isOpen && projectId) }
  );
  const certifiedByVo = useMemo<Record<string, number>>(
    () => sumCertifiedByVo(priorPCResponse?.results),
    [priorPCResponse]
  );

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

  /**
   * Seed the Work Completed table with one row, once, whenever it is empty
   * and the project's own figures have arrived.
   *
   * Contract Value and Prev. Certified used to start at 0 and wait for
   * manual entry, which also meant % Complete showed 0% on every certificate
   * until someone typed the full contract sum in by hand. This row's Contract
   * Value comes from the project's original contract value and its Prev.
   * Certified from the sum of this project's approved certificates — both
   * from `defaults` above — so the table is meaningful the moment it opens.
   *
   * Only fires while `workItems` is empty, so a restored draft or a manually
   * edited table is never clobbered.
   */
  useEffect(() => {
    if (!isOpen || !defaultsReady || !defaults) return;
    setWorkItems((items) =>
      items.length > 0
        ? items
        : [{
          id: "1",
          description: "",
          contractValue: defaults.originalContractValue,
          previouslyCertified: defaults.previouslyCertified,
          thisPeriod: 0,
          locked: true,
        }]
    );
  }, [isOpen, defaultsReady, defaults]);

  // Materials on Site
  const [materialsOnSite, setMaterialsOnSite] = useState(0);

  // Adjustments
  const [penalties, setPenalties] = useState(0);
  const [advanceRecovery, setAdvanceRecovery] = useState(0);

  // Retention Release (editable)
  const [retentionRelease, setRetentionRelease] = useState(0);

  const [notes, setNotes] = useState("");

  // The formal certificate PDF/invoice (JBCC/NEC) and any other supporting
  // files. Uploads start immediately on selection so they survive the drawer
  // being minimized before submit; registered against the certificate once it
  // exists — see `registerAttachments`.
  const s3Upload = useS3Upload("task-attachments/pending");

  // Per-variation feedback when an entry was held back to the remainder.
  const [voNotes, setVoNotes] = useState<Record<string, string>>({});

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [integrity, setIntegrity] = useState<PCIntegrityError | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    // Zero, not a placeholder rate, while the project's real rates are still
    // in flight, or while the operator has switched retention off entirely.
    const retention =
      netValuationThisPeriod * ((ratesReady && retentionApplies ? retentionRatePct : 0) / 100);
    const subtotal = netValuationThisPeriod - retention + retentionRelease;
    const vat = subtotal * ((ratesReady ? vatRatePct : 0) / 100);
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
    retentionApplies,
    ratesReady,
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

  // Clamped to what is actually left on the variation.
  //
  // `remainingValue` was computed and displayed but never enforced, so nothing
  // stopped the same variation being certified in full on two certificates —
  // the employer paying twice for the same work. The server now refuses that
  // outright (tasks/pc_integrity.py); this clamp exists so the operator is
  // stopped at the input rather than at a save that fails, and so the two
  // never disagree about what is allowed.
  //
  // It used to do that silently. A typed figure was replaced by a smaller one —
  // or by zero — with no feedback of any kind. `clampToRemaining` returns the
  // reason, which is shown against the row.
  //
  // Negative entries pass through: correcting an earlier certificate is
  // legitimate, and the server treats it as a warning rather than an error.
  // With the input layer now reading a minus sign, that is finally true.
  const updateVOThisPeriod = (voNumber: string, value: number) => {
    const row = voItems.find((v) => v.voNumber === voNumber);
    const { value: next, note } = clampToRemaining(
      voNumber,
      value,
      row?.remainingValue
    );
    setVoItems((items) =>
      items.map((v) => (v.voNumber === voNumber ? { ...v, thisPeriod: next } : v))
    );
    setVoNotes((prev) => {
      if (!note) {
        if (!prev[voNumber]) return prev;
        const { [voNumber]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [voNumber]: note };
    });
  };

  // ─── Attachments ────────────────────────────────────────────────────────────

  const registerAttachments = async (pcId: string | number) => {
    if (!s3Upload.entries.length) return;
    const ids = s3Upload.entries.map((e) => e.id);
    const s3Keys = await s3Upload.waitForAll(ids);
    await Promise.all(
      s3Upload.entries.map(async (entry) => {
        const key = s3Keys.get(entry.id);
        if (!key) return; // upload itself already surfaced its own error
        try {
          await registerS3TaskAttachment("payment-certificates", pcId, {
            file_name: entry.file.name,
            s3_key: key,
          });
        } catch {
          // Certificate is already created; a failed attachment registration
          // must not look like the certificate itself failed.
        }
      })
    );
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────

  /**
   * Awaits the create and only closes once the certificate exists.
   *
   * The previous version fired `onSubmit` without awaiting it and then called
   * `onClose()` unconditionally, while the parent caught the failure into a
   * `console.error`. So a certificate refused for over-certifying a variation
   * closed the drawer, changed nothing in the table, discarded every line item
   * and showed the user no message at all. The server's own explanation —
   * which names the variation and states the arithmetic — was in the response
   * body the whole time.
   */
  const handleSubmit = async () => {
    if (!projectId || isSubmitting || !ratesReady) {
      return;
    }
    const milestoneLinks = Object.entries(claimedPctByMilestone)
      .filter(([, p]) => p !== "" && !isNaN(Number(p)))
      .map(([milestoneId, p]) => ({ milestoneId, claimedPct: Number(p) }));

    const payload: CreatePCApiPayload = {
      projectId: Number(projectId),
      valuationPeriod: valuationPeriod ? format(valuationPeriod, "yyyy-MM") : "",
      certificateDate: certificateDate ? format(certificateDate, "yyyy-MM-dd") : "",
      workItems,
      voItems,
      milestoneLinks: milestoneLinks.length > 0 ? milestoneLinks : undefined,
      materialsOnSite,
      penalties,
      advanceRecovery,
      retentionRelease,
      notes,
      // Sent for display continuity only. The server recomputes every one of
      // these from the components above plus the project's own retention and
      // VAT rates (or this certificate's overrides, below), and ignores what
      // arrives here — see PaymentCertificateSerializer.validate().
      claim: calc.netValuationThisPeriod,
      retention: calc.retention,
      net: calc.amountDue,
      approvalStatus: "pending",
      // Overridable per certificate — see the Retention/VAT/Currency section.
      retentionApplies,
      retentionRatePct,
      vatRatePct,
      currency,
    };

    setIsSubmitting(true);
    setIntegrity(null);
    setSubmitError(null);
    try {
      const created = await onSubmit?.(payload);
      if (created?.id) await registerAttachments(created.id);
      clearTaskDraft(draftType);
      onClose();
    } catch (err) {
      // Stay open. Every line item, note and VO amount is still on screen.
      const found = extractPCIntegrityError(err);
      if (found) setIntegrity(found);
      else setSubmitError(describePCSubmitError(err));
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Explicit Cancel — the only action that discards the draft, and only after confirming. */
  const handleCancel = () => {
    if (isSubmitting) return;
    const hasContent =
      workItems.some((w) => w.description.trim() !== "" || w.thisPeriod !== 0) ||
      voItems.some((v) => v.included) ||
      materialsOnSite !== 0 ||
      penalties !== 0 ||
      advanceRecovery !== 0 ||
      notes.trim() !== "" ||
      s3Upload.entries.length > 0;
    if (hasContent && !window.confirm("Discard this certificate draft?")) {
      return;
    }
    clearTaskDraft(draftType);
    onClose();
  };

  // ─── Draft persistence ──────────────────────────────────────────────────────
  //
  // Closing the drawer via the overlay, Escape or the header (×) no longer
  // discards what was typed — those now behave like "minimize": the draft is
  // kept and restored the next time the drawer opens. Only the footer Cancel
  // button (above) clears it, and only after confirming.
  useTaskDraftAutosave(draftType, isOpen, {
    valuationPeriod: valuationPeriod?.toISOString(),
    certificateDate: certificateDate?.toISOString(),
    workItems,
    voOverrides: Object.fromEntries(
      voItems.map((v) => [v.voNumber, { included: v.included, thisPeriod: v.thisPeriod }])
    ),
    materialsOnSite,
    penalties,
    advanceRecovery,
    retentionRelease,
    notes,
    claimedPctByMilestone,
    retentionApplies,
    retentionRatePctOverride,
    vatRatePctOverride,
    currencyOverride,
  } satisfies DraftShape);

  // ─── Open / close lifecycle ─────────────────────────────────────────────────

  /**
   * The drawer used to stay mounted at all times, hidden only by
   * `translate-x-full`. Every input inside it was therefore in the tab order
   * while closed, and `aria-modal="true"` was never removed, so the whole page
   * was announced as behind a modal that was not on screen. It is now mounted
   * only while open (or sliding out), which also gives the reset below
   * something to hang off.
   */
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // A frame at translate-x-full before sliding in, or it appears instantly.
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), 300); // matches duration-300
    return () => clearTimeout(timer);
  }, [isOpen]);

  /**
   * Everything the form holds, restored from a saved draft on open (or reset
   * to fresh defaults when there is none).
   */
  const applyDraft = useCallback((draft: DraftShape | null) => {
    setValuationPeriod(
      draft?.valuationPeriod
        ? new Date(draft.valuationPeriod)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );
    setCertificateDate(draft?.certificateDate ? new Date(draft.certificateDate) : new Date());
    setWorkItems(draft?.workItems ?? []);
    setMaterialsOnSite(draft?.materialsOnSite ?? 0);
    setPenalties(draft?.penalties ?? 0);
    setAdvanceRecovery(draft?.advanceRecovery ?? 0);
    setRetentionRelease(draft?.retentionRelease ?? 0);
    setNotes(draft?.notes ?? "");
    setVoNotes({});
    setClaimedPctByMilestone(draft?.claimedPctByMilestone ?? {});
    setRetentionApplies(draft?.retentionApplies ?? true);
    setRetentionRatePctOverride(draft?.retentionRatePctOverride ?? null);
    setVatRatePctOverride(draft?.vatRatePctOverride ?? null);
    setCurrencyOverride(draft?.currencyOverride ?? null);
    setIntegrity(null);
    setSubmitError(null);
    setIsSubmitting(false);
    // Fresh copies of the VO register, with the draft's inclusion/amount
    // overrides reapplied — approvedVOs itself isn't in scope here yet on the
    // very first render, so this only restores what the draft actually saved;
    // the resync effect below reconciles it against the live register anyway.
    if (draft?.voOverrides) {
      setVoItems((prev) =>
        prev.map((v) => {
          const override = draft.voOverrides?.[v.voNumber];
          return override ? { ...v, ...override } : v;
        })
      );
    }
  }, []);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      wasOpen.current = true;
      applyDraft(loadTaskDraft(draftType));
    } else if (!isOpen) {
      wasOpen.current = false;
    }
  }, [isOpen, applyDraft]);

  // Escape, a focus trap and focus restore — none of which existed.
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // `mounted` is in the deps because the panel is not in the DOM on the
    // render that opens it — without this the initial focus lands nowhere.
    if (!isOpen || !mounted) return;
    if (!panelRef.current?.contains(document.activeElement)) {
      restoreFocusTo.current = document.activeElement as HTMLElement | null;
    }
    panelRef.current?.focus();
    return () => {
      restoreFocusTo.current?.focus?.();
    };
  }, [isOpen, mounted]);

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // Deliberately does nothing — matches CreateRequestDialog's
      // `onEscapeKeyDown={(e) => e.preventDefault()}`. Only the header
      // Minimize/Close buttons and the footer Cancel button may exit.
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
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

  // Issues the server raised against a specific variation, keyed by VO number,
  // so the message sits beside the field the operator has to change.
  const grouped = useMemo(
    () => groupIntegrityIssues(integrity?.issues ?? [], voItems.map((v) => v.voNumber)),
    [integrity, voItems]
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  if (!mounted) return null;

  return (
    <>
      {/* Overlay — deliberately inert. An accidental click beside the panel
          must not lose or discard anything; the only exits are the header
          Minimize/Close buttons and the footer Cancel button below. Matches
          CreateRequestDialog's `onInteractOutside={(e) => e.preventDefault()}`. */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={`fixed top-0 right-0 h-full w-full max-w-5xl bg-card shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out focus:outline-none ${shown ? "translate-x-0" : "translate-x-full"
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              title="Minimize — keep your progress"
              className="rounded-lg p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Minimize — keep your progress</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              title="Close — discard your progress"
              className="rounded-lg p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close — discard your progress</span>
            </button>
          </div>
        </header>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* ── The server's verdict on the last attempt ────────────────────── */}
            {(integrity || submitError) && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-medium text-red-700">
                      {integrity
                        ? "The certificate was refused — nothing was saved"
                        : "The certificate could not be created"}
                    </p>
                    {integrity?.messages.map((m, i) => (
                      <p key={`msg-${i}`} className="text-sm text-red-700">
                        {m}
                      </p>
                    ))}
                    {grouped.general.map((d, i) => (
                      <p key={`gen-${i}`} className="text-sm text-red-700">
                        {d}
                      </p>
                    ))}
                    {submitError && (
                      <p className="text-sm text-red-700">{submitError}</p>
                    )}
                    <p className="text-xs text-red-700/80">
                      Your line items are still here. Correct the amounts below and
                      create it again.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                            <p className="text-sm text-foreground">
                              {defaultsReady ? "No work items yet" : "Loading this project's contract value…"}
                            </p>
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
                              aria-label="Work item description"
                            />
                          </td>
                          <td className="px-3 py-2 w-36">
                            {item.locked ? (
                              <span
                                title="Locked to this project's original contract value"
                                className="block text-right text-sm text-muted-foreground whitespace-nowrap tabular-nums px-2.5 py-1.5"
                              >
                                {fmt(item.contractValue)}
                              </span>
                            ) : (
                              <CurrencyInput
                                aria-label="Contract value"
                                value={item.contractValue}
                                onChange={(v) =>
                                  updateWorkItem(item.id, "contractValue", v)
                                }
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-muted-foreground whitespace-nowrap tabular-nums">
                            {fmt(item.previouslyCertified)}
                          </td>
                          <td className="px-3 py-2 w-36">
                            <CurrencyInput
                              aria-label="Amount certified this period"
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

            {/* ── 2b. Link to Programme Phases ─────────────────────────────────────
                Programme Phase 3 — optional. Turns on risk.gates.evaluate_pc_gate's
                claimed-vs-measured-progress cross-check for this certificate. A
                certificate with no links here still saves fine; the gate just has
                nothing to compare against, same as before this section existed. */}
            {milestones.length > 0 && (
              <section>
                <SectionHeader>Link to Programme Phases</SectionHeader>
                <p className="text-xs text-muted-foreground -mt-2 mb-3">
                  Select the phases this claim is measured against, and the percentage of each claimed complete.
                </p>
                <div className="rounded-lg border border-border divide-y divide-border">
                  {milestones.map((m) => {
                    const checked = m._id in claimedPctByMilestone;
                    return (
                      <div key={m._id} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            setClaimedPctByMilestone((prev) => {
                              const next = { ...prev };
                              if (value) {
                                next[m._id] = m.percentComplete != null ? String(m.percentComplete) : "";
                              } else {
                                delete next[m._id];
                              }
                              return next;
                            });
                          }}
                        />
                        <span className="flex-1 text-sm text-foreground">{m.name}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={!checked}
                            className="w-16 text-sm text-right bg-transparent border-b border-transparent focus:border-primary focus:outline-none disabled:text-muted-foreground py-0.5"
                            placeholder="0"
                            aria-label={`Claimed percent complete for ${m.name}`}
                            value={claimedPctByMilestone[m._id] ?? ""}
                            onChange={(e) =>
                              setClaimedPctByMilestone((prev) => ({ ...prev, [m._id]: e.target.value }))
                            }
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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
                    {voItems.map((vo) => {
                      const clampNote = voNotes[vo.voNumber];
                      const voIssues = grouped.byVo[vo.voNumber] ?? [];
                      return (
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
                              aria-label={`Include ${vo.voNumber} in this certificate`}
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
                            <div className="flex flex-col items-end gap-1">
                              {vo.included ? (
                                <CurrencyInput
                                  aria-label={`Amount certified this period for ${vo.voNumber}`}
                                  value={vo.thisPeriod}
                                  invalid={voIssues.length > 0}
                                  onChange={(v) =>
                                    updateVOThisPeriod(vo.voNumber, v)
                                  }
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground pr-2">
                                  —
                                </span>
                              )}
                              {vo.included && (
                                <span className="text-xs text-muted-foreground text-right">
                                  {fmt(vo.remainingValue ?? 0)} remaining
                                </span>
                              )}
                              {clampNote && (
                                <span className="text-xs text-amber-700 text-right">
                                  {clampNote}
                                </span>
                              )}
                              {voIssues.map((detail, i) => (
                                <span
                                  key={i}
                                  className="text-xs text-red-600 text-right"
                                >
                                  {detail}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                  aria-label="Unfixed materials delivered but not yet incorporated"
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
                      aria-label="Contractual penalties / deductions"
                      value={penalties}
                      onChange={setPenalties}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      Advance Payment Recovery
                    </label>
                    <CurrencyInput
                      aria-label="Advance payment recovery"
                      value={advanceRecovery}
                      onChange={setAdvanceRecovery}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* ── 6. Retention, VAT & Currency ─────────────────────────────────── */}
            <section>
              <SectionHeader>Retention, VAT &amp; Currency</SectionHeader>
              <p className="text-xs text-muted-foreground -mt-2 mb-3">
                Default from this project's settings, but can be adjusted for
                this certificate specifically — retention and VAT can vary
                over a project's life.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <Checkbox
                      checked={retentionApplies}
                      onCheckedChange={(v) => setRetentionApplies(v === true)}
                      aria-label="Retention applies to this certificate"
                    />
                    Retention applies
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      disabled={!retentionApplies || !ratesReady}
                      aria-label="Retention rate percent"
                      className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted/50 disabled:text-muted-foreground"
                      value={ratesReady ? retentionRatePct : ""}
                      placeholder={ratesReady ? undefined : "—"}
                      onChange={(e) =>
                        setRetentionRatePctOverride(e.target.value === "" ? 0 : Number(e.target.value))
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    VAT rate
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      disabled={!ratesReady}
                      aria-label="VAT rate percent"
                      className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted/50 disabled:text-muted-foreground"
                      value={ratesReady ? vatRatePct : ""}
                      placeholder={ratesReady ? undefined : "—"}
                      onChange={(e) =>
                        setVatRatePctOverride(e.target.value === "" ? 0 : Number(e.target.value))
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    disabled={!ratesReady}
                    onChange={(e) => setCurrencyOverride(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-foreground border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted/50 disabled:text-muted-foreground bg-card"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* ── 7. Attachments ───────────────────────────────────────────────── */}
            <section>
              <SectionHeader>Attachments</SectionHeader>
              <p className="text-xs text-muted-foreground -mt-2 mb-3">
                Attach the formal certificate (JBCC / NEC) issued outside the
                system, or any supporting invoice — for the historical record.
              </p>
              <S3AttachmentSection
                s3Upload={s3Upload}
                inputId="pc-attachments"
                label="Formal certificate / invoice"
              />
            </section>

            {/* ── 8. Financial Summary ─────────────────────────────────────────── */}
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
                      {ratesReady
                        ? retentionApplies
                          ? `Less: Retention @ ${retentionRatePct}%`
                          : "Less: Retention (not applied)"
                        : "Less: Retention"}
                    </span>
                    <span className="text-sm text-red-500">
                      {ratesReady ? `- ${fmt(calc.retention)}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">
                      Plus: Retention Release
                    </span>
                    <div className="w-36">
                      <CurrencyInput
                        aria-label="Retention release"
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
                    pending={!ratesReady}
                  />
                  <SummaryLine
                    label={ratesReady ? `Plus: VAT @ ${vatRatePct}%` : "Plus: VAT"}
                    value={calc.vat}
                    indent
                    addition
                    pending={!ratesReady}
                  />
                </div>

                {/* Amount Due — Net column */}
                <div className="border-t-2 border-foreground mt-3 pt-4 flex justify-between items-center">
                  <span className="text-sm text-foreground">
                    Amount Due to Contractor
                  </span>
                  <span className="text-sm text-primary">
                    {ratesReady ? fmt(calc.amountDue) : "—"}
                  </span>
                </div>

                {!ratesReady && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Reading this project's contract value, certificate history,
                    and retention/VAT rates. These stay blank until they
                    arrive — they are not assumed.
                  </p>
                )}
              </div>

              {/* Quick reference — 3 inline cards */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="flex justify-between items-center border border-border rounded-lg px-4 py-3">
                  <span className="text-xs text-muted-foreground">Claim</span>
                  <span className="text-sm text-foreground tabular-nums">{fmtCard(calc.netValuationThisPeriod)}</span>
                </div>
                <div className="flex justify-between items-center border border-border rounded-lg px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {ratesReady ? `Retention @ ${retentionRatePct}%` : "Retention"}
                  </span>
                  <span className="text-sm text-foreground tabular-nums">
                    {ratesReady ? fmtCard(calc.retention) : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center border border-border rounded-lg px-4 py-3 bg-primary/10">
                  <span className="text-xs text-muted-foreground">Net (Amount Due)</span>
                  <span className="text-sm text-primary tabular-nums">
                    {ratesReady ? fmtCard(calc.amountDue) : "—"}
                  </span>
                </div>
              </div>
            </section>

            {/* ── 9. Notes ──────────────────────────────────────────── */}
            <section>
              <SectionHeader>Notes</SectionHeader>
              <div>
                <label
                  htmlFor="create-pc-notes"
                  className="block text-xs text-muted-foreground mb-1.5"
                >
                  QS Notes
                </label>
                <textarea
                  id="create-pc-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm text-foreground border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none placeholder:text-muted-foreground"
                  placeholder="Add valuation methodology, site notes, or special instructions…"
                />
              </div>
            </section>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <footer className="flex items-center justify-between px-6 py-4 border-t border-border bg-card shrink-0">
          <p className="text-xs text-muted-foreground max-w-xs">
            Creates the certificate as Draft. Submit it for certification
            from the Payment Certificates table afterwards.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="h-10 px-4 text-sm text-muted-foreground border border-border rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {/* Held until the project's real rates are known, and while a
                create is in flight — the button used to check only `projectId`,
                so a double-click posted the certificate twice. */}
            <button
              onClick={handleSubmit}
              disabled={!projectId || !ratesReady || isSubmitting}
              title={
                !projectId
                  ? "Select a project first"
                  : !ratesReady
                    ? "Waiting for this project's contract value and rates"
                    : undefined
              }
              className="h-10 px-5 text-sm text-primary-foreground bg-primary rounded-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </span>
              ) : (
                "Create Certificate"
              )}
            </button>
          </div>
        </footer>
      </div>
    </>
  );
};
