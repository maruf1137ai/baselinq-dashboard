"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Minus, X } from "lucide-react";
import { clearTaskDraft, taskTypeKeyFromSelected } from "@/lib/taskDrafts";
import RFIForm from "./forms/RFIForm";
import SIForm from "./forms/SIForm";
import VOForm from "./forms/VOForm";
import DCForm from "./forms/DCForm";
import GIForm from "./forms/GIForm";
import ICForm from "./forms/ICForm";
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
    // Werner rev H — IC (Intention to Claim) comes BEFORE the DC startsWith
    // check so "IC" doesn't get swallowed by a future "ICR…" code.
    if (selectedType.startsWith("IC")) return <ICForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("DC")) return <DCForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("GI")) return <GIForm setOpen={setOpen} initialStatus={initialStatus} />;
    if (selectedType.startsWith("CPI")) return <CPIForm setOpen={setOpen} initialStatus={initialStatus} />;

    return null;
  };

  // Minimize: close the sheet but keep the in-progress draft (the active form
  // autosaves it to sessionStorage), so reopening the same type restores it.
  const handleMinimize = () => setOpen(false);

  // Close (X): explicit cancel — discard the draft for this task type, then close.
  const handleDiscardClose = () => {
    const key = taskTypeKeyFromSelected(selectedType);
    if (key) clearTaskDraft(key);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        hideClose
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col bg-white"
        // The create-task form is intentionally non-dismissable from outside:
        // clicking the dimmed overlay or pressing Esc must NOT close it (that
        // silently discarded a half-filled form). The only ways out are the
        // header minimize (-) button (keeps the draft) and close (X) / Cancel
        // (discard the draft). Use minimize to peek at the page behind.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>Create New {selectedType}</SheetTitle>
            <div className="flex items-center gap-1">
              {/* Minimize — keep the draft, close the sheet so the user can
                  look at a document, then resume by reopening this type. */}
              <button
                type="button"
                onClick={handleMinimize}
                title="Minimize — keep your progress"
                className="rounded-lg p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Minimize</span>
              </button>
              {/* Close — discard the draft. */}
              <button
                type="button"
                onClick={handleDiscardClose}
                title="Close — discard your progress"
                className="rounded-lg p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden px-6">
          {renderForm()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
