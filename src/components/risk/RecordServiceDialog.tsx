/**
 * Record how and when a notice was served.
 *
 * This replaces a one-click "Mark served" that posted `{}` — no date of
 * service, no method, no recipient, no evidence, no confirmation. A served
 * notice with no service date cannot answer whether it was in time, and a
 * notice recorded late read the same as one served late.
 *
 * The person states the facts. Whether that was on time is computed by the
 * server, on the deadline's own working-day calendar, and shown on the card
 * afterwards; nothing here counts days.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";
import { FileText, X } from "lucide-react";
import { formatDay, serverMessage, todayIso, type TimeBar } from "@/lib/timeBarEvents";

const SERVICE_METHODS: { value: string; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "hand", label: "Hand delivery" },
  { value: "registered_post", label: "Registered post" },
  { value: "platform", label: "Via the platform" },
];

interface DocumentOption {
  _id: string;
  name: string;
  reference: string;
}

interface Props {
  bar: TimeBar | null;
  projectId: string;
  /** Who notices go to under the project's contract form, e.g. "Principal agent". */
  defaultRecipient: string | null;
  onClose: () => void;
  onRecorded: () => void;
}

export default function RecordServiceDialog({ bar, projectId, defaultRecipient, onClose, onRecorded }: Props) {
  const today = todayIso();
  const [servedOn, setServedOn] = useState(today);
  const [method, setMethod] = useState("");
  const [servedTo, setServedTo] = useState(defaultRecipient ?? "");
  const [reference, setReference] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [doc, setDoc] = useState<DocumentOption | null>(null);
  const [saving, setSaving] = useState(false);
  const { mutateAsync: post } = usePost();

  // Every opening starts from the defaults: today, no method chosen, the
  // contract's recipient. A method is never pre-chosen — it is a fact.
  useEffect(() => {
    if (!bar) return;
    setServedOn(todayIso());
    setMethod("");
    setServedTo(defaultRecipient ?? "");
    setReference("");
    setDocSearch("");
    setDoc(null);
  }, [bar, defaultRecipient]);

  const docsUrl = `documents/?project_id=${encodeURIComponent(projectId)}${
    docSearch.trim() ? `&search=${encodeURIComponent(docSearch.trim())}` : ""
  }`;
  const docs = useFetch<{ results?: DocumentOption[] }>(docsUrl, { enabled: Boolean(bar) && !doc });
  const docOptions = useMemo(
    () => (Array.isArray(docs.data?.results) ? docs.data!.results!.slice(0, 6) : []),
    [docs.data],
  );

  const dateProblem = !servedOn
    ? "Enter the date the notice was served."
    : servedOn > today
      ? "The date served cannot be in the future."
      : bar && servedOn < bar.awareness_date
        ? `That is before the date of awareness (${formatDay(bar.awareness_date)}).`
        : null;
  const ready = !dateProblem && Boolean(method) && Boolean(servedTo.trim()) && !saving;

  const submit = async () => {
    if (!bar || !ready) return;
    setSaving(true);
    try {
      await post({
        url: `time-bars/${bar.id}/serve/`,
        data: {
          served_on: servedOn,
          method,
          served_to: servedTo.trim(),
          reference: reference.trim(),
          ...(doc ? { document_id: Number(doc._id) } : {}),
        },
      });
      toast.success(`Service recorded: served on ${formatDay(servedOn)}`);
      onRecorded();
      onClose();
    } catch (e) {
      toast.error(serverMessage(e, "The service could not be recorded."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={bar !== null} onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent aria-describedby="record-service-description">
        <DialogHeader>
          <DialogTitle>Record service</DialogTitle>
          <DialogDescription id="record-service-description">
            {bar ? `${bar.label}, due ${formatDay(bar.deadline_date)}. ` : ""}
            Record when, how and on whom the notice was served. Baselinq works out whether
            that was in time from the deadline; it does not serve the notice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="service-date">Date served</Label>
            <Input
              id="service-date"
              type="date"
              className="mt-1.5"
              max={today}
              min={bar?.awareness_date}
              value={servedOn}
              onChange={(e) => setServedOn(e.target.value)}
              aria-invalid={dateProblem ? true : undefined}
              aria-describedby={dateProblem ? "service-date-problem" : undefined}
            />
            {dateProblem && (
              <p id="service-date-problem" className="text-xs text-red-700 mt-1.5">{dateProblem}</p>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">How it was served</legend>
            <RadioGroup value={method} onValueChange={setMethod} className="mt-2 grid grid-cols-2 gap-2">
              {SERVICE_METHODS.map((m) => (
                <div key={m.value} className="flex items-center gap-2">
                  <RadioGroupItem value={m.value} id={`service-method-${m.value}`} />
                  <Label htmlFor={`service-method-${m.value}`} className="font-normal">{m.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>

          <div>
            <Label htmlFor="service-recipient">Served on</Label>
            <Input
              id="service-recipient"
              className="mt-1.5"
              value={servedTo}
              onChange={(e) => setServedTo(e.target.value)}
              placeholder="Principal agent"
            />
          </div>

          <div>
            <Label htmlFor="service-reference">Reference or note (optional)</Label>
            <Textarea
              id="service-reference"
              className="mt-1.5"
              rows={2}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Letter reference, email subject, who signed for it"
            />
          </div>

          <div>
            <Label htmlFor="service-document">The notice served (optional)</Label>
            {doc ? (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.reference} · {doc.name}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setDoc(null)} aria-label="Remove linked document">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="service-document"
                  className="mt-1.5"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Search the project's documents"
                />
                {docs.isError ? (
                  <p className="text-xs text-muted-foreground mt-1.5">The project's documents could not be loaded.</p>
                ) : docOptions.length > 0 ? (
                  <ul className="mt-1.5 rounded-md border border-border divide-y divide-border" aria-label="Matching documents">
                    {docOptions.map((d) => (
                      <li key={d._id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                          onClick={() => setDoc(d)}
                        >
                          {d.reference} · {d.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!ready}>
            {saving ? "Recording…" : "Record service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
