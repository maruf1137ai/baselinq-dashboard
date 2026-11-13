/**
 * The currencies a project may be in — the ones the backend keeps exchange
 * rates for (project/currency.py SUPPORTED). A project's money stays in its
 * own currency (client meeting, 10 Nov 2026). Shared by Create and Edit
 * Project so the two forms offer the same list.
 */
export const PROJECT_CURRENCIES = [
  "ZAR", "USD", "EUR", "GBP", "AED",
  "RWF", "BWP", "NAD", "LSL", "SZL", "MZN", "ZMW", "MWK", "KES", "TZS", "UGX", "NGN", "GHS",
];
