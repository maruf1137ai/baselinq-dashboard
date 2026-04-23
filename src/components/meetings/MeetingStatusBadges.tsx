import { Badge } from "@/components/ui/badge";

export type LifecycleStatus = "scheduled" | "starting_soon" | "live" | "completed" | "cancelled" | "no_show";
export type ArtefactStatus = "none" | "processing" | "transcribed" | "notes_ready";

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  if (status === "starting_soon") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        Starting Soon
      </Badge>
    );
  }
  if (status === "live") {
    return (
      <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        Live
      </Badge>
    );
  }
  if (status === "completed") {
    return <Badge className="bg-muted text-muted-foreground border border-border text-xs px-2 py-0.5 rounded-full">Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full">Cancelled</Badge>;
  }
  if (status === "no_show") {
    return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full">No Show</Badge>;
  }
  return <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded-full">Scheduled</Badge>;
}

export function ArtefactBadge({ artefactStatus }: { artefactStatus: ArtefactStatus }) {
  if (artefactStatus === "notes_ready") {
    return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 rounded-full">Notes ready</Badge>;
  }
  if (artefactStatus === "transcribed") {
    return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full">Transcribed</Badge>;
  }
  if (artefactStatus === "processing") {
    return <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full">Processing</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border border-border text-xs px-2 py-0.5 rounded-full">No transcript</Badge>;
}
