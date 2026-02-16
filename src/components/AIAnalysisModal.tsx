import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Scale,
  BookOpen,
  Lightbulb,
  DollarSign,
  TrendingUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProceduralComplianceItem {
  status: string;
  clause_reference: string;
  finding: string;
  required_days?: number;
  actual_days?: number;
}

interface AnalysisData {
  vo_id: string;
  contract_id: string;
  analysis_timestamp: string;
  overall_status: string;
  risk_level: string;
  summary: string;
  procedural_compliance: Record<string, ProceduralComplianceItem>;
  valuation_assessment: {
    applicable_method: {
      method: string;
      clause_reference: string;
      finding: string;
    };
    rate_analysis: {
      rates_compliant: boolean;
      variance_percentage: number;
      finding: string;
    };
    new_rates_permitted?: boolean;
    threshold_triggered?: boolean;
  };
  time_impact: {
    critical_path_affected: boolean;
    days_claimed: number;
    days_assessment: string;
    notice_requirement: {
      days_required: number;
      compliant: boolean;
      clause_reference: string;
    };
    eot_entitlement?: string;
    float_provisions?: string;
  };
  risk_flags: string[] | {
    title: string;
    severity: string;
    description: string;
    clause_reference: string;
    recommended_action: string;
  }[];
  contract_citations: {
    clause_number: string;
    clause_title: string;
    quoted_text: string;
    relevance: string;
  }[];
  recommendations: {
    for_employer: string[];
    for_contractor: string[];
    immediate_actions: (string | {
      action: string;
      deadline: string;
      responsible_party: string;
    })[];
  };
  price_breakdown?: {
    items_analysis: {
      item_number: string | number;
      description: string;
      quantity: number;
      unit?: string;
      unit_price?: number;
      unit_rate?: number; // Added from mock
      total: number;
      market_verification: {
        market_rate_range: {
          low: number;
          high: number;
          average: number;
          note?: string;
          source?: string;
        };
        variance_percentage: number;
        fair_value_estimate: number;
        assessment: string;
        web_search_result: string | {
          sources_checked: string[];
          market_context: string;
          confidence_level: string;
        };
        sources?: string[];
        data_quality?: string;
        confidence_note?: string;
        potential_adjustment?: number;
        status?: string;
      };
    }[];
    overall_assessment: {
      items_verified: number;
      items_above_market: number;
      items_within_market: number;
      items_below_market: number;
    };
    summary: {
      total_claimed: number;
      estimated_fair_value: number;
      potential_savings: number;
    };
  };
  processing_time_seconds: number;
}

interface AIAnalysisResponse {
  analysis?: AnalysisData;
  price_breakdown?: AnalysisData['price_breakdown'];
  mock_used?: boolean;
  status?: string;
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  analysisData: AnalysisData | AIAnalysisResponse | null;
}

