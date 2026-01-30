"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { billingLadgerData } from "./data";

export function BillingLadgerDialog({ wFull }) {
  const [open, setOpen] = useState(false);
  const [isOn, setIsOn] = useState(false);
  const [date, setDate] = useState<Date>();

  const toggleSwitch = () => {
    setIsOn(!isOn);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-base text-[#3A6FF7] text-left">
          Billing Ledger (1% Success Fee)
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[682px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-[#E5E7EB]">
          <DialogTitle className="text-lg text-[#1A1F36]">
            Request Information
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-aut">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-[#6B7280]">
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-[#6B7280]">
                  Artefact
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-[#6B7280]">
                  Event
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-[#6B7280]">
                  Net
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-[#6B7280]">
                  Fee (1%)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-normal text-[#6B7280]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingLadgerData.map((order, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#8081F6] hover:text-blue-800">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                    {order.artefact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#0E1C2E]">
                    {order.event}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                    {order.net}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                    {order.fee}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-base text-[#6B7280]">
                    {order.status}
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-base">
                    <span
                      className={`font-normal ${
                        order.status === "Queued"
                          ? "text-[#F59E0B] bg-[#FFF7ED] border border-[#FED7AA] py-1 px-2 rounded-full"
                          : order.status === "Posted"
                          ? "text-[#16A34A] bg-[rgba(233,247,236,0.42)] border border-[rgba(22,163,74,0.34)] py-1 px-2 rounded-full" // yellow
                          : "text-[#6B7280]" // default gray
                      }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-gray-200 mb-3"></div>
          <div className="px-6 space-y-6 overflow-y-auto">
            {/* VO Summary Section */}
            <section>
              <div className="flex justify-between items-center">
                <span className="text-base text-[#6B7280]">Running Total</span>
                <span className="text-base text-[#0E1C2E]">R 24,915</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-base text-[#6B7280]">Cap</span>
                <span className="text-base text-[#0E1C2E]">R 250,000</span>
              </div>
              {/* <div className="border-t border-gray-200 my-3"></div> */}
            </section>
          </div>
          <footer className="p-6 pb-0">
            <div className="bg-[#F9FAFB] rounded-lg p-3.5 text-sm text-[#6B7280]">
              Events fire on VO: Approved and PC: Approved transitions. Fees
              exclude VAT & retentions.
            </div>
          </footer>
        </div>

        <div className="flex items-end justify-end pb-4 px-6">
          <div className="flex gap-2 items-end">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
