/**
 * Werner spec rev H — High / Medium / Low risk level buttons (IC only).
 *
 * Werner page 10 hand-drawn annotation: the PM rates an Intention to
 * Claim's severity inline on the doc. HIGH triggers the insurance
 * broker email. Lives directly under the doc card on the IC v2 page.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePost } from "@/hooks/usePost";

type Level = "low" | "medium" | "high";

interface Props {
  entityId: number;
  currentLevel: Level | null;
  onChanged: () => void;
}

const LEVEL_STYLES: Record<Level, { active: string; label: string; warn?: string }> = {
  low: {
    active: "bg-green-600 text-white border-green-600 hover:bg-green-700",
    label: "Low",
  },
  medium: {
    active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600",
    label: "Medium",
  },
  high: {
    active: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    label: "High",
    warn: "Will notify the respondent's insurance broker.",
  },
};

export function RiskLevelButtons({ entityId, currentLevel, onChanged }: Props) {
  const [busy, setBusy] = useState<Level | null>(null);
  const { mutateAsync: postRequest } = usePost();

  const handleClick = async (level: Level) => {
    if (currentLevel === level) return;

    if (level === "high") {
      const confirmed = window.confirm(
        "Setting this claim to HIGH risk will notify the respondent's "
          + "insurance broker by email. Continue?",
      );
      if (!confirmed) return;
    }

    setBusy(level);
    try {
      await postRequest({
        url: `tasks/intentions-to-claim/${entityId}/set-risk-level/`,
        data: { risk_level: level },
      });
      const styles = LEVEL_STYLES[level];
      toast.success(`Risk level set to ${styles.label}.${styles.warn ? " " + styles.warn : ""}`);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to set risk level.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-md px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-900">PM risk assessment</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Set how serious this Intention to Claim looks. HIGH alerts the broker.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["low", "medium", "high"] as const).map((level) => {
            const styles = LEVEL_STYLES[level];
            const isActive = currentLevel === level;
            return (
              <Button
                key={level}
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => handleClick(level)}
                className={`min-w-[70px] ${isActive ? styles.active : "bg-white"}`}
              >
                {busy === level ? "…" : styles.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
