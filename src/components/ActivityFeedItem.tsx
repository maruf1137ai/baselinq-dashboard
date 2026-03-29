import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ActivityFeedItemProps {
  title: string;
  status: "In Progress" | "Pending" | "Completed";
  author: string;
  timeAgo: string;
}

export function ActivityFeedItem({
  title,
  status,
  author,
  timeAgo,
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
    <div className="flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
          {initials || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[status]}`} />
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
