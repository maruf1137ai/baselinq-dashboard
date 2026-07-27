/**
 * Evidence packs — sealed, hash-verifiable bundles of the records supporting
 * a claim.
 *
 * The integrity indicator is the important element on this screen. It is
 * recomputed server-side on every read, so "Verified" means the hashes still
 * match the captured snapshots — not merely that we say the pack is fine.
 * A third party can recompute the same hashes themselves, which is what makes
 * the pack worth anything in a dispute.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useFetch from "@/hooks/useFetch";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { FileArchive, ShieldCheck, ShieldX, Copy, Plus } from "lucide-react";

interface Pack {
  id: number;
  title: string;
  summary: string;
  item_count: number;
  manifest_hash: string;
  sealed_at: string | null;
  is_sealed: boolean;
  integrity_verified: boolean;
  access_token: string;
  created_at: string;
}

/**
 * Pull the non-zero record types out of the backend's summary sentence.
 * The backend reports every category including empty ones (useful for the
 * audit record); the UI shows only what is actually in the pack.
 */
function parseCounts(summary: string): string[] {
  if (!summary) return [];
  const tail = summary.split(":")[1];
  if (!tail) return [];
  return tail
    .split(",")
    .map(s => s.trim().replace(/\.$/, ""))
    .filter(s => s && !s.startsWith("0 "));
}

function formatSealed(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function EvidenceTab({ projectId }: { projectId: string }) {
  const [compiling, setCompiling] = useState(false);
  const { data, refetch } = useFetch<{ packs: Pack[] }>(
    `projects/${projectId}/evidence-packs/`
  );
  const { mutateAsync: post } = usePost();

  const packs = data?.packs ?? [];

  const compile = async () => {
    setCompiling(true);
    try {
      await post({ url: `projects/${projectId}/evidence-packs/`, data: {} });
      toast.success("Evidence pack compiled and sealed");
      refetch();
    } catch {
      toast.error("Could not compile the pack");
    } finally {
      setCompiling(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/api/insurer/v1/evidence-packs/${token}/`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied — recipient still needs an insurer token and project consent");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          A sealed snapshot of the variation orders, payment certificates, milestones,
          risk signals and notice deadlines as they stood at the moment of capture.
          Each item is hashed and the pack carries a SHA-256 manifest, so any later
          alteration is detectable by anyone who checks.
        </p>
        <Button size="sm" className="shrink-0" onClick={compile} disabled={compiling}>
          <Plus className="h-4 w-4 mr-1.5" />
          {compiling ? "Compiling…" : "Compile pack"}
        </Button>
      </div>

      {packs.length === 0 ? (
        <EmptyState
          icon={FileArchive}
          title="No evidence packs yet"
          description="Compile one when a claim is notified, so the supporting records are captured as they stand today rather than reconstructed later."
        />
      ) : (
        <div className="space-y-3">
          {packs.map(pack => (
            <div key={pack.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      Evidence pack #{pack.id}
                    </p>
                    {/* Time, not just date — several packs are often compiled
                        on the same day and must be distinguishable. */}
                    <span className="text-xs text-muted-foreground">
                      sealed {formatSealed(pack.sealed_at || pack.created_at)}
                    </span>
                  </div>

                  {/* Only the record types actually present. Listing
                      "0 payment certificates" is noise. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="text-sm text-foreground">
                      {pack.item_count} record{pack.item_count === 1 ? "" : "s"}
                    </span>
                    {parseCounts(pack.summary).map(part => (
                      <span key={part} className="text-xs text-muted-foreground">
                        {part}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground font-mono mt-2">
                    {pack.manifest_hash.slice(0, 16)}…{pack.manifest_hash.slice(-8)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {pack.integrity_verified ? (
                    <Badge variant="outline" className="text-[11px] border-emerald-200 text-emerald-700 gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    // Loud on purpose: an unverified pack is worthless as evidence.
                    <Badge variant="outline" className="text-[11px] border-red-200 text-red-700 gap-1">
                      <ShieldX className="h-3 w-3" /> Integrity failed
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => copyLink(pack.access_token)}>
                    <Copy className="h-3 w-3 mr-1.5" /> Copy link
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
