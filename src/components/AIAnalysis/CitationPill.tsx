import { FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { citationHref, type ChatSource } from "@/types/citation";

interface StatusStyle {
  label: (clause: string) => string;
  icon: typeof FileText;
  pill: string;
  text: string;
  note?: string;
}

const STATUS: Record<string, StatusStyle> = {
  verified: {
    label: (c) => `Clause ${c}`, icon: ShieldCheck, pill: "border-border bg-muted", text: "text-muted-foreground",
    note: "Found in your contract",
  },
  reference_only: {
    label: (c) => `Clause ${c} · Standard form`, icon: FileText, pill: "border-border bg-muted", text: "text-muted-foreground",
    note: "From the standard-form reference library, not this project's contract",
  },
  related: {
    label: (c) => `Related clause ${c}`, icon: FileText, pill: "border-dashed border-border bg-transparent", text: "text-muted-foreground",
    note: "Retrieved as context — the reply does not cite it",
  },
  not_found: {
    label: (c) => `Clause ${c} · not in your contract`, icon: ShieldAlert, pill: "border-amber-300 bg-amber-50", text: "text-amber-800",
    note: "The reply cites this clause, but none of your documents contains it",
  },
};
const PLAIN: StatusStyle = { label: (c: string) => `Clause ${c}`, icon: FileText, pill: "border-border bg-muted", text: "text-muted-foreground" };

/** Label, icon and classes for a chip with this verification (shared with chips that use their own tooltip). */
export function citationStyle(verification?: string) {
  const status = (verification && STATUS[verification]) || PLAIN;
  return {
    ...status,
    iconClass: verification === "verified" ? "text-green-600" : status.text,
  };
}

/** One citation chip with a hover card. Older sources without `verification` look exactly as before. */
export function CitationPill({ source }: { source: ChatSource }) {
  const status = (source.verification && STATUS[source.verification]) || PLAIN;
  const Icon = status.icon;
  const docName = source.document_name || source.doc_name;
  const hasDetail = source.verification !== "not_found";
  const href = citationHref(source);
  const chipClass = cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border hover:bg-accent transition-colors",
    href ? "cursor-pointer" : "cursor-default", status.pill);
  const chipBody = (
    <>
      <Icon className={cn("h-4 w-4", source.verification === "verified" ? "text-green-600" : status.text)} />
      <span className={cn("text-xs font-medium", status.text)}>{status.label(String(source.clause_number))}</span>
    </>
  );
  return (
    <div className="relative group" data-verification={source.verification || "none"}>
      {/* Part 15: a chip for a clause in the user's own document opens that document at the clause's page */}
      {href ? (
        <Link to={href} className={chipClass} data-testid="citation-link"
          aria-label={`Open ${docName || "the document"} at clause ${source.clause_number}`}>
          {chipBody}
        </Link>
      ) : (
        <button type="button" className={chipClass}>{chipBody}</button>
      )}
      <div className="absolute bottom-full left-0 mb-1.5 w-80 p-3 rounded-lg bg-popover border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
        {status.note && <p className="text-xs font-medium text-foreground mb-1">{status.note}</p>}
        {hasDetail && docName && <p className="text-xs font-medium text-primary/70 mb-1 truncate">{docName}</p>}
        {hasDetail && (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-normal text-foreground truncate">{source.clause_title}, Page {source.page_number}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{source.excerpt}</p>
          </>
        )}
      </div>
    </div>
  );
}
