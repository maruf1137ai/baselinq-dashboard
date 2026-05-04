import { Badge } from "@/components/ui/badge";

export type LifecycleStatus = "scheduled" | "starting_soon" | "live" | "completed" | "cancelled" | "no_show";
export type ArtefactStatus = "none" | "processing" | "transcribed" | "notes_ready";

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  if (status === "starting_soon") {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Starting Soon
      </Badge>
    );
  }
  if (status === "live") {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        Live
      </Badge>
    );
  }
  if (status === "completed") {
    return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs px-2 py-0.5 rounded-full">Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-2 py-0.5 rounded-full">Cancelled</Badge>;
  }
  if (status === "no_show") {
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5 rounded-full">No Show</Badge>;
  }
  return <Badge variant="outline" className="bg-primary/10 text-primary border-transparent text-xs px-2 py-0.5 rounded-full">Scheduled</Badge>;
}

export function ArtefactBadge({ artefactStatus }: { artefactStatus: ArtefactStatus }) {
  if (artefactStatus === "notes_ready") {
    return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-2 py-0.5 rounded-full">Notes ready</Badge>;
  }
  if (artefactStatus === "transcribed") {
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5 rounded-full">Transcribed</Badge>;
  }
  if (artefactStatus === "processing") {
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5 rounded-full">Processing</Badge>;
  }
  return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs px-2 py-0.5 rounded-full">No transcript</Badge>;
}
