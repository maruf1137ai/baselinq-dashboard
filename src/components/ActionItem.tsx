import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ActionItemProps {
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  dueDate: string;
  id: string;
  isOverdue?: boolean;
}

export function ActionItem({
  title,
  description,
  priority,
  dueDate,
  id,
  isOverdue = false,
}: ActionItemProps) {
  const navigate = useNavigate();

  const priorityStyles = {
    Critical: "bg-red-50 text-red-700 border-red-200",
    High: "bg-orange-50 text-orange-700 border-orange-200",
    Medium: "bg-blue-50 text-blue-700 border-blue-200",
    Low: "bg-muted/50 text-gray-700 border-border",
  };

  return (
    <div className={`p-4 border rounded-xl hover:border-primary/50 transition-colors ${isOverdue ? 'bg-red-50 border-red-200' : 'border-border bg-card'}`} >
      <div className="flex items-start justify-between gap-3 mb-1">
        <h4 className="text-sm text-foreground flex-1 ">{title}</h4>
        <Badge
          variant="outline"
          className={`${priorityStyles[priority]} text-xs shrink-0`}>
          {priority}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/50">Due: {dueDate}</span>
        <button className="inline-flex items-center text-xs text-foreground hover:text-primary transition-colors group" onClick={() => navigate(`/tasks/${id}`)}>
          View
          <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
