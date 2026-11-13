/**
 * Contract forms as the backend names them (tasks/payment_terms.py), and how
 * they read on screen. Shared by Settings → Contract & payment and the
 * printed Financial Position, so a form has one name everywhere.
 */
export const CONTRACT_FORMS: Record<string, string> = {
  jbcc: "JBCC (private employer)",
  jbcc_organ_of_state: "JBCC — organ of state",
  gcc: "GCC 2015",
  nec4: "NEC4",
  fidic: "FIDIC",
  custom: "Custom / as amended",
};

export const contractFormLabel = (form: string | null | undefined): string | null =>
  form ? CONTRACT_FORMS[form] ?? form : null;
