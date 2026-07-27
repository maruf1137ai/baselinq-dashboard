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
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground max-w-2xl">
          A sealed snapshot of the variation orders, payment certificates, milestones,
          risk signals and notice deadlines as they stood at the moment of capture.
          Each item is hashed and the pack carries a SHA-256 manifest, so any later
          alteration is detectable by anyone who checks.
        </p>
        <Button size="sm" onClick={compile} disabled={compiling}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {compiling ? "Compiling…" : "Compile pack"}
        </Button>
      </div>

      {packs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2 rounded-lg border border-dashed border-border">
          <FileArchive className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-foreground">No evidence packs yet</p>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            Compile one when a claim is notified, so the supporting records are
            captured as they stand today rather than reconstructed later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {packs.map(pack => (
            <div key={pack.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{pack.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pack.summary}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-2 break-all">
                    sha256: {pack.manifest_hash.slice(0, 32)}…
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
