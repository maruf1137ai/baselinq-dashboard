"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[700px] bg-white p-0 max-h-[calc(100vh-50px)] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Create New {selectedType}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6">{renderForm()}</div>
      </DialogContent>
    </Dialog>
  );
}
