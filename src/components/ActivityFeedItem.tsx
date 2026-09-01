import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

interface ActivityFeedItemProps {
  title: string;
  status: "In Progress" | "Pending" | "Completed";
  /**
   * The person the payload named, or NULL where it named nobody.
   *
   * Null is drawn as no avatar and no name — not as a placeholder initial and
   * not as a stand-in name. This component used to be handed a hard-coded
   * name cycled by row index whenever the task carried no `assignedBy`, which
   * attributed real contractual documents to people who do not exist. The
   * caller no longer substitutes, so this has to render the absence.
   */
  author: string | null;
  timeAgo: string;
  // True when the current user is the one this item's status change put
  // the ball in the court of (see Index.tsx's taskList.needsAction) —
  // gets the same amber "needs your action" highlight as My Actions,
  // instead of blending in with plain FYI activity.
  needsAction?: boolean;
  /**
   * Where this event happened, when the caller can name it.
   *
   * The old feed was a list of inert divs: it told a reader an RFI they must
   * answer had just been updated and gave them no way to reach it. Given a
   * route the row becomes a link; without one it renders exactly as before,
   * so nothing depends on the caller having an id.
   */
  to?: string;
}

export function ActivityFeedItem({
  title,
  status,
  author,
  timeAgo,
  needsAction = false,
  to,
}: ActivityFeedItemProps) {
  const statusDot = {
    "In Progress": "bg-blue-500",
    Pending: "bg-orange-400",
    Completed: "bg-emerald-500",
  };

  const initials = (author ?? "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const className = cn(
    "flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md border-b border-border/50 last:border-0",
    needsAction && "bg-amber-50/60",
    to && "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    to && (needsAction ? "hover:bg-amber-100/70" : "hover:bg-muted/50"),
  );

  const body = (
    <>
      {author && (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[status]}`} />
        {needsAction && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
        <p className="text-xs text-foreground truncate flex-1">
          {author && (
            <>
              <span className="font-medium">{author}</span>{" "}
            </>
          )}
          <span className="text-muted-foreground">{status.toLowerCase()}</span>{" "}
          {title}
        </p>
      </div>
      <span className="text-xs text-muted-foreground/50 shrink-0 whitespace-nowrap">{timeAgo}</span>
    </>
  );

  return to ? (
    <Link to={to} className={className} aria-label={`${author ? `${author} ` : ""}${status.toLowerCase()} ${title}. ${timeAgo}. Open it.`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
