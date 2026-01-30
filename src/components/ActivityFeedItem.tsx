import { Badge } from "@/components/ui/badge";

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
  const statusStyles = {
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    Pending: "bg-orange-50 text-orange-700 border-orange-200",
    Completed: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <h4 className="text-sm text-[#111827]">{title}</h4>
          <Badge
            variant="outline"
            className={`${statusStyles[status]} text-xs font-medium`}>
            {status}
          </Badge>
        </div>
        <p className="text-xs text-[#9CA3AF]">
          {author} • {timeAgo}
        </p>
      </div>
    </div>
  );
}
