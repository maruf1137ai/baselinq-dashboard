/**
 * Werner spec rev G — reply composer.
 *
 * Composer panel that slides in below the doc when the user clicks
 * Reply. Mirrors the Werner page-3 / page-5 composer layout: body
 * textarea, recipient selector, attachment, references, and TIME/COST
 * checkboxes when relevant (SI reply, Claim).
 *
 * Submit hits POST /api/tasks/replies/. The auto-VO side-effect from
 * SI time/cost flags is handled server-side — the consumer just
 * refetches after submit.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Paperclip } from "lucide-react";

interface ReplyFormProps {
  /** "rfi" | "si" | "vo" | "gi" | "ic" | "claim" */
  entityType: string;
  entityId: number;
  /** Show TIME / COST checkboxes — used for SI replies and Claims. */
  showTimeCost?: boolean;
  onSubmit: (payload: {
    body: string;
    recipient_id?: number | null;
    time_impact: boolean;
    cost_impact: boolean;
  }) => Promise<void> | void;
  onCancel?: () => void;
  onAnalyzeAi?: () => void;
  /** Optional: pre-fill body if user picked "use AI suggestion". */
  initialBody?: string;
  isSubmitting?: boolean;
}

export function ReplyForm({
  showTimeCost = false,
  onSubmit,
  onCancel,
  onAnalyzeAi,
  initialBody = "",
  isSubmitting,
}: ReplyFormProps) {
  const [body, setBody] = useState(initialBody);
  const [timeImpact, setTimeImpact] = useState(false);
  const [costImpact, setCostImpact] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    await onSubmit({
      body: body.trim(),
      time_impact: timeImpact,
      cost_impact: costImpact,
    });
  };

  return (
    <div className="border border-purple-200 rounded-lg bg-white p-4 my-3">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-700 mb-1 block">Reply:</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your reply…"
            rows={4}
            className="w-full resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-gray-500 block mb-1">Add recipient:</label>
            <input
              type="text"
              placeholder="Optional: delegate to a specific user…"
              className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              disabled
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Recipient picker — wires into team directory in commit 5.
            </p>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Attachment:</label>
            <Button variant="outline" size="sm" disabled className="h-8 text-xs">
              <Paperclip className="mr-1.5 h-3 w-3" />
              Attach file
            </Button>
          </div>
        </div>

        {showTimeCost && (
          <div className="flex items-center gap-6 pt-3 border-t border-gray-100 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={timeImpact}
                onChange={(e) => setTimeImpact(e.target.checked)}
                className="h-4 w-4 text-purple-600 rounded"
              />
              <span className="text-gray-700">TIME impact</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={costImpact}
                onChange={(e) => setCostImpact(e.target.checked)}
                className="h-4 w-4 text-purple-600 rounded"
              />
              <span className="text-gray-700">COST impact</span>
            </label>
            {(timeImpact || costImpact) && (
              <span className="text-xs text-orange-600 font-medium">
                ⚠ Will auto-create a draft VO and notify the PM
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            {onAnalyzeAi && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAnalyzeAi}
                className="bg-gray-900 text-white hover:bg-gray-800 border-gray-900"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Analyze with AI
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!body.trim() || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSubmitting ? "Submitting…" : "Submit Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
