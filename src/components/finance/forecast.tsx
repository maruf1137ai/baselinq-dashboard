import React from 'react';
import { ProjectStatusCard } from '../ProjectStatusCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionItem } from '@/components/ActionItem';
import { CHART_DATA, ChartRow } from './data';
import { BillingLadgerDialog } from './billingLadgerPopup';
import CashIcon from '../icons/CashIcon';
import Calander2 from '../icons/Calander2';
import Shield from '../icons/Shield';
import Asterisk from '../icons/Asterisk';

const SummaryRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor = 'text-[#6B7280]' }) => (
  <div className="flex justify-between items-center py-2 text-[#6B7280]">
    <span className="text-base text-[#6B7280]">{label}</span>
    <span className={`text-base ${valueColor}`}>{value}</span>
  </div>
);

const ChartItem: React.FC<{ item: ChartRow }> = ({ item }) => (
  <div className="flex items-center justify-between gap-4 md:gap-6">
    <div className="text-sm font-medium text-gray-500 w-10 text-right">{item.month}</div>
    <div className="flex flex-col justify-between gap-1 w-full">
      {item.bars.map((bar, index) => (
        <div key={index} className="w-full h-2.5 bg-gray-100 rounded-full">
          <div className={`${bar.color} ${bar.width} h-full rounded-full`}></div>
        </div>
      ))}
    </div>
    <div className="text-sm font-semibold text-gray-800 w-16 text-left whitespace-nowrap">{item.value}</div>
  </div>
);

