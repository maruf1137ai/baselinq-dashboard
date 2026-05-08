"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import CreateRequestDialog from "./CreateRequestDialog";
import { Plus } from "lucide-react";
import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";

// "+ Action" menu — order matches Werner's spec rev G: SI, VO, RFI, GI, Claim.
// CPI removed per spec; existing rows remain readable (frozen).
const btns = [
  {
    code: "SI",
    title: "SI - Site Instruction",
    description: "Professional → Contractor. Instruction for immediate site work.",
    active: false,
  },
  {
    code: "VO",
    title: "VO - Variation Order",
    description: "PM → Contractor. Approved change to scope, cost, or materials.",
    active: false,
  },
  {
    code: "RFI",
    title: "RFI - Request for Information",
    description: "Contractor → Professional. Clarification on project details.",
    active: false,
  },
  {
    code: "GI",
    title: "GI - General Instruction",
    description: "Professional → Professional. Same format as RFI, prof-to-prof only.",
    active: false,
  },
  {
    code: "DC",
    title: "Claim - Delay or Cost",
    description: "Contractor → PM. Two-stage: Intention to Claim, then formal Claim.",
    active: false,
  },
];

export default function CreateRequestButton() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [btnsOpen, setBtnsOpen] = useState(false);

  const projectId =
    parseInt(localStorage.getItem("selectedProjectId") || "0") || null;
  const { data: effectivePerms, isLoading } = useEffectivePermissions(projectId);

  const filteredBtns = useMemo(() => {
    if (isLoading) return btns;
    const perms = effectivePerms?.permissions ?? {};

    const filtered = btns.filter((btn) => {
      const permCode = `task.${btn.code.toLowerCase()}.create`;
      return perms[permCode] === true;
    });

    return filtered;
  }, [effectivePerms, isLoading]);

  if (!isLoading && filteredBtns.length === 0) return null;

  const handleClick = (btn: string) => {
    setSelectedType(btn);
    setOpen(true);
    setBtnsOpen(false);
  };

  return (
    <>
      <div>
        <DropdownMenu open={btnsOpen} onOpenChange={setBtnsOpen}>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-base font-normal">
              <Plus />
              Action
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72 p-0 rounded-xl overflow-hidden">
            {filteredBtns.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onSelect={(e) => {
                  e.preventDefault();
                  handleClick(item.title);
                }}
                className="p-0 cursor-pointer"
              >
                <div
                  className={`border border-border p-4 w-full hover:bg-[#E8F1FF4D] transition ${
                    item.active ? "bg-[#E8F1FF4D]" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.active && (
                      <div className="h-2 w-2 bg-primary rounded-full mt-1.5" />
                    )}
                    <p className="text-sm text-foreground">{item.title}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateRequestDialog
        open={open}
        setOpen={setOpen}
        selectedType={selectedType}
      />
    </>
  );
}
