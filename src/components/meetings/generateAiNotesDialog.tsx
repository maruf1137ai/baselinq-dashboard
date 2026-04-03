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
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";
import AiIcon from "@/components/icons/AiIcon";
import { Loader2 } from "lucide-react";

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
  const { mutateAsync: postRequest, isPending } = usePost();

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      toast.error("Please paste the meeting transcript first.");
      return;
    }

    try {
      await postRequest({
        url: `meetings/${meetingId}/generate-ai-notes/`,
        data: { transcript: transcript.trim() },
      });
      toast.success("AI notes generated successfully.");
      setTranscript("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to generate AI notes.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[650px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-border">
          <DialogTitle className="text-base text-foreground flex items-center gap-2">
            <AiIcon size={18} className="text-primary" />
            Generate AI Meeting Notes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {/* What AI will generate */}
          <div className="bg-sidebar border border-border rounded-xl p-4">
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
                  <AiIcon size={16} className="text-white mr-2" />
                  Generate Notes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
