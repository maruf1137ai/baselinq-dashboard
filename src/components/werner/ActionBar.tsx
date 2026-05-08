/**
 * Werner spec rev G — role-aware bottom action bar.
 *
 * Shows the right buttons for the current user on the current doc:
 *   • Contractor on initiating doc → Submit only.
 *   • Professional → Analyze with AI + Reply + + Action.
 *   • After response → Close out + Reply.
 *
 * The "+ Action" dropdown is gated by Werner's allowed transitions:
 *   rfi → si only
 *   si  → vo only
 *   ic  → claim only
 *   anything else: + Action hidden.
 */
import { useState } from "react";
import { Sparkles, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DocType = "rfi" | "si" | "vo" | "gi" | "ic" | "claim";

const ALLOWED_TRANSITIONS: Record<DocType, DocType[]> = {
  rfi: ["si"],
  si: ["vo"],
  ic: ["claim"],
  vo: [],
  gi: [],
  claim: [],
};

const TRANSITION_LABELS: Record<DocType, string> = {
  rfi: "RFI",
  si: "SI – Site Instruction",
  vo: "VO – Variation Order",
  gi: "GI – General Instruction",
  ic: "IC – Intention to Claim",
  claim: "Claim",
};

interface ActionBarProps {
  docType: DocType;
  /** "submit" = initiating doc, contractor view.
   *  "reply"  = doc has been read by the recipient, can respond. */
  mode: "submit" | "reply" | "after-response";
  onAnalyzeAi?: () => void;
  onReply?: () => void;
  onSubmit?: () => void;
  onCloseOut?: () => void;
  onAction?: (target: DocType) => void;
  isSubmitting?: boolean;
}

export function ActionBar({
  docType,
  mode,
  onAnalyzeAi,
  onReply,
  onSubmit,
  onCloseOut,
  onAction,
  isSubmitting,
}: ActionBarProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const allowedNext = ALLOWED_TRANSITIONS[docType];

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center justify-between gap-3">
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

      <div className="flex items-center gap-2 ml-auto">
        {mode === "submit" && onSubmit && (
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        )}

        {mode === "reply" && onReply && (
          <Button
            onClick={onReply}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Reply
          </Button>
        )}

        {mode === "reply" && allowedNext.length > 0 && onAction && (
          <div className="relative">
            <Button
              onClick={() => setActionMenuOpen(!actionMenuOpen)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              + Action
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
            {actionMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 w-56 z-10">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 flex items-center justify-between">
                  Escalate to:
                  <button
                    type="button"
                    onClick={() => setActionMenuOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {allowedNext.map((target) => (
                  <button
                    key={target}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => {
                      onAction(target);
                      setActionMenuOpen(false);
                    }}
                  >
                    {TRANSITION_LABELS[target]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "after-response" && onReply && (
          <Button
            variant="outline"
            onClick={onReply}
            className="text-purple-700 border-purple-300 hover:bg-purple-50"
          >
            Reply
          </Button>
        )}

        {mode === "after-response" && onCloseOut && (
          <Button
            onClick={onCloseOut}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Close out
          </Button>
        )}
      </div>
    </div>
  );
}
