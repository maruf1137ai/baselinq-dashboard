import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { patchData } from "@/lib/Api";
import { type Invoice } from "@/lib/platformBilling";

/**
 * Superuser control: hold off the 30-day read-only lock until a date.
 * The server refuses anyone who is not a superuser.
 */
export function InvoiceGraceControl({ invoice }: { invoice: Invoice }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(invoice.graceUntil ?? "");
  const [saving, setSaving] = useState(false);

  if (invoice.status !== "issued") return null;

  const save = async (graceUntil: string | null) => {
    setSaving(true);
    try {
      await patchData({ url: `billing/admin/invoices/${invoice.id}/grace/`, data: { graceUntil } });
      toast.success(graceUntil ? `Lock held off until ${graceUntil}` : "Grace removed");
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Could not save the grace date");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Grace until</span>
      <Input
        type="date"
        className="h-8 w-[150px]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button size="sm" variant="outline" disabled={saving || !value} onClick={() => save(value)}>
        Save
      </Button>
      {invoice.graceUntil && (
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setValue(""); save(null); }}>
          Clear
        </Button>
      )}
    </div>
  );
}
