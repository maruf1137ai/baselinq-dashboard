import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const PriceBreakdown = ({ priceData, visibleSections, startSelector }: { priceData: any, visibleSections: number, startSelector: number }) => {
  if (!priceData) return null;

  const currency = priceData.currency || 'ZAR';
  const items = priceData.items_analysis || [];
  const summary = priceData.summary || {};
  const notes = priceData.overall_assessment?.verification_notes || [];

  // Build markdown text from price data (ChatGPT-style flowing text)
  const buildMarkdown = () => {
    const lines: string[] = [];

    lines.push('### Market Verification Analysis\n');

    items.forEach((item: any) => {
      const mv = item.market_verification || {};
      const mrr = mv.market_rate_range || {};

      lines.push(`**${item.item_number}. ${item.description}**`);
      lines.push(`${item.quantity} ${item.unit || 'units'} @ R ${Number(item.unit_rate || item.unit_price).toLocaleString()} = **R ${Number(item.total).toLocaleString()}**\n`);

      if (mrr.average) {
        lines.push(`- **Market Average:** R ${Number(mrr.average).toLocaleString()} (Range: R ${Number(mrr.low).toLocaleString()} – R ${Number(mrr.high).toLocaleString()})`);
      }
      if (mv.assessment) {
        lines.push(`- ${mv.assessment}`);
      }
      lines.push('');
    });

    // Financial summary
    if (summary.total_claimed) {
      lines.push('---\n');
      lines.push('**Financial Summary**\n');
      lines.push(`| | Amount |`);
      lines.push(`|---|---|`);
      lines.push(`| Total Claimed | R ${Number(summary.total_claimed).toLocaleString()} |`);
      lines.push(`| Estimated Fair Value | R ${Number(summary.estimated_fair_value).toLocaleString()} |`);
      lines.push(`| **Potential Savings** | **R ${Number(summary.potential_savings).toLocaleString()}** (${summary.variance_percentage}%) |`);
      lines.push('');
    }

    // Verification notes
    if (notes.length > 0) {
      lines.push('**Key Findings**\n');
      notes.forEach((note: string) => {
        lines.push(`- ${note}`);
      });
    }

    return lines.join('\n');
  };

  return (
    <div className="mt-3 prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-foreground">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed text-sm">{children}</li>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 text-foreground">{children}</h3>,
          hr: () => <hr className="my-3 border-border" />,
          table: ({ children }) => <table className="text-sm w-full my-2">{children}</table>,
          thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
          th: ({ children }) => <th className="text-left text-xs font-medium text-muted-foreground py-1 pr-4">{children}</th>,
          td: ({ children }) => <td className="text-sm py-1 pr-4 text-foreground">{children}</td>,
        }}
      >
        {buildMarkdown()}
      </ReactMarkdown>
    </div>
  );
};
