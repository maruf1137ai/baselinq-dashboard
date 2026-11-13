/**
 * A contractor's changed bank account: what changed, and the phone check that
 * decides whether it can be paid (plan rule 12; backend tasks/bank_details.py).
 *
 * A "change of bank details" request is the commonest way a construction
 * payment is stolen. So the check shows every changed field side by side —
 * holder, bank, branch code, account type, account number and SWIFT — and
 * never lets the masking make the old and new account look alike. And it has
 * the two outcomes the phone call can actually have: verified with a contact
 * the employer already knew, or not genuine, which keeps the payment held and
 * tells the employer's team and Baselinq support.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { postData } from "@/lib/Api";
import { formatDate } from "@/lib/dateUtils";

export interface MaskedAccount {
  bankName: string;
  branchCode: string;
  accountType: string;
  swiftCode: string;
  /** "•••• 5678" — more digits when the old and new numbers end alike. */
  account: string;
  /** How many digits the full number has. Absent on changes recorded before it was kept. */
  accountDigits?: number | null;
  /** The name the account is held in. Absent on changes recorded before it was kept. */
  accountHolder?: string;
}

export interface BankCheck {
  outcome: "verified" | "not_genuine";
  at: string | null;
  by: string | null;
  contactName: string | null;
  calledAt: string | null;
  note: string | null;
}

export interface BankChange {
  id: number;
  holder: string;
  changedAt: string;
  changedBy: string | null;
  fieldsChanged: string[];
  before: MaskedAccount;
  after: MaskedAccount;
  /** The phone check in force on this project, if one has been recorded. */
  check?: BankCheck | null;
  /** The server's answer: the employer side, or the PM / QS for them, never whoever changed it. */
  canVerify?: boolean;
}

const dash = (v?: string | null) => (v && v.trim() ? v : "None");

/** One masked account on a line: "FNB · branch 250655 · •••• 5678". */
export function describeAccount(a: MaskedAccount): string {
  return [a.bankName, a.branchCode && `branch ${a.branchCode}`, a.account].filter(Boolean).join(" · ") || "No account";
}

const accountNumber = (a: MaskedAccount) =>
  a.account ? `${a.account}${a.accountDigits ? ` (${a.accountDigits} digits)` : ""}` : "None";

/** The fields that decide where money goes, in the order a bank form lists them. */
const FIELDS: { key: string; label: string; value: (a: MaskedAccount) => string }[] = [
  { key: "account_holder", label: "Account holder", value: (a) => (a.accountHolder === undefined ? "Not recorded" : dash(a.accountHolder)) },
  { key: "bank_name", label: "Bank", value: (a) => dash(a.bankName) },
  { key: "branch_code", label: "Branch code", value: (a) => dash(a.branchCode) },
  { key: "account_type", label: "Account type", value: (a) => dash(a.accountType) },
  { key: "account_number", label: "Account number", value: accountNumber },
  { key: "swift_code", label: "SWIFT / BIC", value: (a) => dash(a.swiftCode) },
];

export interface BankChangeRow {
  key: string;
  label: string;
  was: string;
  now: string;
  changed: boolean;
}

/** Every field, Was and Now, with the changed ones marked. */
export function bankChangeRows(change: BankChange): BankChangeRow[] {
  const changed = new Set(change.fieldsChanged);
  return FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    was: f.value(change.before),
    now: f.value(change.after),
    changed: changed.has(f.key),
  }));
}

/**
 * True when the account number changed but the masked digits read the same.
 * The server shows more digits to prevent it, but a change recorded before
 * that, or two numbers differing only in their first digits, can still mask
 * alike — and the page must then say so rather than show two equal lines.
 */
export function accountLooksUnchanged(change: BankChange): boolean {
  return change.fieldsChanged.includes("account_number") && change.before.account === change.after.account;
}

