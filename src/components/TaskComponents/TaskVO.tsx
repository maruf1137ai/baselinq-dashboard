import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import CashIcon from "@/components/icons/CashIcon";
import { TrendingUp, Clock, Calculator, AlertTriangle } from "lucide-react";
import { Progress } from "../ui/progress";
import Asterisk from "../icons/Asterisk";

interface TaskVOProps {
  formFields: any;
}

export const TaskVO: React.FC<TaskVOProps> = ({ formFields }) => {
  if (!formFields) return null;

  // Calculate financial totals
  const subtotal =
    formFields.items?.reduce(
      (sum: number, item: any) => sum + item.qty * item.rate,
      0,
    ) || 0;

  const preliminaries = formFields.preliminariesPct
    ? subtotal * (formFields.preliminariesPct / 100)
    : 0;

  const ohp = formFields.ohpPct
    ? (subtotal + preliminaries) * (formFields.ohpPct / 100)
    : 0;

  const total = subtotal + preliminaries + ohp;

  console.log(formFields.description);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Discipline
        </label>
        <p className="text-sm text-[#1B1C1F] mt-1">{formFields.discipline}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
          Description
        </label>
        <p className="text-sm text-[#4B5563] leading-relaxed mt-1 whitespace-pre-wrap">
          {formFields.description}
        </p>
      </div>

      <h2 className="text-base  text-[#0E1C2E] mb-5">Financial Breakdown</h2>
      {/* Stats card */}
      <div className="grid gap-2.5 mt-[27px] md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
          <CardContent className="p-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <CashIcon />
                <p className="text-sm text-gray2 mb-1">Total Value</p>
              </div>
            </div>
            <div className="bg-white py-[6px] px-[14px] rounded-[6px]">
              <div className="">
                <h3 className="text-2xl text-[#0F172A]">R 2500</h3>
                {/* <Progress value={25} className="h-[8px]  my-2.5" />
                <p className="text-xs text-[#717784] ">
                  Below target threshold
                </p> */}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
          <CardContent className="p-2.5  flex-1 flex flex-col ">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <CashIcon />
                <p className="text-sm text-gray2 mb-1">Markups</p>
              </div>
            </div>
            <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
              <h3 className="text-2xl text-[#0F172A]">10% + 7.5%</h3>
              {/* <p className="text-xs text-[#717784] ">
                <span className="text-[#DC2626]">3 overdue</span> / 0 due soon
              </p> */}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
          <CardContent className="p-2.5  flex-1 flex flex-col ">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <CashIcon />
                <p className="text-sm text-gray2 mb-1">Time Impact</p>
              </div>
            </div>
            <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
              <h3 className="text-2xl text-black">+2 days</h3>
              {/* <p className="text-xs text-[#717784] ">High / Medium / Low</p> */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variation Order Table */}
      <div>
        <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-2 block">
          Line Items
        </label>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F9FAFB] border-b">
              <tr>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">
                  Code
                </th>
                <th className="text-left text-xs font-medium text-[#6B7280] px-4 py-2">
                  Description
                </th>
                <th className="text-right text-xs font-medium text-[#6B7280] px-4 py-2">
                  Qty
                </th>
                <th className="text-right text-xs font-medium text-[#6B7280] px-4 py-2">
                  Rate
                </th>
                <th className="text-right text-xs font-medium text-[#6B7280] px-4 py-2">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="text-sm text-[#1B1C1F] px-4 py-3 font-mono">
                  VO-001
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3">
                  Additional excavation work for foundation extension
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  250
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  R 450
                </td>
                <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                  R 112,500
                </td>
              </tr>

              <tr className="border-b">
                <td className="text-sm text-[#1B1C1F] px-4 py-3 font-mono">
                  VO-002
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3">
                  Extra structural steel for roof reinforcement
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  15
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  R 8,500
                </td>
                <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                  R 127,500
                </td>
              </tr>

              <tr className="border-b">
                <td className="text-sm text-[#1B1C1F] px-4 py-3 font-mono">
                  VO-003
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3">
                  Additional electrical conduit installation
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  120
                </td>
                <td className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  R 225
                </td>
                <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                  R 27,000
                </td>
              </tr>

              {/* Subtotal Row */}
              <tr className="bg-[#F9FAFB] font-medium border-t-2">
                <td
                  colSpan={4}
                  className="text-sm text-[#1B1C1F] px-4 py-3 text-right">
                  Subtotal:
                </td>
                <td className="text-sm font-semibold text-[#1B1C1F] px-4 py-3 text-right">
                  R 267,000
                </td>
              </tr>

              {/* Preliminaries Row */}
              <tr className="bg-[#F9FAFB]">
                <td
                  colSpan={4}
                  className="text-sm text-[#4B5563] px-4 py-3 text-right">
                  Preliminaries (10%):
                </td>
                <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                  R 26,700
                </td>
              </tr>

              {/* OH&P Row */}
              <tr className="bg-[#F9FAFB]">
                <td
                  colSpan={4}
                  className="text-sm text-[#4B5563] px-4 py-3 text-right">
                  OH&P (7.5%):
                </td>
                <td className="text-sm font-medium text-[#1B1C1F] px-4 py-3 text-right">
                  R 22,028
                </td>
              </tr>

              {/* Total Row */}
              <tr className="bg-[#1B1C1F] hover:bg-[#1B1C1F] border-t-2">
                <td
                  colSpan={4}
                  className="text-sm font-bold text-white px-4 py-3 text-right">
                  Total Amount:
                </td>
                <td className="text-base font-bold text-white px-4 py-3 text-right">
                  R 315,728
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
