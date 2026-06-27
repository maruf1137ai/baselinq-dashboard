import { useEffect } from "react";

/**
 * Session-scoped draft store for the task-creation forms.
 *
 * When a user fills in a create-task form (RFI / SI / VO / IC / DC / GI / CPI)
 * and presses the new "minimize" (-) button, the form's entered data is kept
 * here so reopening the same task type auto-fills it. The (X) close and the
 * footer Cancel button discard the draft instead.
 *
 * Storage is `sessionStorage` — drafts survive in-app navigation and an in-tab
 * reload, but are cleared when the tab/app is closed (this-session-only, per
 * the agreed behaviour).
 *
 * Note: file attachments are NOT persisted — `File` objects aren't
 * serialisable, so a restored draft starts with an empty attachment list.
 */

const KEY = (type: string) => `taskDraft:${type}`;

export function loadTaskDraft(type: string): any | null {
  try {
    const raw = sessionStorage.getItem(KEY(type));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTaskDraft(type: string, data: unknown): void {
  try {
    sessionStorage.setItem(KEY(type), JSON.stringify(data));
  } catch {
    // Private mode / quota — never block the form on a draft write.
  }
}

export function clearTaskDraft(type: string): void {
  try {
    sessionStorage.removeItem(KEY(type));
  } catch {
    // ignore
  }
}

// Order mirrors CreateRequestDialog.renderForm (IC is checked before DC so an
// "IC…" code isn't swallowed by the "DC" branch).
export const TASK_TYPE_KEYS = ["RFI", "SI", "VO", "IC", "DC", "GI", "CPI"] as const;

/**
 * Map a `selectedType` (e.g. "VO", "RFI - …") to its canonical draft key,
 * using the same startsWith logic the dialog uses to pick a form.
 */
export function taskTypeKeyFromSelected(selectedType?: string): string | null {
  if (!selectedType) return null;
  return TASK_TYPE_KEYS.find((k) => selectedType.startsWith(k)) ?? null;
}

/**
 * Autosave `snapshot` to the draft for `type` whenever it changes — but only
 * while `enabled` (create mode; never in edit mode). Date values inside the
 * snapshot serialise to ISO strings via JSON and are restored with `new Date`.
 */
export function useTaskDraftAutosave(type: string, enabled: boolean, snapshot: unknown): void {
  useEffect(() => {
    if (enabled) saveTaskDraft(type, snapshot);
    // JSON string of the snapshot gives a simple deep-compare for the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, enabled, JSON.stringify(snapshot)]);
}