const Forecast = () => {
  return (
    <div className="p-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <ProjectStatusCard icon={<CashIcon />} title="Baseline Contract" value="85%" badgeText="Original Value" badgeVariant="success" />
        <ProjectStatusCard icon={<Calander2 />} title="Forecast at Completion" value="R 15.4 M" />
        <ProjectStatusCard icon={<Shield />} title="Variance " value="+2.6%" badgeText="Over budget" badgeVariant="destructive" />
        <ProjectStatusCard
          icon={<Asterisk />}
          title="Certified to Date"
          value="R 2.3 M"
          badgeText="15.4% of baseline"
          badgeVariant="success"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mt-6">
        <div className="col-span-2">
          <Card className="">
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <img src="/images/time-quarter-pass.png" alt="" className="h-4 w-4 text-gray2" />
                </div>
                <h3 className="text-sm text-gray2">Contract Value Breakdown</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 bg-white p-[7px] mx-2 mb-2 rounded-[6px]">
              <div className="flex flex-col h-full">
                <div className="p-6 space-y-6 overflow-y-auto">
                  {/* VO Summary Section */}
                  <section>
                    <SummaryRow label="Original Contract Value" value="R 15.00 M" valueColor="text-[#0E1C2E]" />
                    <SummaryRow label="Approved Variations" value="+R 241 K" valueColor="text-[#16A34A]" />
                    <SummaryRow label="Total Contract Value" value="R 15.24 M" valueColor="0E1C2E" />
                    {/* <div className="border-t border-gray-200 my-3"></div> */}
                    {/* <div className="flex justify-between items-center pt-2">
                            <span className="text-base text-[#0E1C2E]">Total Value</span>
                            <span className="text-base text-[#0E1C2E]">
                              {formatCurrency(data.totalValue)}
                            </span>
                          </div> */}
                  </section>

                  {/* Contingency Usage Section */}
                  <section>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm text-[#6B7280]">Contingency Remaining</h3>
                      <span className="text-sm font-medium text-[#0E1C2E]">R 509 K / R 750 K</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#818CF8] h-2 rounded-full"
                        style={{
                          width: `60%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-[#6B7280] mt-2">
                      68% of contingency allocated to approved and <br />
                      pipeline variations
                    </p>
                    {/* <div className="border-t border-gray-200 mt-6"></div> */}
                  </section>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-7">
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <img src="/images/time-quarter-pass.png" alt="" className="h-4 w-4 text-gray2" />
                </div>
                <h3 className="text-sm text-gray2">Cash Flow Curve</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 bg-white p-[7px] mx-2 mb-2 rounded-[6px]">
              <div className="flex flex-col h-full">
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="nav flex items-center gap-6">
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-[#E5E7EB] rounded-full mr-3"></span>
                      <span className="text-base text-[#6B7280]">Planned</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-[#8081F6] rounded-full mr-3"></span>
                      <span className="text-base text-[#6B7280]">Actual</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-3 h-3 bg-[#16A34A] rounded-full mr-3"></span>
                      <span className="text-base text-[#6B7280]">Forecast</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {CHART_DATA.map(item => (
                      <ChartItem key={item.month} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-7">
            <CardHeader className="flex flex-row items-center justify-between p-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <img src="/images/time-quarter-pass.png" alt="" className="h-4 w-4 text-gray2" />
                </div>
                <h3 className="text-sm text-gray2">Baselinq Fee Projection (1%)</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 bg-white p-[7px] mx-2 mb-2 rounded-[6px]">
              <div className="flex flex-col h-full">
                <div className="p-6 space-y-6 overflow-y-auto">
                  {/* VO Summary Section */}
                  <section>
                    <SummaryRow label="Remaining to Certify" value="R 13.1 M" valueColor="text-[#0E1C2E]" />
                    <SummaryRow label="Projected Fees" value="R 131 K" valueColor="text-[#0E1C2E]" />
                  </section>

                  <footer className="">
                    <div className="bg-[#F3F2F0] rounded-lg p-3.5 text-sm text-[#6B7280]">
                      Projected completion: <span className="text-[#0E1C2E]">20 months</span> at <br />
                      current approval rate
                    </div>
                  </footer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <img src="/images/time-quarter-pass.png" alt="" className="h-4 w-4 text-gray2" />
              </div>
              <h3 className="text-sm text-gray2">Cash Flow Curve</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 bg-white p-[7px] mx-2 mb-2 rounded-[6px]">
            <div className="flex flex-col h-full">
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* VO Summary Section */}
                <section>
                  <SummaryRow label="Remaining to certify" value="R 12,930,000" valueColor="text-[#0E1C2E]" />
                  <SummaryRow label="Pipeline VOs" value="R 154,000" valueColor="text-[#0E1C2E]" />
                  <SummaryRow label="Monthly burn" value="@ R 15 K/day" valueColor="#0E1C2E" />
                  {/* <div className="border-t border-gray-200 my-3"></div> */}
                  {/* <SummaryRow
                    label="Projected fees"
                    value="R 130,840"
                    valueColor="#0E1C2E"
                  /> */}
                  <div className="border-t border-gray-200 my-3"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-base text-[#0E1C2E]">Total Value</span>
                    <span className="text-base text-[#0E1C2E]">R 130,840</span>
                  </div>
                  {/* <div className="border-t border-gray-200 my-3"></div> */}
                </section>

                {/* <button className="text-base text-[#3A6FF7]">
                  View billing ledger
                </button> */}
                <BillingLadgerDialog />

                {/* Contingency Usage Section */}
                <section>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                        <span className="text-base text-[#6B7280]">Available</span>
                      </div>
                      <span className="text-base text-[#0E1C2E]">R 226,011</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-[#F59E0B] rounded-full mr-3"></span>
                        <span className="text-base text-[#6B7280]">Pending</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">R 0</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-[#3A6FF7] rounded-full mr-3"></span>
                        <span className="text-base text-[#6B7280]">Committed</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">R 0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-[#DC2626] rounded-full mr-3"></span>
                        <span className="text-base text-[#6B7280]">Spent</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">R 23,989</span>
                    </div>
                    <div className="border-t border-gray-200 my-3"></div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="w-3 h-3 bg-[#6B7280] rounded-full mr-3"></span>
                        <span className="text-base text-[#6B7280]">Total</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">R 250,000</span>
                    </div>
                    {/* <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-gray-400 rounded-full mr-3"></span>
                    <span className="text-base text-[#6B7280]">In Draft</span>
                  </div>
                  <span className="text-sm font-medium text-[#0E1C2E]">
                    {data.draftCount}
                  </span>
                </div> */}
                  </div>
                </section>
              </div>
              <footer className="p-6">
                <div className="bg-[#F9FAFB] rounded-lg p-3.5 text-sm text-[#6B7280]">
                  Forecast based on historical approval velocity and current pipeline. Updated daily.
                </div>
              </footer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Forecast;
