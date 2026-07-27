/**
 * AiMark — the single mark for "this invokes Baselinq's AI".
 *
 * WHY AN ASTERISK
 * ---------------
 * The app previously used three different marks for one concept: `Zap`
 * (lightning) on TaskDetails and the AI analysis panels, `Sparkles` on
 * Compliance for the *same* "Analyse with AI" action, and a wand-and-sparkles
 * `AiIcon` in the weather modal.
 *
 * All three were wrong for this product, not just inconsistent:
 *   • A lightning bolt means FAST. It is the icon every consumer app uses for
 *     speed or power, which is why it reads cheap.
 *   • Sparkles and a magic wand claim MAGIC. Baselinq's AI reads construction
 *     contracts to find clause exposure and missed notices; presenting that as
 *     magic undersells it and, worse, invites the user not to check it.
 *
 * An asterisk is the annotation mark — the footnote, the "see note". That is
 * literally what the AI does to a record: it reads it and annotates it. It is
 * one confident geometric stroke rather than scattered twinkles, so it stays
 * legible at 16px where `AiIcon`'s four separate sparkle glyphs (3-7px each in
 * a 24x23 box) turn to mush.
 *
 * RELATIONSHIP TO THE LOADER
 * --------------------------
 * `AwesomeLoader`'s three drawing rules and this mark are deliberately
 * DIFFERENT shapes doing different jobs: the loader is a state (animated,
 * transient, "working now"), this is an affordance (static, persistent, "this
 * invokes AI"). Sharing one mark would make a resting button look like a
 * stalled spinner. They share a geometric language instead — precise, stroke
 * based, no gradient, no twinkle.
 */
import { cn } from "@/lib/utils";

interface AiMarkProps {
  className?: string;
  /** Pixel size. Defaults to 16, the app's icon default. */
  size?: number;
}

export function AiMark({ className, size = 16 }: AiMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      // currentColor, so the mark inherits from the button or text it sits in.
      // The previous Asterisk hardcoded #6B6B6B and took no props, so it could
      // never sit on a filled button.
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 3V15M14.25 6L3.75 12M14.25 12L3.75 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default AiMark;