const MOCK_ANALYSIS_DATA = [{
  "analysis": {
    "vo_id": "VO-001",
    "contract_id": "doc_2",
    "analysis_timestamp": "2026-02-05T10:30:11.477253",
    "overall_status": "COMPLIANT",
    "risk_level": "LOW",
    "summary": "The Variation Order VO-001 is compliant with the contract clauses. It is properly issued, includes all required details, and follows the prescribed valuation methods. There are no significant risks or compliance issues identified.",
    "procedural_compliance": {
      "authorized_issuer": {
        "status": "COMPLIANT",
        "clause_reference": "Clause 8.1.1",
        "page_number": "8",
        "clause_text": "The Principal Agent may instruct variations to the Works by issuing a written Variation Order (VO).",
        "finding": "The VO was issued by the Principal Agent as required."
      },
      "written_form": {
        "status": "COMPLIANT",
        "clause_reference": "Clause 8.2.1",
        "page_number": "8",
        "clause_text": "The Principal Agent shall issue Variation Orders using a standard VO form numbered sequentially (VO-001, VO-002, etc.).",
        "finding": "The VO is properly numbered and formatted as per the contract requirements."
      },
      "notification_timeline": {
        "status": "COMPLIANT",
        "clause_reference": "No specific timeline clause provided",
        "page_number": "N/A",
        "required_days": null,
        "actual_days": null,
        "deadline_date": null,
        "clause_text": "No specific timeline clause provided",
        "finding": "No specific timeline for issuing VOs is mentioned in the provided clauses."
      },
      "required_approvals": {
        "status": "COMPLIANT",
        "clause_reference": "No specific approval clause provided",
        "page_number": "N/A",
        "clause_text": "No specific approval clause provided",
        "finding": "No additional approvals beyond the Principal Agent's issuance are specified in the provided clauses."
      }
    },
    "valuation_assessment": {
      "applicable_method": {
        "method": "BoQ rates",
        "clause_reference": "Clause 8.4.1",
        "page_number": "8",
        "clause_text": "Variations shall be valued using Bill of Quantities rates where applicable.",
        "finding": "The VO uses rates that should be verified against the Bill of Quantities to ensure compliance."
      },
      "rate_analysis": {
        "rates_compliant": true,
        "variance_percentage": 0,
        "finding": "Assuming the rates for cement and bricks are from the BoQ, they are compliant. Verification needed."
      },
      "new_rates_permitted": {
        "permitted": true,
        "conditions": "Rates not in the Bill of Quantities should be fair and reasonable, agreed between the parties or determined by the Principal Agent.",
        "clause_reference": "Clause 8.4.2",
        "page_number": "8"
      },
      "threshold_triggered": {
        "triggered": false,
        "threshold_details": null,
        "clause_reference": null,
        "page_number": null
      }
    },
    "time_impact": {
      "critical_path_affected": false,
      "days_claimed": 0,
      "days_assessment": "No delay claimed in the VO.",
      "eot_entitlement": {
        "entitled": false,
        "clause_reference": "No specific EOT clause provided",
        "page_number": "N/A",
        "clause_text": "No specific EOT clause provided",
        "conditions": "No conditions for EOT are specified in the provided clauses."
      },
      "notice_requirement": {
        "days_required": null,
        "deadline": null,
        "compliant": null,
        "clause_reference": "No specific notice requirement clause provided",
        "page_number": "N/A"
      },
      "float_provisions": {
        "clause_reference": "No specific float provisions clause provided",
        "page_number": "N/A",
        "float_ownership": "No specific float ownership details provided",
        "implications": "No implications identified due to lack of specific float provisions."
      }
    },
    "risk_flags": [],
    "contract_citations": [
      {
        "clause_number": "8.1.1",
        "clause_title": "Variation Order Process",
        "page_number": "8",
        "quoted_text": "The Principal Agent may instruct variations to the Works by issuing a written Variation Order (VO).",
        "relevance": "This clause authorizes the issuance of the VO."
      },
      {
        "clause_number": "8.4.1",
        "clause_title": "Valuation of Variations",
        "page_number": "8",
        "quoted_text": "Variations shall be valued using Bill of Quantities rates where applicable.",
        "relevance": "This clause dictates the valuation method for the VO."
      }
    ],
    "recommendations": {
      "for_employer": [
        "Verify that the rates used in the VO are consistent with the Bill of Quantities."
      ],
      "for_contractor": [
        "Ensure all documentation and justifications for the rates used are readily available for audit."
      ],
      "immediate_actions": [
        {
          "action": "Verify rates against Bill of Quantities.",
          "deadline": "Within 5 business days",
          "responsible_party": "Contractor's Quantity Surveyor"
        }
      ]
    },
    "retrieved_chunks_count": 7,
    "llm_model": "gpt-4-turbo",
    "processing_time_seconds": 22.683649
  },
  "price_breakdown": {
    "currency": "ZAR",
    "region": "South Africa",
    "market_context": "South Africa construction market rates",
    "total_items": 2,
    "items_analysis": [
      {
        "item_number": 1,
        "description": "Cement",
        "quantity": 100.0,
        "unit_rate": 70.0,
        "total": 7000.0,
        "market_verification": {
          "status": "verified",
          "data_quality": "high",
          "confidence_note": "Real SA market data",
          "market_rate_range": {
            "low": 85.0,
            "high": 120.0,
            "average": 100.0,
            "note": "Based on real South Africa market data from suppliers and industry sources",
            "source": "web_search"
          },
          "variance_percentage": 30.0,
          "fair_value_estimate": 7000.0,
          "potential_adjustment": 0.0,
          "assessment": "ℹ️ Price is 30.0% BELOW South Africa market rate (ZAR 100.00 average). Verify specifications, quality standards, and SANS compliance.",
          "web_search_result": "1. **Current South African Market Price Range (ZAR)**:\n   - Low end price: ZAR 85 (budget/economy grade)\n   - Average/typical price: ZAR 100 (standard grade)\n   - High end price: ZAR 120 (premium grade)\n\n2. **South African Market Context**:\n   - **Typical Suppliers**: Major suppliers of cement in South Africa include Builders Warehouse, Cashbuild, and local suppliers like Afrisam and PPC Cement. For instance, Builders Warehouse typically offers a 50kg bag of PPC Surebuild Cement at around ZAR 100, while Cashbuild might offer a similar grade for a comparable price.\n   - **Regional Price Variations**: Prices can vary slightly between regions due to transportation costs and local demand. For example, prices in Gauteng might be slightly lower due to its industrial base and better logistics infrastructure compared to rural areas or provinces like the Northern Cape.\n   - **Recent Price Trends**: There has been a moderate increase in cement prices due to rising energy costs and inflationary pressures. The trend suggests a steady rise in prices moving into 2024-2026.\n\n3. **Pricing Factors Specific to South Africa**:\n   - **Local Supply Chain Considerations**: South Africa's cement industry is influenced by local manufacturing capacity and logistical capabilities. Proximity to manufacturing plants can reduce costs.\n   - **Economic Factors**: Factors such as load shedding impact the operational efficiency of cement plants, increasing production costs. Additionally, fluctuations in fuel prices affect transportation costs, directly impacting the final retail price of cement.\n\n4. **Industry Standards**:\n   - The prices mentioned align with the general guidelines and expectations set by the ASAQS and JBCC, which provide benchmarks for construction costs and help in maintaining standard pricing across the industry. These standards ensure that the pricing is fair and reflective of the current market conditions, taking into account material quality and supply chain factors.\n\nThese prices and factors provide a comprehensive overview of the cement market in South Africa as of 2024-2026, reflecting both current economic conditions and industry standards.",
          "sources": [
            "AI-powered South Africa market analysis"
          ]
        }
      },
      {
        "item_number": 2,
        "description": "Bricks",
        "quantity": 1000.0,
        "unit_rate": 50.0,
        "total": 50000.0,
        "market_verification": {
          "status": "verified",
          "data_quality": "high",
          "confidence_note": "Real SA market data",
          "market_rate_range": {
            "low": 171.7,
            "high": 232.29999999999998,
            "average": 202.0,
            "note": "Based on real South Africa market data from suppliers and industry sources",
            "source": "web_search"
          },
          "variance_percentage": 75.25,
          "fair_value_estimate": 50000.0,
          "potential_adjustment": 0.0,
          "assessment": "ℹ️ Price is 75.2% BELOW South Africa market rate (ZAR 202.00 average). Verify specifications, quality standards, and SANS compliance.",
          "web_search_result": "1. **Current South African Market Price Range (ZAR)**:\n   - Low end price: ZAR 1.50 per brick (budget/economy grade)\n   - Average/typical price: ZAR 2.20 per brick (standard grade)\n   - High end price: ZAR 3.00 per brick (premium grade)\n\n2. **South African Market Context**:\n   - **Typical Suppliers**: Major suppliers include Builders Warehouse, Cashbuild, and local brick manufacturers. For instance, Builders Warehouse might offer standard clay bricks at around ZAR 2.20 each, while Cashbuild could have similar pricing but occasionally offers bulk discounts which might reduce the price slightly.\n   - **Regional Price Variations**: Prices can vary slightly between regions due to transportation costs and local availability. For example, prices in Gauteng might be slightly lower due to the higher concentration of suppliers and manufacturers, whereas in more remote areas like the Northern Cape, prices could be higher.\n   - **Recent Price Trends**: There has been a gradual increase in brick prices due to rising raw material costs and energy prices. The trend suggests a steady rise of approximately 5-7% annually over the past few years.\n\n3. **Pricing Factors Specific to South Africa**:\n   - **Local Supply Chain Considerations**: The availability of raw materials locally helps in keeping the costs lower than they might be if a significant amount of importing was necessary. However, disruptions in local manufacturing due to power outages (load shedding) can affect production and supply, leading to price fluctuations.\n   - **Economic Factors**: Load shedding impacts the operational hours of brick kilns, which can reduce output and increase prices. Additionally, fuel cost increases affect transportation costs, directly impacting the price of bricks, especially in regions farther from manufacturing sites.\n\n4. **Industry Standards**:\n   - The ASAQS and JBCC do not typically set specific rates for materials like bricks but provide guidelines and standards for cost management and contract administration in construction projects. Contractors and quantity surveyors would need to keep updated with current market prices and adjust their cost estimates and project budgets accordingly.\n\nThese prices and factors are based on the current market conditions and trends observed in the South African construction industry as of 2024-2026.",
          "sources": [
            "AI-powered South Africa market analysis"
          ]
        }
      }
    ],
    "overall_assessment": {
      "items_verified": 2,
      "items_above_market": 0,
      "items_within_market": 0,
      "items_below_market": 2,
      "items_failed_verification": 0,
      "verification_notes": [
        "ℹ️ 2 item(s) priced below South Africa market average - verify quality standards, SANS compliance, and specifications meet project requirements",
        "ℹ️ Prices verified against South Africa construction market standards. Regional variations may apply (Gauteng, Western Cape, KZN, etc.)"
      ]
    },
    "summary": {
      "total_claimed": 57000.0,
      "estimated_fair_value": 57000.0,
      "potential_savings": 0.0,
      "variance_percentage": 0.0
    }
  },
  "mock_used": false,
  "status": "success"
}]

