import { DollarSign, Search, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sectionClass } from "./SharedComponents";

export const PriceBreakdown = ({ priceData, visibleSections, startSelector }: { priceData: any, visibleSections: number, startSelector: number }) => {
  if (!priceData) return null;

  return (
    <div className="space-y-6 mt-8">
      <div className={sectionClass(visibleSections, startSelector)}>
        <div className="p-6 bg-white border border-border rounded-[14px]">
          <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />Market Verification Analysis
          </h4>

          <div className="space-y-6">
            {priceData.items_analysis?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 bg-sidebar rounded-lg border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h5 className="font-semibold text-[#1B1C1F]">Item {item.item_number}: {item.description}</h5>
                    <p className="text-sm text-gray-500">{item.quantity} {item.unit || 'units'} @ R {item.unit_rate || item.unit_price} = R {item.total.toLocaleString()}</p>
                  </div>
                  <Badge className={`${item.market_verification?.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.market_verification?.status?.toUpperCase()}
                  </Badge>
                </div>

                {item.market_verification && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-md border border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Market Benchmarks (ZAR)</p>
                      <div className="flex items-end gap-2">
                        <span className="text-lg font-bold text-primary">R {item.market_verification.market_rate_range.average}</span>
                        <span className="text-[10px] text-gray-400 mb-1">(Range: {item.market_verification.market_rate_range.low} - {item.market_verification.market_rate_range.high})</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 italic">{item.market_verification.market_rate_range.note}</p>
                    </div>
                    <div className="p-3 bg-white rounded-md border border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">AI Assessment</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${item.market_verification.variance_percentage > 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {item.market_verification.variance_percentage}% {item.market_verification.variance_percentage > 0 ? 'Below' : 'Above'} Market
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{item.market_verification.assessment}</p>
                    </div>
                  </div>
                )}

                {item.market_verification?.web_search_result && (
                  <div className="mt-3 p-3 bg-indigo-50/30 rounded-md border border-indigo-100/50">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                      <Search className="h-3 w-3" />Market Context & Intelligence
                    </p>
                    <div className="text-[10px] text-indigo-900 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                      {typeof item.market_verification.web_search_result === 'string'
                        ? item.market_verification.web_search_result
                        : item.market_verification.web_search_result.market_context}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={sectionClass(visibleSections, startSelector + 1)}>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-border rounded-[14px]">
            <h4 className="text-sm font-bold text-[#0E1C2E] mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Verification Summary
            </h4>
            <div className="space-y-3">
              {priceData.overall_assessment?.verification_notes?.map((note: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <Zap className="h-3 w-3 text-primary mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 bg-primary text-white rounded-[14px] shadow-lg shadow-primary/20">
            <h4 className="text-sm font-bold mb-4">Financial Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs opacity-80">
                <span>Total Claimed</span>
                <span>R {priceData.summary?.total_claimed?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-80">
                <span>Fair Value Estimate</span>
                <span>R {priceData.summary?.estimated_fair_value?.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-white/20 flex justify-between items-center font-bold">
                <span>Potential Savings</span>
                <span className="text-lg">R {priceData.summary?.potential_savings?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
