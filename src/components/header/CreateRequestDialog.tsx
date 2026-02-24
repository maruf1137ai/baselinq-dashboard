"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import RFIForm from "./forms/RFIForm";
import SIForm from "./forms/SIForm";
import VOForm from "./forms/VOForm";
import DCForm from "./forms/DCForm";
import GIForm from "./forms/GIForm";
import CPIForm from "./forms/CPIForm";

export default function CreateRequestDialog({
  open,
  setOpen,
  selectedType,
  initialStatus,
}: any) {
  const renderForm = () => {
    if (!selectedType) return null;

    if (selectedType.startsWith("RFI")) return <RFIForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("SI")) return <SIForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("VO")) return <VOForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("DC")) return <DCForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("GI")) return <GIForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("CPI")) return <CPIForm setOpen={setOpen} initialStatus={initialStatus} />;

    return null;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col bg-white"
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Create New {selectedType}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-6">
          {renderForm()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