export function AIAnalysisModal({
  // isOpen,
  onOpenChange,
  isLoading,
  analysisData,
}: AIAnalysisModalProps) {
  const [visibleSections, setVisibleSections] = useState<number>(0);
  const totalSections = 9; // Status, Summary, Procedural, Valuation, Time, Price Breakdown, Citations, Recommendations, Risk Flags
  const [isOpen, setIsOpen] = useState(false);

  // Reset and start streaming when loading completes and data is available
  useEffect(() => {
    if (!isLoading && isOpen && analysisData) {
      setVisibleSections(0);
      const interval = setInterval(() => {
        setVisibleSections((prev) => {
          if (prev >= totalSections) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 300); // Show each section 300ms apart

      return () => clearInterval(interval);
    }
  }, [isLoading, isOpen, analysisData]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setVisibleSections(0);
    }
  }, [isOpen]);

  // Destructure nested structure from API response, fallback to mock data
  const resolvedData = analysisData || MOCK_ANALYSIS_DATA[0];
  const data = (resolvedData && 'analysis' in resolvedData) ? {
    ...(resolvedData as AIAnalysisResponse).analysis,
    price_breakdown: (resolvedData as AIAnalysisResponse).price_breakdown
  } : resolvedData as AnalysisData;

  const sectionClass = (index: number) =>
    cn(
      "transition-all duration-500 ease-out",
      visibleSections > index
        ? "opacity-100 translate-y-0"
        : "opacity-100 translate-y-4"
    );

  if (!data && !isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-[#1B1C1F]">
            <Zap className="h-5 w-5 text-primary" />
            AI Contract Analysis
          </DialogTitle>
          <DialogDescription className="text-sm text-[#6B7280]">
            Intelligent compliance analysis {data?.vo_id ? `for ${data.vo_id}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="ai-orb-loader">
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Header - Section 0 */}
              <div className={sectionClass(0)}>
                <div className={`flex items-center justify-between p-4 rounded-lg border ${data.overall_status === "COMPLIANT"
                  ? "bg-green-50 border-green-200"
                  : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${data.overall_status === "COMPLIANT"
                      ? "bg-green_light/50"
                      : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                        ? "bg-orenge_light/50"
                        : "bg-red_light/50"
                      }`}>
                      {data.overall_status === "COMPLIANT" ? (
                        <CheckCircle2 className="h-6 w-6 text-green_dark" />
                      ) : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING" ? (
                        <AlertTriangle className="h-6 w-6 text-warning" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wide ${data.overall_status === "COMPLIANT"
                        ? "text-green-800"
                        : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                          ? "text-yellow-800"
                          : "text-red-800"
                        }`}>
                        Overall Status
                      </p>
                      <p className={`text-xl font-semibold ${data.overall_status === "COMPLIANT"
                        ? "text-green_dark"
                        : data.overall_status === "REVIEW_REQUIRED" || data.overall_status === "WARNING"
                          ? "text-warning"
                          : "text-destructive"
                        }`}>
                        {data.overall_status?.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={`${data.risk_level === "LOW"
                        ? "bg-green_light text-green-800 border-green-300"
                        : data.risk_level === "MEDIUM"
                          ? "bg-orenge_light text-orange-800 border-orenge_light"
                          : "bg-red_light text-red-800 border-red_light"
                        }`}
                    >
                      {data.risk_level} RISK
                    </Badge>
                    {data.processing_time_seconds && (
                      <p className="text-xs text-[#6B7280] mt-1">
                        Analyzed in {data.processing_time_seconds?.toFixed(1)}s
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary - Section 1 */}
              <div className={sectionClass(1)}>
                <div className="p-6 bg-sidebar rounded-[14px]">
                  <h4 className="text-base text-[#0E1C2E] mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Summary
                  </h4>
                  <p className="text-sm text-[#4B5563] leading-relaxed">
                    {data.summary}
                  </p>
                </div>
              </div>

              {/* Procedural Compliance - Section 2 */}
              {data.procedural_compliance && (
                <div className={sectionClass(2)}>
                  <div className="p-6 bg-white border border-border rounded-[14px]">
                    <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Procedural Compliance
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(data.procedural_compliance).map(
                        ([key, value]: [string, any]) => (
                          <div key={key} className="p-4 bg-sidebar rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                                {key.replace(/_/g, " ")}
                              </span>
                              <div className="flex items-center gap-1">
                                {value.status === "COMPLIANT" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green_dark" />
                                ) : value.status === "WARNING" ? (
                                  <AlertTriangle className="h-4 w-4 text-warning" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span
                                  className={`text-xs font-medium ${value.status === "COMPLIANT" ? "text-green_dark" : value.status === "WARNING" ? "text-warning" : "text-destructive"}`}
                                >
                                  {value.status?.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-[#6B7280] mb-1">
                              {value.clause_reference}
                            </p>
                            {value.clause_text && (
                              <p className="text-xs text-[#6B7280] italic mt-1 mb-2 line-clamp-2">
                                "{value.clause_text}"
                              </p>
                            )}
                            <p className="text-sm text-[#4B5563] mt-1 line-clamp-3">
                              {value.finding}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Valuation Assessment - Section 3 */}
              {data.valuation_assessment && (
                <div className={sectionClass(3)}>
                  <div className="p-6 bg-white border border-border rounded-[14px]">
                    <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-primary" />
                      Valuation Assessment
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-sidebar rounded-lg">
                        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">
                          Method
                        </p>
                        <p className="text-sm font-medium text-[#1B1C1F]">
                          {data.valuation_assessment.applicable_method?.method}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {data.valuation_assessment.applicable_method?.clause_reference}
                        </p>
                      </div>
                      <div className="p-4 bg-sidebar rounded-lg">
                        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2">
                          Rate Analysis
                        </p>
                        <div className="flex items-center gap-2">
                          {data.valuation_assessment.rate_analysis?.rates_compliant ? (
                            <CheckCircle2 className="h-4 w-4 text-green_dark" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-sm text-[#1B1C1F]">
                            {data.valuation_assessment.rate_analysis?.rates_compliant
                              ? "Rates Compliant"
                              : "Rates Non-Compliant"}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mt-1">
                          Variance: {data.valuation_assessment.rate_analysis?.variance_percentage ?? 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Impact - Section 4 */}
              {data.time_impact && (
                <div className={sectionClass(4)}>
                  <div className="p-6 bg-white border border-border rounded-[14px]">
                    <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Time Impact
                    </h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-sidebar rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-primary" />
                          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Days Claimed</p>
                        </div>
                        <p className="text-2xl font-bold text-[#1B1C1F]">
                          {data.time_impact.days_claimed ?? 0}
                        </p>
                      </div>
                      <div className="p-4 bg-sidebar rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {data.time_impact.critical_path_affected ? (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green_dark" />
                          )}
                          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Critical Path</p>
                        </div>
                        <p className="text-sm text-[#1B1C1F] font-medium mt-1">
                          {data.time_impact.critical_path_affected
                            ? "Affected"
                            : "Not Affected"}
                        </p>
                      </div>
                      <div className="p-4 bg-sidebar rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {data.time_impact.notice_requirement?.compliant ? (
                            <CheckCircle2 className="h-4 w-4 text-green_dark" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Notice</p>
                        </div>
                        <p className="text-sm text-[#1B1C1F] font-medium mt-1">
                          {data.time_impact.notice_requirement?.days_required ?? 0}{" "}
                          days req.
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-[#4B5563]">
                      {data.time_impact.days_assessment}
                    </p>
                  </div>
                </div>
              )}

              {/* Price Breakdown - Section 5 */}
              {data?.price_breakdown && (
                <div className={sectionClass(5)}>
                  <div className="p-6 bg-white border border-border rounded-[14px]">
                    <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Price Breakdown & Market Verification
                    </h4>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Total Claimed</p>
                        <p className="text-2xl font-bold text-blue-900">
                          R {data.price_breakdown.summary?.total_claimed?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Fair Value</p>
                        <p className="text-2xl font-bold text-green-900">
                          R {data.price_breakdown.summary?.estimated_fair_value?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Potential Savings</p>
                        <p className="text-2xl font-bold text-amber-900">
                          R {data.price_breakdown.summary?.potential_savings?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>

                    {/* Overall Assessment */}
                    {data.price_breakdown.overall_assessment && (
                      <div className="mb-6 p-4 bg-sidebar rounded-lg">
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green_dark" />
                            <span className="text-[#4B5563]">
                              {data.price_breakdown.overall_assessment.items_verified} verified
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-destructive" />
                            <span className="text-[#4B5563]">
                              {data.price_breakdown.overall_assessment.items_above_market} above market
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            <span className="text-[#4B5563]">
                              {data.price_breakdown.overall_assessment.items_within_market} within market
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green_dark rotate-180" />
                            <span className="text-[#4B5563]">
                              {data.price_breakdown.overall_assessment.items_below_market} below market
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items Analysis */}
                    <div className="space-y-4">
                      {data.price_breakdown.items_analysis?.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 bg-sidebar rounded-[10px] border border-border"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant="outline" className="text-xs border-border text-[#6B7280]">
                                  {item.item_number}
                                </Badge>
                                <span className="text-sm font-medium text-[#1B1C1F]">
                                  {item.description}
                                </span>
                              </div>
                              <div className="flex items-center gap-6 text-xs text-[#6B7280]">
                                <span>Qty: {item.quantity} {item.unit}</span>
                                <span>Unit Price: R {(item.unit_price || item.unit_rate)?.toLocaleString()}</span>
                                <span className="font-medium text-[#1B1C1F]">Total: R {item.total?.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Market Verification */}
                          {item.market_verification && (
                            <div className="mt-3 p-3 bg-white rounded border border-indigo-100">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Search className="h-3 w-3 text-primary" />
                                    <span className="text-xs font-medium text-primary uppercase tracking-wide">
                                      Market Verification
                                    </span>
                                    <Badge className="text-xs bg-indigo-50 text-primary border-indigo-200">
                                      {typeof item.market_verification.web_search_result === 'object'
                                        ? item.market_verification.web_search_result.confidence_level
                                        : item.market_verification.data_quality || "N/A"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-[#4B5563] mb-3">
                                    {item.market_verification.assessment}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">Market Range</p>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-[#1B1C1F]">
                                      R {item.market_verification.market_rate_range?.low?.toLocaleString()} -
                                      R {item.market_verification.market_rate_range?.high?.toLocaleString()}
                                    </span>
                                    <span className="text-[#6B7280] text-xs">
                                      (avg: R {item.market_verification.market_rate_range?.average?.toLocaleString()})
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">Variance & Fair Value</p>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className={`font-medium ${item.market_verification.variance_percentage > 10
                                      ? "text-destructive"
                                      : item.market_verification.variance_percentage < -10
                                        ? "text-green_dark"
                                        : "text-blue-600"
                                      }`}>
                                      {item.market_verification.variance_percentage > 0 ? "+" : ""}
                                      {item.market_verification.variance_percentage}%
                                    </span>
                                    <span className="text-[#1B1C1F]">
                                      FV: R {item.market_verification.fair_value_estimate?.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Web Search Context */}
                              {item.market_verification.web_search_result && (
                                <div className="mt-3 pt-3 border-t border-indigo-100">
                                  <p className="text-xs text-[#6B7280] mb-2 whitespace-pre-wrap">
                                    {typeof item.market_verification.web_search_result === 'string'
                                      ? item.market_verification.web_search_result
                                      : item.market_verification.web_search_result.market_context}
                                  </p>
                                  {(item.market_verification.sources || (typeof item.market_verification.web_search_result === 'object' && item.market_verification.web_search_result.sources_checked)) && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-medium text-[#6B7280]">Sources:</span>
                                      {(item.market_verification.sources || (item.market_verification.web_search_result as any).sources_checked).map(
                                        (source: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="text-xs text-[#6B7280] border-border bg-gray-50">
                                            {source}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Contract Citations - Section 6 */}
              {data.contract_citations && data.contract_citations.length > 0 && (
                <div className={sectionClass(6)}>
                  <div className="p-6 bg-white border border-border rounded-[14px]">
                    <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Contract Citations
                    </h4>
                    <div className="space-y-3">
                      {data.contract_citations.map((citation: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 bg-sidebar rounded-[10px] border-l-4 border-primary"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-xs border-border text-[#6B7280]">
                              {citation.clause_number}
                            </Badge>
                            <span className="text-sm font-medium text-[#1B1C1F]">
                              {citation.clause_title}
                            </span>
                          </div>
                          <p className="text-sm text-[#4B5563] italic mb-2">
                            "{citation.quoted_text}"
                          </p>
                          <p className="text-xs text-[#6B7280]">{citation.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations - Section 7 */}
              {data.recommendations && (
                <div className={sectionClass(7)}>
                  <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-[14px] border border-indigo-200">
                    <h4 className="text-base text-[#0E1C2E] mb-5 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Recommendations
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      {data.recommendations.for_employer && data.recommendations.for_employer.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide mb-3">
                            For Employer
                          </p>
                          <ul className="space-y-2">
                            {data.recommendations.for_employer.map(
                              (rec: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm text-[#4B5563] flex items-start gap-2"
                                >
                                  <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                                  {rec}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {data.recommendations.for_contractor && data.recommendations.for_contractor.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-3">
                            For Contractor
                          </p>
                          <ul className="space-y-2">
                            {data.recommendations.for_contractor.map(
                              (rec: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm text-[#4B5563] flex items-start gap-2"
                                >
                                  <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                                  {rec}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    {/* Immediate Actions */}
                    {data.recommendations.immediate_actions && data.recommendations.immediate_actions.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-indigo-200">
                        <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-3">
                          Immediate Actions Required
                        </p>
                        <div className="space-y-3">
                          {data.recommendations.immediate_actions.map(
                            (action: any, index: number) => (
                              <div key={index} className="p-3 bg-white rounded border border-red-200">
                                <p className="text-sm text-[#1B1C1F] font-medium">
                                  {typeof action === 'string' ? action : action.action}
                                </p>
                                {typeof action === 'object' && (
                                  <div className="flex gap-4 mt-2">
                                    {action.deadline && (
                                      <span className="text-xs text-[#6B7280]">
                                        Deadline: <span className="text-destructive font-medium">{action.deadline}</span>
                                      </span>
                                    )}
                                    {action.responsible_party && (
                                      <span className="text-xs text-[#6B7280]">
                                        Responsible: <span className="font-medium text-[#1B1C1F]">{action.responsible_party}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Flags - Section 8 */}
              {data.risk_flags && data.risk_flags.length > 0 && (
                <div className={sectionClass(8)}>
                  <div className="p-6 bg-red-50 rounded-[14px] border border-red-200">
                    <h4 className="text-base text-red-900 mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Risk Flags
                    </h4>
                    <div className="space-y-4">
                      {data.risk_flags.map((flag: any, index: number) => (
                        <div key={index} className="p-4 bg-white rounded-[10px] border border-red-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#1B1C1F]">
                              {typeof flag === 'string' ? flag : flag.title}
                            </span>
                            {typeof flag === 'object' && flag.severity && (
                              <Badge className={`text-xs ${flag.severity === 'HIGH'
                                ? 'bg-red_light text-red-700 border-red_light'
                                : flag.severity === 'MEDIUM'
                                  ? 'bg-orenge_light text-orange-700 border-orenge_light'
                                  : 'bg-green_light text-green-700 border-green_light'
                                }`}>
                                {flag.severity}
                              </Badge>
                            )}
                          </div>
                          {typeof flag === 'object' && (
                            <>
                              {flag.description && (
                                <p className="text-sm text-[#4B5563] mb-2">{flag.description}</p>
                              )}
                              {flag.clause_reference && (
                                <p className="text-xs text-[#6B7280] mb-2">
                                  Reference: {flag.clause_reference}
                                </p>
                              )}
                              {flag.recommended_action && (
                                <p className="text-xs text-destructive font-medium uppercase tracking-wide">
                                  Action: {flag.recommended_action}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
