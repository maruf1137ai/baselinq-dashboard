import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { postData } from "@/lib/Api";
import { cn } from "@/lib/utils";

export type FeedbackSurface = "task_chat" | "linq_chat" | "document_chat" | "analysis";

/**
 * 👍 / 👎 on one AI answer (Part 15). Saved on the server (POST ai_analysis/feedback/) — a second click
 * changes the vote. Hidden until the answer has a server id (an answer still being written has none).
 */
export function AnswerFeedback({
  surface,
  targetId,
  className,
}: {
  surface: FeedbackSurface;
  targetId?: string | number | null;
  className?: string;
}) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [busy, setBusy] = useState(false);
  if (targetId === undefined || targetId === null || targetId === "") return null;

  const vote = async (value: 1 | -1) => {
    if (busy) return;
    setBusy(true);
    try {
      await postData({ url: "ai_analysis/feedback/", data: { surface, target_id: String(targetId), rating: value } });
      setRating(value);
      toast.success(value === 1 ? "Thanks — marked as helpful." : "Thanks — we'll use this to improve Linq.");
    } catch (err: any) {
      const data = err?.response?.data || {};
      toast.error(data.message || "Couldn't save your feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="answer-feedback">
      <button
        type="button"
        aria-label="Helpful"
        aria-pressed={rating === 1}
        disabled={busy}
        onClick={() => vote(1)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", rating === 1 ? "text-green-600 fill-green-600" : "text-muted-foreground")} />
      </button>
      <button
        type="button"
        aria-label="Not helpful"
        aria-pressed={rating === -1}
        disabled={busy}
        onClick={() => vote(-1)}
        className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
      >
        <ThumbsDown className={cn("h-3.5 w-3.5", rating === -1 ? "text-red-600 fill-red-600" : "text-muted-foreground")} />
      </button>
    </div>
  );
}
