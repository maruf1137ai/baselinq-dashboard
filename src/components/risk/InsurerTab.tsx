/**
 * Insurer access — consent switch, API keys, and the disclosure log.
 *
 * The consent switch is presented as the primary control and defaults off.
 * Disclosing a project's dispute position to an insurer without the affected
 * parties' consent is a confidentiality and POPIA problem, and can prejudice
 * the insured's own position by amounting to a premature circumstance
 * notification — so the UI makes the state unambiguous and shows exactly what
 * has been released.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { usePatch } from "@/hooks/usePatch";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { KeyRound, ShieldAlert, Plus, Copy } from "lucide-react";

interface Token {
  id: number;
  insurer_name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface Disclosure {
  id: number;
  channel: string;
  insurer_name: string;
  released_by: string | null;
  consent_basis: string;
  payload_summary: Record<string, any>;
  created_at: string;
}

export default function InsurerTab({ projectId }: { projectId: string }) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [insurerName, setInsurerName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: policy, refetch: refetchPolicy } = useFetch<any>(
    `projects/${projectId}/risk-policy/`
  );
  const { data: tokenData, refetch: refetchTokens } = useFetch<{ tokens: Token[] }>(
    `projects/${projectId}/insurer-tokens/`
  );
  const { data: discData } = useFetch<{ disclosures: Disclosure[] }>(
    `projects/${projectId}/insurer-disclosures/`
  );

  const { mutateAsync: post } = usePost();
  const { mutateAsync: patch } = usePatch();

  const streamingOn = !!policy?.insurer_streaming_enabled;
  const tokens = tokenData?.tokens ?? [];
  const disclosures = discData?.disclosures ?? [];

  const toggleStreaming = async (next: boolean) => {
    try {
      await patch({
        url: `projects/${projectId}/risk-policy/`,
        data: { insurer_streaming_enabled: next },
      });
      toast.success(next ? "Insurer disclosure enabled" : "Insurer disclosure disabled");
      refetchPolicy();
    } catch {
      toast.error("Could not update consent setting");
    }
  };

  const issueKey = async () => {
    if (!insurerName.trim()) {
      toast.error("Enter the insurer or broker name");
      return;
    }
    try {
      const res: any = await post({
        url: `projects/${projectId}/insurer-tokens/`,
        data: { insurer_name: insurerName },
      });
      setNewKey(res.key);
      setInsurerName("");
      refetchTokens();
    } catch {
      toast.error("Could not issue key");
    }
  };

  return (
    <div className="space-y-6">
      {/* Consent — the primary control */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Insurer disclosure</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
              While this is off, no project data is exposed on any insurer endpoint —
              issued keys return nothing and shared evidence links stop working.
              Before enabling, confirm you have the necessary consent from the other
              contracting parties: disclosing a dispute position without it may breach
              confidentiality and POPIA, and a premature circumstance notification can
              prejudice your own position under the policy.
            </p>
          </div>
          <Switch checked={streamingOn} onCheckedChange={toggleStreaming} />
        </div>

        {!streamingOn && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Disclosure is off. Nothing is being shared.
            </span>
          </div>
        )}
      </div>

      {/* API keys — one card, rows divided inside it. Bordering each row
          inside a bordered card would double-line every edge. */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Insurer API keys</h3>
          <Button size="sm" variant="outline" onClick={() => setIssueOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Issue key
          </Button>
        </div>

        {tokens.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No keys issued"
            description="Issue a key to give an insurer or broker read access — it discloses nothing until disclosure is switched on above."
            variant="plain"
            size="sm"
          />
        ) : (
          <div className="divide-y divide-border">
            {tokens.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm text-foreground">{t.insurer_name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {t.key_prefix}… · {t.last_used_at ? `last used ${new Date(t.last_used_at).toLocaleDateString()}` : "never used"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {t.is_active ? "Active" : "Revoked"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclosure log — the customer's answer to "what have they seen?" */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Disclosure log</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Every release to an insurer, through any channel.
          </p>
        </div>
        {disclosures.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="Nothing has been disclosed"
            description="Releases to an insurer are recorded here as they happen."
            variant="plain"
            size="sm"
          />
        ) : (
          <div className="divide-y divide-border">
            {disclosures.slice(0, 10).map(d => (
              <div key={d.id} className="flex items-center justify-between gap-4 text-xs px-5 py-2.5">
                <span className="text-foreground">
                  {d.insurer_name || "Insurer"} · {d.channel}
                </span>
                <span className="text-muted-foreground">
                  {new Date(d.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue key dialog */}
      <Dialog open={issueOpen} onOpenChange={o => { setIssueOpen(o); if (!o) setNewKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newKey ? "Key issued" : "Issue insurer API key"}</DialogTitle>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Copy this key now — it is shown once and cannot be retrieved again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2.5 rounded-md break-all">{newKey}</code>
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  toast.success("Copied");
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A key on its own discloses nothing — insurer disclosure must also be
                switched on above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-foreground">Insurer or broker name</label>
                <Input
                  className="mt-1.5"
                  value={insurerName}
                  onChange={e => setInsurerName(e.target.value)}
                  placeholder="e.g. Santam, Marsh"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newKey ? (
              <Button onClick={() => { setIssueOpen(false); setNewKey(null); }}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
                <Button onClick={issueKey}>Issue key</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
