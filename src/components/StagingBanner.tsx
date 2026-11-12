/**
 * A thin strip at the top of every page on staging builds, so nobody mistakes
 * staging for production. Shown only when the build sets
 * VITE_APP_ENV=staging; production and local builds render nothing.
 *
 * It sits in normal document flow, above the app, so it pushes the page down
 * rather than covering anything.
 */
export function StagingBanner() {
  if (import.meta.env.VITE_APP_ENV !== "staging") return null;
  return (
    <div
      role="note"
      aria-label="Environment"
      className="w-full border-b border-amber-300 bg-amber-100 py-0.5 text-center text-[11px] font-semibold tracking-wide text-amber-900"
    >
      STAGING · anonymised data
    </div>
  );
}
