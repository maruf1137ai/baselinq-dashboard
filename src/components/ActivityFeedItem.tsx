import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle } from "lucide-react";

interface ActivityFeedItemProps {
  title: string;
  status: "In Progress" | "Pending" | "Completed";
  author: string;
  timeAgo: string;
  // True when the current user is the one this item's status change put
  // the ball in the court of (see Index.tsx's taskList.needsAction) —
  // gets the same amber "needs your action" highlight as My Actions,
  // instead of blending in with plain FYI activity.
  needsAction?: boolean;
}

export function ActivityFeedItem({
  title,
  status,
  author,
  timeAgo,
  needsAction = false,
}: ActivityFeedItemProps) {
  const statusDot = {
    "In Progress": "bg-blue-500",
    Pending: "bg-orange-400",
    Completed: "bg-emerald-500",
  };

  const initials = author
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md border-b border-border/50 last:border-0 ${needsAction ? "bg-amber-50/60" : ""}`}
    >
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
          {initials || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[status]}`} />
        {needsAction && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
        <p className="text-xs text-foreground truncate flex-1">
          <span className="font-medium">{author}</span>{" "}
          <span className="text-muted-foreground">{status.toLowerCase()}</span>{" "}
          {title}
        </p>
      </div>
      <span className="text-xs text-muted-foreground/50 shrink-0 whitespace-nowrap">{timeAgo}</span>
    </div>
  );
}