export function BankChangeTable({ change }: { change: BankChange }) {
  const rows = bankChangeRows(change);
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="py-1 pr-3 font-normal" />
            <th scope="col" className="py-1 pr-3 font-normal">Was</th>
            <th scope="col" className="py-1 font-normal">Now</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.key} className={r.changed ? "bg-amber-50" : ""}>
              <th scope="row" className="py-1.5 pr-3 text-left align-top font-normal text-muted-foreground">
                {r.label}
                {r.changed && <span className="block text-xs font-medium text-amber-800">Changed</span>}
              </th>
              <td className="py-1.5 pr-3 align-top tabular-nums">{r.was}</td>
              <td className={`py-1.5 align-top tabular-nums ${r.changed ? "font-semibold text-foreground" : ""}`}>{r.now}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {accountLooksUnchanged(change) && (
        <p role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-900">
          <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            The account number changed, but the digits shown are the same. It is a different account. Ask them to
            read out the full new number and check every digit.
          </span>
        </p>
      )}
    </div>
  );
}

/** Now, as a datetime-local value in the viewer's own timezone. */
const nowLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function CheckRecord({ change }: { change: BankChange }) {
  const check = change.check;
  if (!check) return null;
  const who = check.by ?? "Someone on the employer's team";
  const when = check.calledAt ? formatDate(check.calledAt) : check.at ? formatDate(check.at) : "";
  if (check.outcome === "not_genuine") {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <p className="font-medium">Reported not genuine. Do not pay into the new account.</p>
        <p className="mt-1">
          {who} phoned {check.contactName ?? "the contractor"}
          {when ? ` on ${when}` : ""}
          {check.note ? `: “${check.note}”` : "."} Payments to {change.holder} stay held until they restore their
          details and the new account is verified. Baselinq support has been told.
        </p>
      </div>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Verified by {who}, who phoned {check.contactName ?? "the contractor"}
      {when ? ` on ${when}` : ""}.
    </p>
  );
}

/**
 * The phone check. Verified releases the hold on this project; not genuine
 * keeps it, and tells the employer's team and Baselinq support.
 */
