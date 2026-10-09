import { isPriceBreakdownV2, type PriceBreakdownItem, type PricePosition } from "@/types/priceEstimate";

const POSITION_TEXT: Record<PricePosition, string> = {
  above_range: "Above AI range",
  within_range: "Within AI range",
  below_range: "Below AI range",
  unit_unclear: "Units may differ — QS to check",
};

const POSITION_CLASS: Record<PricePosition, string> = {
  above_range: "text-amber-800",
  within_range: "text-muted-foreground",
  below_range: "text-amber-800",
  unit_unclear: "text-amber-800",
};

function money(value: number, currency: string): string {
  const amount = Number(value).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "ZAR" ? `R ${amount}` : `${currency} ${amount}`;
}

function EstimateCell({ item, currency }: { item: PriceBreakdownItem; currency: string }) {
  if (!item.estimate) {
    return <span className="text-muted-foreground">Not verified — manual QS review</span>;
  }
  const { low, high, typical, unit, basis } = item.estimate;
  return (
    <div>
      <p className="text-foreground">
        {money(low, currency)} – {money(high, currency)} per {unit}
      </p>
      <p className="text-xs text-muted-foreground">typical {money(typical, currency)}</p>
      {basis && <p className="text-xs text-muted-foreground mt-0.5">{basis}</p>}
    </div>
  );
}

/** Labelled AI price estimates for VO line items. Renders nothing for older or empty price data. */
export const PriceBreakdown = ({ priceData }: { priceData: unknown }) => {
  if (!isPriceBreakdownV2(priceData) || priceData.items.length === 0) return null;
  const { currency, items, label, disclaimer, reason, total_claimed } = priceData;

  return (
    <section aria-label="AI price estimates" className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium text-foreground">AI price estimates</h4>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{disclaimer}</p>
      {reason && <p className="mt-1 text-xs text-amber-800">{reason}</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">Item</th>
              <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Claimed rate</th>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-3">AI estimate (not verified)</th>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2 pl-3">Check</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.index} className="border-b border-border/50 last:border-0 align-top">
                <td className="py-2 pr-3">
                  <p className="text-foreground">
                    {item.index}. {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground">quantity {item.quantity}</p>
                </td>
                <td className="py-2 px-3 text-right font-mono text-foreground whitespace-nowrap">{money(item.claimed_unit_rate, currency)}</td>
                <td className="py-2 px-3">
                  <EstimateCell item={item} currency={currency} />
                </td>
                <td className="py-2 pl-3 text-xs">
                  {item.position ? (
                    <span className={POSITION_CLASS[item.position]}>{POSITION_TEXT[item.position]}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">Total claimed: {money(total_claimed, currency)}</p>
    </section>
  );
};
