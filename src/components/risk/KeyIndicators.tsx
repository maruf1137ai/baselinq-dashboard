/**
 * Key Indicators — the client's third block, and the emotional centre of his
 * mock.
 *
 * ── What this REPLACED, rather than sat beside ────────────────────────────
 *
 * The hero on Project Health ended in a row of three chips — "8 critical",
 * "2 warning", "0 clear" — each a bare count in a severity colour. That row is
 * the colour inversion in its purest form: a COUNT is not a condition, and
 * painting "2" amber says nothing about what the two are, while the sentence
 * that names the actual breach sat in grey below it.
 *
 * So the chips are gone and this is in their place. It occupies the same slot
 * in the same panel and costs no extra height, and everything the chips said is
 * still said — the red and amber counts are the Risk alerts cell's second line.
 * There is no second summary strip on the page.
 *
 * ── Weight ────────────────────────────────────────────────────────────────
 *
 * The client gave his first two indicators real presence and let the tail go
 * quiet, and that ordering is kept: `buildKeyIndicators` returns the
 * breachable ones first, and the first cell that carries a tone is the only
 * one drawn at the larger size. An indicator with nothing behind it is not in
 * the list at all — a project with no variations does not get a row reading
 * "0 pending".
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 *
 * Only `red` and `amber`, only from `tone`, and `tone` is only ever set where
 * something has actually breached something. The palette is the app's existing
 * severity scale — the 50/700/200 ramp in `src/lib/statusColors.ts` and the
 * `danger` / `warning` badge variants — not a new one.
 */
import { cn } from "@/lib/utils";
import type { Indicator } from "@/lib/projectPosition";

const TONE_TEXT: Record<string, string> = {
  red: "text-red-700",
  amber: "text-amber-700",
  neutral: "text-foreground",
};

export default function KeyIndicators({ indicators }: { indicators: Indicator[] }) {
  if (indicators.length === 0) return null;

  return (
    <div
      className="grid gap-x-6 gap-y-4 grid-cols-2 lg:grid-cols-4"
      role="group"
      aria-label="Key indicators"
    >
      {indicators.map((i, index) => {
        // The lead cell gets the stat size, and only when it is actually
        // carrying a breach — a project whose worst indicator is neutral gets
        // no emphasised figure, because there is nothing to lead with.
        const lead = index === 0 && i.tone !== "neutral";
        return (
          <div key={i.key} className="min-w-0" title={i.caveat}>
            <p className="text-xs text-muted-foreground truncate">{i.label}</p>
            <p
              className={cn(
                "tabular-nums truncate mt-0.5",
                lead ? "text-lg" : "text-sm",
                TONE_TEXT[i.tone] ?? TONE_TEXT.neutral,
              )}
            >
              {i.state}
            </p>
            {i.detail && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{i.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
