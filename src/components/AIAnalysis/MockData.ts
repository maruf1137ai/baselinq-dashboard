export const MOCK_ANALYSIS_DATA = [{
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
          "assessment": "ℹ\uFE0F Price is 30.0% BELOW South Africa market rate (ZAR 100.00 average). Verify specifications, quality standards, and SANS compliance.",
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
          "assessment": "ℹ\uFE0F Price is 75.2% BELOW South Africa market rate (ZAR 202.00 average). Verify specifications, quality standards, and SANS compliance.",
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
        "ℹ\uFE0F 2 item(s) priced below South Africa market average - verify quality standards, SANS compliance, and specifications meet project requirements",
        "ℹ\uFE0F Prices verified against South Africa construction market standards. Regional variations may apply (Gauteng, Western Cape, KZN, etc.)"
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

export const CPI_MOCK_DATA = [{
  "analysis": {
    "cpi_id": "Foundation Concrete Pour - Block A",
    "contract_id": "doc_1",
    "analysis_timestamp": "2026-02-17T14:04:42.510082",
    "overall_status": "AT_RISK",
    "risk_level": "HIGH",
    "summary": "The mass concrete pour for Block A foundation is a critical path activity with zero float, dependent on weather conditions. Any delay could impact the overall project completion.",
    "cpi_categorization": {
      "activity_type": "Construction",
      "critical_path_status": "On Critical Path",
      "programme_impact_level": "HIGH",
      "float_available": "None",
      "potential_impact": "Delays in this activity could lead to a delay in the overall project completion date."
    },
    "contract_compliance": {
      "programme_requirements": {
        "status": "COMPLIANT",
        "clause_reference": "11.1.1",
        "page_number": "11",
        "clause_text": "Within 14 (fourteen) days of commencement, the Contractor shall submit a detailed programme showing: \u2022 All activities required to complete the Works \u2022 Activity durations and dependencies \u2022 Critical path identification \u2022 Key milestones \u2022 Resource allocation \u2022 Material procurement and delivery schedules \u2022 Subcontractor schedules",
        "finding": "The Contractor has identified and scheduled the critical path activity as required."
      },
      "time_for_completion": {
        "status": "AT_RISK",
        "clause_reference": "3.2",
        "page_number": "3",
        "completion_date": "28 February 2026",
        "clause_text": "The Contractor shall achieve Practical Completion by: 28 February 2026 Total Contract Period: 12 (twelve) months from commencement.",
        "finding": "Given the critical nature and zero float of the activity, any delay could jeopardize the completion date."
      },
      "float_ownership": {
        "owner": "Project",
        "clause_reference": "11.5.1",
        "page_number": "12",
        "clause_text": "Float (slack time) in non-critical activities belongs to the project and may be used by either party.",
        "finding": "The float is owned by the project and not available for this critical path activity."
      },
      "progress_reporting": {
        "status": "COMPLIANT",
        "clause_reference": "11.6.1",
        "page_number": "13",
        "reporting_frequency": "Monthly",
        "clause_text": "Progress meetings shall be held monthly (or as specified) to review: \u2022 Progress against programme \u2022 Critical path status \u2022 Delays and their causes \u2022 Recovery plans \u2022 Look-ahead for the next period \u2022 Resource requirements",
        "finding": "The Contractor is required to report progress monthly, which includes updates on critical path status."
      }
    },
    "extension_of_time_analysis": {
      "eot_entitlement": {
        "entitled": "potential",
        "grounds": "Weather conditions affecting the critical path activity.",
        "clause_reference": "3.4.1",
        "page_number": "3",
        "clause_text": "If the Contractor is delayed by circumstances beyond its reasonable control, including but not limited to: \u2022 Acts or omissions of the Employer or Principal Agent \u2022 Variations instructed under Clause 8 \u2022 Exceptionally adverse weather conditions \u2022 Force majeure events \u2022 Delays in obtaining statutory approvals not caused by the Contractor",
        "finding": "The Contractor may be entitled to an extension of time if the delay is due to adverse weather conditions."
      },
      "notice_requirements": {
        "days_required": 7,
        "notice_deadline": "2025-02-17",
        "clause_reference": "3.4.2",
        "page_number": "4",
        "procedure": "The Contractor shall notify the Principal Agent within 7 (seven) days of the delaying event.",
        "finding": "The Contractor must notify the Principal Agent by 2025-02-17 if there is a delay due to weather."
      },
      "concurrent_delay": {
        "applicable": false,
        "assessment": "Not applicable as no other delays have been reported.",
        "clause_reference": null,
        "page_number": "Not specified"
      },
      "mitigation_obligations": {
        "required": true,
        "obligations": "The Contractor should propose recovery measures to maintain the Completion Date.",
        "clause_reference": "11.3.3",
        "page_number": "12"
      }
    },
    "potential_implications": {
      "liquidated_damages": {
        "exposure": true,
        "daily_rate": "Specified in contract but not provided in the context",
        "assessment": "The Contractor faces potential liquidated damages if the completion date is delayed.",
        "clause_reference": "15.1",
        "page_number": "17"
      },
      "acceleration": {
        "applicable": true,
        "type": "Instructed",
        "assessment": "The Contractor may need to accelerate subsequent activities to recover any lost time.",
        "clause_reference": "11.7.2",
        "page_number": "13"
      },
      "resource_implications": {
        "assessment": "Resource allocation may need adjustment to meet the new schedule demands.",
        "key_resources": [
          "Laborers",
          "Concrete Pump"
        ],
        "constraints": "Availability and scheduling of key resources must be managed carefully."
      },
      "knock_on_effects": {
        "successor_activities_affected": [
          "Formwork Striking"
        ],
        "total_downstream_impact": "Delay in formwork striking and subsequent activities.",
        "assessment": "The delay in concrete pouring could compress the schedule for subsequent activities, increasing the risk of further delays."
      }
    },
    "risk_flags": [
      {
        "severity": "HIGH",
        "category": "Weather",
        "title": "Weather Dependency of Critical Path Activity",
        "description": "The critical path activity of concrete pouring is highly dependent on favorable weather conditions, posing a high risk of delay.",
        "clause_reference": "3.4.1",
        "page_number": "3",
        "recommended_action": "Monitor weather forecasts closely and prepare contingency plans."
      }
    ],
    "contract_citations": [
      {
        "clause_number": "3.4.1",
        "clause_title": "Delays and Extensions of Time",
        "page_number": "3",
        "quoted_text": "If the Contractor is delayed by circumstances beyond its reasonable control, including but not limited to: \u2022 Acts or omissions of the Employer or Principal Agent \u2022 Variations instructed under Clause 8 \u2022 Exceptionally adverse weather conditions \u2022 Force majeure events \u2022 Delays in obtaining statutory approvals not caused by the Contractor",
        "relevance": "This clause is relevant as it outlines the conditions under which the Contractor may claim an extension of time, including weather-related delays."
      }
    ],
    "recommendations": {
      "for_contractor": [
        "Prepare to submit a notice of delay if adverse weather affects the concrete pour."
      ],
      "for_employer": [
        "Review the Contractor's weather contingency plans to ensure they are adequate."
      ],
      "for_project_manager": [
        "Facilitate rapid decision-making if weather delays occur to minimize impact on the schedule."
      ],
      "immediate_actions": [
        {
          "action": "Monitor weather forecasts starting two weeks before the scheduled activity.",
          "deadline": "2025-01-27",
          "responsible_party": "Contractor"
        }
      ]
    },
    "validation": {
      "valid": true,
      "total_citations": 11,
      "invalid_citations": [],
      "validation_errors": [],
      "accuracy_rate": 1
    },
    "retrieved_chunks_count": 50
  },
  "mock_used": false,
  "status": "success"
}]

export const DC_MOCK_DATA = [{
  "analysis": {
    "dc_id": "Concrete delivery delayed by supplier",
    "contract_id": "doc_1",
    "analysis_timestamp": "2026-02-17T14:06:35.343046",
    "overall_status": "PARTIALLY_ENTITLED",
    "risk_level": "MEDIUM",
    "summary": "The delay claim for concrete delivery is partially entitled to an extension of time due to material delay. The claimant must comply with notice requirements and demonstrate that the delay has impacted the critical path to fully justify the extension and associated costs.",
    "delay_cause_analysis": {
      "cause_category_assessment": {
        "category": "Material Delay",
        "contractual_entitlement": "ENTITLED",
        "clause_reference": "3.4.1",
        "page_number": "3",
        "clause_text": "If the Contractor is delayed by circumstances beyond its reasonable control, including but not limited to: \u2022 Acts or omissions of the Employer or Principal Agent \u2022 Variations instructed under Clause 8 \u2022 Exceptionally adverse weather conditions \u2022 Force majeure events \u2022 Delays in obtaining statutory approvals not caused by the Contractor",
        "finding": "The delay caused by the concrete supplier falls under circumstances beyond the Contractor's reasonable control, thus entitling them to consider an extension."
      },
      "employer_risk_event": {
        "is_employer_risk": false,
        "assessment": "This delay is not caused by the Employer or Principal Agent.",
        "clause_reference": null,
        "page_number": "Not specified",
        "clause_text": null,
        "finding": "No employer risk event is applicable as the delay was caused by an external supplier."
      },
      "force_majeure": {
        "applicable": false,
        "assessment": "The situation described does not meet the typical criteria for force majeure.",
        "clause_reference": null,
        "page_number": "Not specified",
        "clause_text": null,
        "finding": "Plant maintenance is generally not considered a force majeure event."
      }
    },
    "extension_of_time": {
      "eot_entitlement": {
        "entitled": "yes",
        "requested_days": 10,
        "assessed_days": "10",
        "grounds": "Delay due to supplier's inability to deliver concrete, impacting the scheduled work on foundations.",
        "clause_reference": "3.4.3",
        "page_number": "4",
        "clause_text": "The Principal Agent may grant a fair and reasonable extension of time.",
        "finding": "The Contractor is entitled to a fair and reasonable extension of time due to supplier delay."
      },
      "notice_requirements": {
        "status": "COMPLIANT",
        "days_required": 7,
        "notice_deadline": "2026-02-23",
        "clause_reference": "3.4.2",
        "page_number": "4",
        "clause_text": "The Contractor shall notify the Principal Agent within 7 (seven) days of the delaying event.",
        "finding": "The Contractor has complied with the notice requirement by submitting the claim on time."
      },
      "concurrent_delay": {
        "applicable": false,
        "assessment": "No evidence of concurrent delay has been provided.",
        "clause_reference": null,
        "page_number": "Not specified",
        "finding": "There is no indication of concurrent delay affecting this claim."
      },
      "mitigation_obligations": {
        "required": true,
        "obligations": "The Contractor should demonstrate efforts to mitigate the impact of the delay, such as sourcing alternative suppliers.",
        "clause_reference": null,
        "page_number": "Not specified",
        "clause_text": null,
        "finding": "Contractor is expected to mitigate the delay as per standard contractual obligations, though specific clauses are not provided."
      }
    },
    "cost_impact_assessment": {
      "cost_entitlement": {
        "entitled": false,
        "estimated_cost_impact": "ZAR 25,000.00",
        "currency": "ZAR",
        "assessment": "The contract does not provide specific provisions for cost compensation due to supplier delays.",
        "clause_reference": null,
        "page_number": "Not specified",
        "clause_text": null,
        "finding": "No entitlement to cost compensation under the provided clauses."
      },
      "liquidated_damages_exposure": {
        "exposure": true,
        "daily_rate": "ZAR 25,000.00",
        "assessment": "Potential exposure to liquidated damages if the delay impacts the completion date.",
        "clause_reference": "15.2",
        "page_number": "17",
        "clause_text": "Rate Liquidated damages shall be: ZAR 25,000.00 per day for each day of delay. Maximum total: 10% of the Contract Price (ZAR 2,850,000.00).",
        "finding": "The Contractor may face liquidated damages if the delay extends beyond the granted EOT."
      },
      "prolongation_costs": {
        "applicable": false,
        "assessment": "No specific clause allows for prolongation costs due to supplier delays.",
        "clause_reference": null,
        "page_number": "Not specified",
        "finding": "Prolongation costs are not applicable under the provided contract clauses."
      }
    },
    "procedural_compliance": {
      "claim_submission": {
        "status": "COMPLIANT",
        "clause_reference": "3.4.2",
        "page_number": "4",
        "clause_text": "The Contractor shall notify the Principal Agent within 7 (seven) days of the delaying event.",
        "finding": "The claim submission complies with the contractual notice requirements."
      },
      "supporting_evidence": {
        "status": "NOT_ASSESSED",
        "required_documentation": "Not specified in provided clauses",
        "clause_reference": null,
        "page_number": "Not specified",
        "finding": "Assessment of supporting evidence is not possible due to lack of specific requirements in the provided clauses."
      },
      "time_bar_provisions": {
        "at_risk": false,
        "deadline": null,
        "clause_reference": null,
        "page_number": "Not specified",
        "clause_text": null,
        "finding": "There is no indication of time-bar provisions affecting this claim under the provided clauses."
      }
    },
    "risk_flags": [
      {
        "severity": "MEDIUM",
        "category": "Notice",
        "title": "Notice Compliance",
        "description": "Ensure all future claims continue to meet the 7-day notice requirement to avoid disputes.",
        "clause_reference": "3.4.2",
        "page_number": "4",
        "recommended_action": "Maintain records of all notices and delays."
      }
    ],
    "contract_citations": [
      {
        "clause_number": "3.4.1",
        "clause_title": "Delays and Extensions of Time",
        "page_number": "3",
        "quoted_text": "If the Contractor is delayed by circumstances beyond its reasonable control, including but not limited to: \u2022 Acts or omissions of the Employer or Principal Agent \u2022 Variations instructed under Clause 8 \u2022 Exceptionally adverse weather conditions \u2022 Force majeure events \u2022 Delays in obtaining statutory approvals not caused by the Contractor",
        "relevance": "This clause is central to establishing the Contractor's entitlement to an extension of time due to the material delay."
      }
    ],
    "recommendations": {
      "for_claimant": [
        "Ensure all future claims are supported with adequate documentation and adhere to notice requirements."
      ],
      "for_employer": [
        "Review supplier management strategies to mitigate risks of material delays."
      ],
      "for_contract_administrator": [
        "Monitor compliance with notice requirements and assess all claims for potential cost impacts."
      ],
      "immediate_actions": [
        {
          "action": "Review and confirm the EOT entitlement based on the detailed impact on the critical path.",
          "deadline": "2023-12-10",
          "responsible_party": "Principal Agent"
        }
      ]
    },
    "validation": {
      "valid": true,
      "total_citations": 7,
      "invalid_citations": [],
      "validation_errors": [],
      "accuracy_rate": 1
    },
    "retrieved_chunks_count": 73
  },
  "mock_used": false,
  "status": "success"
}
]

export const RFI_MOCK_DATA = [
  {
    "analysis": {
      "rfi_id": "RFI-004",
      "contract_id": "doc_1",
      "analysis_timestamp": "2026-02-17T14:27:21.028787",
      "overall_assessment": "ROUTINE",
      "risk_level": "LOW",
      "summary": "The RFI requests confirmation of the minimum fire rating for cable trays in basement electrical rooms. This is a specification query relevant to the electrical discipline.",
      "rfi_categorization": {
        "information_type": "Specification Query",
        "discipline_relevance": "MEP",
        "urgency_level": "NORMAL",
        "potential_impact": "Potential impact includes ensuring compliance with safety standards and specifications."
      },
      "contract_compliance": {
        "information_obligations": {
          "status": "COMPLIANT",
          "clause_reference": "2.2",
          "page_number": "2",
          "clause_text": "Contract Documents The following documents form part of this Contract and shall be read together: 1. This Agreement 2. Special Conditions of Contract (Annexure G) 3. JBCC Principal Building Agreement Edition 6.2 (2018) - General Conditions of Contract 4. Specifications and Technical Requirements (Annexure B) 5. Architectural Drawings A001-A087 and Structural Drawings S001-S034 (List attached as Annexure A) 6. Bill of Quantities (Annexure C) 7. Pricing Schedule (Annexure C) 8. Health and Safety Plan (Annexure E) 9. Quality Assurance Plan (Annexure F) 10. Environmental Management Plan (Annexure H)",
          "finding": "The RFI is compliant as it seeks clarification on specifications included in the contract documents."
        },
        "response_timeline": {
          "status": "PENDING",
          "clause_reference": "10.3.1",
          "page_number": "11",
          "required_days": 7,
          "response_deadline": "2026-02-23T10:04:44.501839+00:00",
          "clause_text": "The Principal Agent shall respond to RFIs within 7 (seven) days of receipt for standard queries.",
          "finding": "The response timeline is pending as the RFI was raised recently. The Principal Agent has until the specified deadline to respond."
        },
        "authority_to_respond": {
          "status": "CLEAR",
          "clause_reference": "7.1",
          "page_number": "7",
          "authorized_party": "Principal Agent",
          "clause_text": "Authority The Principal Agent is authorized to:",
          "finding": "The Principal Agent has clear authority to respond to this RFI."
        },
        "communication_protocol": {
          "status": "COMPLIANT",
          "clause_reference": "6.4",
          "page_number": "7",
          "required_format": "Written format",
          "clause_text": "Instructions and Approvals All instructions shall be issued through the Principal Agent in writing.",
          "finding": "The RFI follows the required communication protocol by being submitted in writing and directed through the Principal Agent."
        }
      },
      "potential_implications": {
        "design_change": {
          "likely": false,
          "assessment": "The query is about confirming existing specifications, not altering design.",
          "clause_reference": null,
          "page_number": null
        },
        "cost_implications": {
          "likely": false,
          "potential_vo_trigger": false,
          "assessment": "No additional costs or variation orders are expected as this is a clarification request.",
          "clause_reference": null,
          "page_number": null
        },
        "programme_impact": {
          "likely": false,
          "critical_path_affected": false,
          "assessment": "The query does not affect the critical path as it is a routine specification confirmation.",
          "clause_reference": null,
          "page_number": null
        },
        "delay_risk": {
          "severity": "LOW",
          "consequences": "Minimal risk of delay as the query is routine and within normal response time.",
          "clause_reference": null,
          "page_number": null
        }
      },
      "risk_flags": [],
      "contract_citations": [
        {
          "clause_number": "10.3.1",
          "clause_title": "Response Time",
          "page_number": "11",
          "quoted_text": "The Principal Agent shall respond to RFIs within 7 (seven) days of receipt for standard queries.",
          "relevance": "This clause is relevant as it dictates the response time for the RFI."
        }
      ],
      "recommendations": {
        "for_responding_party": [
          "Ensure timely response within the 7-day window to avoid any project delays."
        ],
        "for_employer": [],
        "for_contractor": [],
        "immediate_actions": []
      },
      "validation": {
        "valid": true,
        "total_citations": 5,
        "invalid_citations": [],
        "validation_errors": [],
        "accuracy_rate": 1
      },
      "retrieved_chunks_count": 54
    },
    "mock_used": false,
    "status": "success"
  }
]
export const SI_MOCK_DATA = [
  {
    "analysis": {
      "si_id": "SI-001",
      "contract_id": "doc_1",
      "analysis_timestamp": "2026-02-17T14:30:47.782954",
      "overall_status": "COMPLIANT",
      "risk_level": "LOW",
      "summary": "The Site Instruction SI-001 for the installation of additional electrical outlets is compliant with the contract clauses. The Principal Agent has the authority to issue such instructions, and the instruction is within the scope of the contract. There are no immediate safety or quality concerns, and the urgency level is appropriate.",
      "procedural_compliance": {
        "authority_to_issue": {
          "status": "COMPLIANT",
          "clause_reference": "9.1.1",
          "page_number": "Not specified",
          "clause_text": "The Principal Agent may issue Site Instructions (SI) to the Contractor regarding any matter connected with the Works.",
          "finding": "The Principal Agent has the authority to issue the instruction as it pertains to matters connected with the Works."
        },
        "written_form": {
          "status": "COMPLIANT",
          "clause_reference": "9.1.2",
          "page_number": "Not specified",
          "clause_text": "Site Instructions shall be in writing using a standard SI form numbered sequentially (SI-001, SI-002, etc.).",
          "finding": "The Site Instruction was issued in written form and properly numbered, adhering to the requirements."
        },
        "notification_requirements": {
          "status": "COMPLIANT",
          "clause_reference": "9.5",
          "page_number": "Not specified",
          "clause_text": "The Contractor shall maintain a Site Instruction Register recording all instructions received and their status.",
          "finding": "The instruction is expected to be recorded in the Site Instruction Register, complying with notification requirements."
        },
        "urgency_justification": {
          "status": "JUSTIFIED",
          "urgency_level": "Normal",
          "clause_reference": null,
          "page_number": null,
          "clause_text": null,
          "finding": "The urgency level is normal, and no specific urgency justification is required under the provided clauses."
        }
      },
      "scope_assessment": {
        "within_contract_scope": {
          "in_scope": true,
          "assessment": "The instruction is related to electrical works, which are part of the contract scope.",
          "clause_reference": "2.1",
          "page_number": "Not specified",
          "clause_text": "The Contractor shall execute and complete the following works: Project Description: Construction of a three-storey commercial office building including all civil, structural, architectural, electrical, mechanical, plumbing, and fire protection works.",
          "finding": "The installation of additional electrical outlets falls within the electrical works scope described in the contract."
        },
        "vo_implications": {
          "triggers_variation": false,
          "vo_reference": null,
          "assessment": "The instruction does not trigger a variation as it is a minor change not requiring a Variation Order.",
          "clause_reference": "9.2",
          "page_number": "Not specified",
          "clause_text": "Site Instructions may be issued for: Minor changes not requiring a Variation Order.",
          "finding": "This Site Instruction is considered a minor change and does not require a Variation Order."
        },
        "cost_impact_assessment": {
          "has_cost_impact": true,
          "estimated_impact": "Additional costs for materials and labor for installing five power outlets.",
          "clause_reference": "8.4.2",
          "page_number": "Not specified",
          "clause_text": "For new items not in the Bill, fair and reasonable rates shall be agreed between the parties or determined by the Principal Agent.",
          "finding": "Costs associated with this instruction should be determined as per the clause for items not included in the Bill of Quantities."
        }
      },
      "safety_and_quality": {
        "safety_implications": {
          "has_safety_impact": false,
          "assessment": "No significant safety implications are expected from the installation of additional outlets.",
          "clause_reference": null,
          "page_number": null,
          "clause_text": null,
          "finding": "The work is routine and should comply with standard safety protocols."
        },
        "quality_requirements": {
          "has_quality_impact": true,
          "assessment": "Quality control is necessary to ensure the outlets are installed correctly and safely.",
          "clause_reference": "4.3.1",
          "page_number": "Not specified",
          "clause_text": "All materials shall be new, of good quality, and comply with specified standards.",
          "finding": "Materials used must meet the quality standards specified in the contract."
        },
        "inspection_needs": {
          "requires_inspection": true,
          "inspection_type": "Electrical installation inspection",
          "clause_reference": "4.3.2",
          "page_number": "Not specified",
          "clause_text": "Materials and workmanship shall be subject to inspection and testing by the Principal Agent.",
          "finding": "The installation of the outlets must be inspected to ensure compliance with contract standards."
        }
      },
      "time_impact": {
        "programme_effect": {
          "affects_programme": false,
          "critical_path_affected": false,
          "assessment": "The installation of additional outlets is unlikely to affect the overall project timeline significantly.",
          "clause_reference": null,
          "page_number": null,
          "clause_text": null,
          "finding": "This task should not impact the critical path or overall project schedule."
        },
        "urgency_assessment": {
          "urgency_appropriate": true,
          "assessment": "The normal urgency level is appropriate given the nature of the work.",
          "finding": "The urgency level matches the task's requirements."
        },
        "due_date_compliance": {
          "achievable": true,
          "due_date": "2026-02-28",
          "assessment": "The due date provides sufficient time for the installation of the outlets.",
          "finding": "The due date is reasonable and achievable."
        }
      },
      "risk_flags": [
        {
          "severity": "LOW",
          "category": "Cost",
          "title": "Cost Impact Assessment",
          "description": "Potential additional costs due to the installation of five additional power outlets. It is crucial to agree on fair and reasonable rates for these new items.",
          "clause_reference": "8.4.2",
          "page_number": "Not specified",
          "recommended_action": "Agree on costs as soon as possible to avoid disputes."
        }
      ],
      "contract_citations": [
        {
          "clause_number": "9.1.1",
          "clause_title": "Authority to Issue Instructions",
          "page_number": "Not specified",
          "quoted_text": "The Principal Agent may issue Site Instructions (SI) to the Contractor regarding any matter connected with the Works.",
          "relevance": "This clause confirms the Principal Agent's authority to issue the Site Instruction in question."
        }
      ],
      "recommendations": {
        "for_employer": [
          "Review the agreed costs for the additional outlets to ensure they are within reasonable limits."
        ],
        "for_contractor": [
          "Ensure that all materials used are of good quality and comply with specified standards, and prepare for the required inspections."
        ],
        "for_site_manager": [
          "Monitor the installation process to ensure compliance with safety and quality standards."
        ],
        "immediate_actions": [
          {
            "action": "Agree on additional costs for the installation of the outlets.",
            "deadline": "2026-02-20",
            "responsible_party": "Contractor"
          }
        ]
      },
      "validation": {
        "valid": true,
        "total_citations": 4,
        "invalid_citations": [],
        "validation_errors": [],
        "accuracy_rate": 1
      },
      "retrieved_chunks_count": 38
    },
    "mock_used": false,
    "status": "success"
  }
]
