/**
 * The first human-readable message in a failed API call's response.
 *
 * Handles the shapes this backend returns: `{error}`, `{detail}`, `{message}`,
 * and DRF field errors (`{time: ["Please select a time."]}` or
 * `{non_field_errors: [...]}`). Falls back when there is nothing usable.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object") return fallback;

  const record = data as Record<string, unknown>;
  for (const key of ["error", "detail", "message"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  for (const value of Object.values(record)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string" && first.trim()) return first;
  }
  return fallback;
}
