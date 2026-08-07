"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";
import { AiMark } from "@/components/icons/AiMark";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConflictActionItem {
  id: number;
  text: string;
  linked_task_type: string | null;
  approved_by_name: string | null;
}

interface Conflict {
  error: string;
  count: number;
  items: ConflictActionItem[];
}

const WILL_GENERATE = [
  "Meeting summary",
  "Key decisions with owners",
  "Action items with due dates",
  "Next steps",
];

interface Props {
  meetingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateAiNotesDialog({ meetingId, open, onOpenChange, onSuccess }: Props) {
  const [transcript, setTranscript] = useState("");
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const { mutateAsync: postRequest, isPending } = usePost();

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConflict(null);
    }
    onOpenChange(nextOpen);
  };

  const submit = async (force: boolean) => {
    try {
      await postRequest({
        url: `meetings/${meetingId}/generate-ai-notes/`,
        data: { transcript: transcript.trim(), ...(force ? { force: true } : {}) },
      });
      toast.success("AI notes generated successfully.");
      setTranscript("");
      setConflict(null);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const data = err.response.data;
        setConflict({ error: data.error, count: data.approvedActionItemCount, items: data.approvedActionItems || [] });
        return;
      }
      toast.error(err?.response?.data?.error ?? "Failed to generate AI notes.");
    }
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      toast.error("Please paste the meeting transcript first.");
      return;
    }
    await submit(false);
  };

  const handleForceGenerate = async () => {
    await submit(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent size="lg" className="p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <AiMark size={20} className="text-primary" />
            Generate AI Meeting Notes
          </DialogTitle>
        </DialogHeader>

        {conflict ? (
          <div className="space-y-4 px-6 pb-6 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  {conflict.count} approved action item{conflict.count !== 1 ? "s" : ""} already linked to real
                  tasks. Regenerating will replace any still-pending items with a fresh extraction from the new
                  transcript — the approved item{conflict.count !== 1 ? "s" : ""} below and their linked tasks will
                  not be touched.
                </p>
              </div>
            </div>

            <div className="border border-border rounded-xl divide-y divide-border max-h-[240px] overflow-y-auto">
              {conflict.items.map((item) => (
                <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-foreground">{item.text}</p>
                    {item.approved_by_name && (
                      <p className="text-xs text-muted-foreground mt-0.5">Approved by {item.approved_by_name}</p>
                    )}
                  </div>
                  {item.linked_task_type && (
                    <Badge variant="neutral" className="shrink-0">{item.linked_task_type}</Badge>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setConflict(null)} disabled={isPending}>
                Back
              </Button>
              <Button onClick={handleForceGenerate} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Regenerating...
                  </>
                ) : (
                  "Regenerate Anyway"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-6 pb-6 pt-4">
            {/* What AI will generate */}
            <div className="bg-muted/50 border border-border rounded-xl p-4">
              <p className="text-sm text-foreground mb-2">AI will generate:</p>
              {WILL_GENERATE.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full shrink-0" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>

            {/* Transcript input */}
            <div>
              <label className="text-sm text-foreground font-medium block mb-2">
                Paste Meeting Transcript *
              </label>
              <Textarea
                placeholder="Paste your meeting transcript here... (copy from Google Meet, Zoom, Teams, or any text)"
                className="min-h-[200px] text-sm resize-none"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isPending || !transcript.trim()}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <AiMark size={16} className="text-white mr-2" />
                    Generate Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
