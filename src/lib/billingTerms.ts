/**
 * Validation for the Settings → Billing form (Baselinq staff only).
 *
 * The editable figures are held as TEXT, not numbers. A cleared field used to
 * become `Number("") === 0` and save a 0% fee rate on a project still marked
 * Active (QA BUG-12). Empty is now empty, and Save waits until every field
 * reads as something the server will accept — the same rules
 * `billing/views_config.py` enforces, so the two never disagree.
 *
 * Kept out of the component because it decides what may be saved.
 */

export interface BillingDraft {
  rate: string;
  vat: string;
  cap: string;
}

export type BillingDraftErrors = Partial<Record<keyof BillingDraft, string>>;

/** Field errors for a draft; an empty object means it may be saved. */
export function billingDraftErrors(draft: BillingDraft, enabled: boolean): BillingDraftErrors {
  const errors: BillingDraftErrors = {};

  const percentage = (key: keyof BillingDraft, label: string): number | null => {
    const text = draft[key].trim();
    if (text === "") {
      errors[key] = `Enter ${label}.`;
      return null;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) {
      errors[key] = "Must be a number.";
      return null;
    }
    if (n < 0 || n > 100) {
      errors[key] = "Must be between 0 and 100.";
      return null;
    }
    return n;
  };

  const rate = percentage("rate", "a fee rate");
  percentage("vat", "a VAT rate");

  // Switched on at 0% looks active and charges nothing.
  if (enabled && rate !== null && rate <= 0) {
    errors.rate = "Billing that is on needs a fee rate above 0%. Switch it off instead.";
  }

  const capText = draft.cap.trim();
  if (capText !== "") {
    const cap = Number(capText);
    if (!Number.isFinite(cap)) errors.cap = "Must be a number.";
    else if (cap < 0) errors.cap = "The cap cannot be negative.";
  }

  return errors;
}
