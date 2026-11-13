import useFetch from "@/hooks/useFetch";
import { setActiveCurrency } from "@/lib/formatCurrency";
import { useSelectedProjectId } from "@/hooks/useSelectedProject";

/**
 * The selected project's currency, made the default for contract money
 * (`formatMoney`). Set during render, not in an effect, so the children that
 * render after the layout never print a figure in the previous currency first.
 * A project's money stays in its own currency (client meeting, 10 Nov 2026).
 */
export function useProjectCurrency(): string {
  const projectId = useSelectedProjectId();
  const { data } = useFetch<{ currency?: string }>(projectId ? `projects/${projectId}/` : "", {
    enabled: !!projectId,
  });
  const currency = (data?.currency || "ZAR").toUpperCase();
  setActiveCurrency(currency);
  return currency;
}

export default useProjectCurrency;