export function BankChangeCheck({ change, onClose }: { change: BankChange; onClose: () => void }) {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const queryClient = useQueryClient();
  const [contact, setContact] = useState("");
  const [calledAt, setCalledAt] = useState(nowLocal());
  const [note, setNote] = useState("");
  const [knownNumber, setKnownNumber] = useState(false);
  const [busy, setBusy] = useState<"verify" | "report" | null>(null);

  const reported = change.check?.outcome === "not_genuine";
  const canAct = change.canVerify === true && !reported;
  const callKnown = contact.trim() !== "" && calledAt !== "" && calledAt <= nowLocal();
  const canVerify = canAct && callKnown && knownNumber;
  const canReport = canAct && callKnown && note.trim() !== "";

  const submit = async (outcome: "verify" | "report") => {
    setBusy(outcome);
    try {
      await postData({
        url: `projects/${projectId}/bank-detail-changes/${change.id}/${outcome}/`,
        data: { contactName: contact.trim(), calledAt: new Date(calledAt).toISOString(), note: note.trim() },
      });
      toast.success(
        outcome === "verify"
          ? `${change.holder}'s new account is verified. Their tax invoice is released.`
          : `Reported. Payments to ${change.holder} stay held, and your team and Baselinq support have been told.`,
      );
      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" &&
          (q.queryKey[0].startsWith("projects/") || q.queryKey[0].startsWith("payment-certificates")),
      });
      onClose();
    } catch (e: unknown) {
      const server = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(server || "That was not recorded. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reported ? `${change.holder}'s bank details: reported not genuine` : `Check ${change.holder}'s new bank details`}
          </DialogTitle>
          <DialogDescription>
            Changed {formatDate(change.changedAt)}
            {change.changedBy ? ` by ${change.changedBy}` : ""}. Changed bank details are the commonest way
            construction payments are stolen. Do not pay into the new account until it is verified.
          </DialogDescription>
        </DialogHeader>

        <BankChangeTable change={change} />
        <CheckRecord change={change} />

        {canAct ? (
          <div className="space-y-3">
            <p className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
              Phone {change.holder} on a number you already had for them. Never use a number, email or letter that
              came with the change: a fraudster sends those. Ask them to read out each changed detail above.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`bank-contact-${change.id}`}>Who you phoned</Label>
                <Input
                  id={`bank-contact-${change.id}`}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="J. Ndlovu, financial director"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`bank-called-${change.id}`}>When</Label>
                <Input
                  id={`bank-called-${change.id}`}
                  type="datetime-local"
                  value={calledAt}
                  max={nowLocal()}
                  onChange={(e) => setCalledAt(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`bank-note-${change.id}`}>What they told you</Label>
              <Textarea
                id={`bank-note-${change.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Read the full new number back; it matches. Or: they never changed their account."
              />
              <p className="text-xs text-muted-foreground">Needed to report a change as not genuine.</p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id={`bank-known-${change.id}`}
                checked={knownNumber}
                onCheckedChange={(v) => setKnownNumber(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor={`bank-known-${change.id}`} className="text-sm font-normal leading-snug">
                I phoned a number we already had for {change.holder}, not one given with this change, and they
                confirmed every changed detail.
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Not genuine keeps payments to {change.holder} held and tells your team and Baselinq support. It is
              recorded and cannot be undone here.
            </p>
          </div>
        ) : (
          !reported && (
            <p className="text-sm text-muted-foreground">
              The employer checks a changed account, or the PM or QS for them, and never the person who changed it.
            </p>
          )
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={!!busy}>
            {canAct ? "Not yet" : "Close"}
          </Button>
          {canAct && (
            <>
              <Button variant="destructive" onClick={() => submit("report")} disabled={!canReport || !!busy}>
                {busy === "report" ? "Reporting…" : "Not genuine — report fraud"}
              </Button>
              <Button onClick={() => submit("verify")} disabled={!canVerify || !!busy}>
                {busy === "verify" ? "Recording…" : "Verified by phone"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface PayeeAccount {
  holder: string;
  account: MaskedAccount;
  /**
   * verified: changed, then verified by phone · unchanged: no change recorded
   * on this project · unverified: changed, not yet verified · reported: the
   * change was reported not genuine · missing: no account on file.
   */
  status: "verified" | "unchanged" | "unverified" | "reported" | "missing";
  change?: BankChange;
  check?: BankCheck | null;
}

/**
 * Where the payment should have gone, shown where it is recorded: the moment
 * a diverted payment is otherwise discovered too late.
 */
export function PayeeAccounts({ accounts }: { accounts: PayeeAccount[] }) {
  if (accounts.length === 0) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
        No contractor on this project has a bank account in Baselinq. Confirm where to pay with them on a number you
        already hold.
      </p>
    );
  }
  return (
    <div className="space-y-2" aria-label="Contractor's bank account">
      {accounts.map((p) => {
        const changedOn = p.change ? formatDate(p.change.changedAt) : "";
        if (p.status === "reported" || p.status === "unverified") {
          return (
            <div key={p.holder} role="alert" className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">
                  {p.status === "reported"
                    ? `${p.holder}'s new bank details were reported NOT GENUINE. Do not pay into them.`
                    : `${p.holder}'s bank details changed on ${changedOn} and are not verified. Do not pay into the new account yet.`}
                </p>
                {p.change && (
                  <p className="text-xs tabular-nums">
                    Was {describeAccount(p.change.before)} · now {describeAccount(p.change.after)}
                  </p>
                )}
                <p className="text-xs">
                  {p.status === "reported"
                    ? "If money was paid into the new account, call your bank now to recall it, and tell Baselinq support."
                    : `The employer verifies it by phoning ${p.holder} on a number you already hold. If you have already paid into it, phone them now.`}
                </p>
              </div>
            </div>
          );
        }
        if (p.status === "missing") {
          return (
            <p key={p.holder} className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              No bank account is on file for {p.holder}. Confirm where to pay with them on a number you already hold.
            </p>
          );
        }
        return (
          <div key={p.holder} className="rounded-md border border-border bg-muted/40 p-2.5 text-sm">
            <p className="text-xs text-muted-foreground">Pay into {p.holder}&apos;s account</p>
            <p className="font-medium tabular-nums">{describeAccount(p.account)}</p>
            <p className="text-xs text-muted-foreground">
              {p.status === "verified"
                ? `Changed ${changedOn}; verified by phone${p.check?.by ? ` by ${p.check.by}` : ""}${
                    p.check?.calledAt ? ` on ${formatDate(p.check.calledAt)}` : ""
                  }.`
                : "No change to this account has been recorded on this project."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
