/**
 * Shared UI class constants.
 * Import these instead of copy-pasting class strings across pages.
 */

/**
 * Base classes for the standard form input (CreateProject / EditProject / Index quick-fill).
 * h-12, grey background. Used inside inputCls() helper in those pages.
 */
export const INPUT_BASE =
  "w-full h-12 px-4 rounded-[10px] text-sm text-[#111827] outline-none transition-all bg-[#f5f6f8] border border-[#e2e5ea] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10";

/** Error variant addition for INPUT_BASE */
export const INPUT_ERROR = "!border-red-400 focus:!border-red-400 focus:ring-red-400/10";

/**
 * Base classes for the select element (same visual as INPUT_BASE + arrow cursor).
 */
export const SELECT_BASE =
  "w-full h-12 px-4 pr-9 rounded-[10px] text-sm text-[#111827] outline-none bg-[#f5f6f8] border border-[#e2e5ea] appearance-none cursor-pointer focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 transition-all";

/**
 * Textarea variant — same palette, taller radius to match design.
 */
export const TEXTAREA_BASE =
  "w-full px-4 py-4 rounded-[10px] text-sm text-[#111827] outline-none transition-all resize-none bg-[#f5f6f8] border border-[#e2e5ea] focus:border-[#6c5ce7] focus:ring-2 focus:ring-[#6c5ce7]/10 leading-relaxed";

/**
 * Settings-page input — projectDetails / teamMembersTable.
 * h-10, white background, primary focus ring via shadcn token.
 */
export const SETTINGS_INPUT_CLS =
  "h-10 border border-border bg-white focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg text-sm placeholder:text-sm placeholder:text-muted-foreground";

/**
 * Standard form label — small, muted, tracking-wider.
 */
export const LABEL_CLS =
  "text-[11px] font-normal text-muted-foreground tracking-wider ml-0.5 block mb-1.5";
