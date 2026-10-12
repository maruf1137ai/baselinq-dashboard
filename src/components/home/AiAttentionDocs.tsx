import { useQuery } from "@tanstack/react-query";
import { FileWarning } from "lucide-react";
import { Link } from "react-router-dom";

import { fetchData } from "@/lib/Api";

interface AttentionDoc {
  _id: string;
  name?: string;
  aiStatus?: string;
  aiStatusReason?: string;
}

/**
 * Documents this user uploaded whose AI analysis failed or found no readable text (Part 15). Shown in
 * "My actions" so a failure isn't only visible on the document's own page. Nothing renders when there are
 * none, or when the list can't be read (the documents page still shows each status).
 */
export function AiAttentionDocs({ projectId }: { projectId?: string | null }) {
  const { data } = useQuery({
    queryKey: ["home", "ai-attention-docs", projectId],
    queryFn: () => fetchData(`documents/?project_id=${projectId}&aiStatus=Needs%20Attention&mine=1`),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const rows: AttentionDoc[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
  if (rows.length === 0) return null;

  return (
    <div className="border-b border-border px-4 py-3" data-testid="ai-attention-docs">
      <p className="text-xs font-medium text-foreground mb-2">Documents the AI couldn't read</p>
      <ul className="space-y-1.5">
        {rows.slice(0, 5).map((doc) => (
          <li key={doc._id} className="flex items-start gap-2 text-xs">
            <FileWarning className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <Link to={`/documents/${doc._id}`} className="font-medium text-foreground hover:underline truncate block">
                {doc.name || "Document"}
              </Link>
              <span className="text-muted-foreground">
                {doc.aiStatus === "no_text" ? "No readable text" : "AI analysis failed"}
                {doc.aiStatusReason ? ` — ${doc.aiStatusReason}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
