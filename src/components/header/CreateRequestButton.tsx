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

const btns = [
  {
    code: "SI",
    title: "SI - Site Instruction",
    description: "Instruction issued directly for immediate site work.",
    active: false,
  },
  {
    code: "VO",
    title: "VO - Variation Order",
    description: "Request to modify scope, cost, or materials.",
    active: false,
  },
  {
    code: "RFI",
    title: "RFI - Request for Information",
    description: "Clarification requested regarding project details.",
    active: false,
  },
  {
    code: "CPI",
    title: "CPI - Critical Path Item",
    description: "Task affecting the critical path timeline.",
    active: false,
  },
  {
    code: "GI",
    title: "GI - General Instruction",
    description: "General instruction for work or processes.",
    active: false,
  },
  {
    code: "DC",
    title: "DC - Delay Claim",
    description: "Request for extension of time due to delays.",
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

    // DEBUG: Log effective permissions for task creation
    console.log('[CreateRequestButton] Effective Permissions:', {
      roleCode: effectivePerms?.roleCode,
      projectId: effectivePerms?.projectId,
      taskPermissions: Object.keys(perms)
        .filter(k => k.startsWith('task.') && k.endsWith('.create'))
        .reduce((acc, k) => ({ ...acc, [k]: perms[k] }), {}),
    });

    const filtered = btns.filter((btn) => {
      const permCode = `task.${btn.code.toLowerCase()}.create`;
      const hasPermission = perms[permCode] === true;
      console.log(`[CreateRequestButton] ${btn.code}: ${permCode} = ${hasPermission}`);
      return hasPermission;
    });

    console.log('[CreateRequestButton] Filtered task types:', filtered.map(b => b.code));
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
