"use client";

import { useState, useMemo } from "react";
import { resolvePermissionCode, NEW_ROLE_DISPLAY_TO_CODE } from "@/lib/roleUtils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import CreateRequestDialog from "./CreateRequestDialog";
import { Bell, Plus, X } from "lucide-react";
import { useUserRoleStore } from "@/store/useUserRoleStore";

const btns = [
  {
    code: "SI",
    title: "SI - Site Instruction",
    description: "Instruction issued directly for immediate site work.",
    time: "5 minutes ago",
    active: false,
  },
  {
    code: "VO",
    title: "VO - Variation Order",
    description: "Request to modify scope, cost, or materials.",
    time: "Just now",
    active: false,
  },
  {
    code: "RFI",
    title: "RFI - Request for Information",
    description: "Clarification requested regarding project details.",
    time: "10 minutes ago",
    active: false,
  },
  {
    code: "CPI",
    title: "CPI - Critical Path Item",
    description: "Task affecting the critical path timeline.",
    time: "20 minutes ago",
    active: false,
  },
  {
    code: "GI",
    title: "GI - General Instruction",
    description: "General instruction for work or processes.",
    time: "30 minutes ago",
    active: false,
  },
  {
    code: "DC",
    title: "DC - Delay Claim",
    description: "Request for extension of time due to delays.",
    time: "15 minutes ago",
    active: false,
  },
];

const ALL_TASK_TYPES = ["SI", "VO", "RFI", "CPI", "GI", "DC"];

// Role to document type mapping - keys are standardized backbone codes
// Exact match with provided permission matrix
const rolePermissions: Record<string, string[]> = {
  CLIENT: ["SI", "VO", "RFI"],                 // Client/Owner - can create SI, VO, RFI only
  CPM: ["VO"],                                 // Client Project Manager - VO only
  ARCH: ["SI", "VO"],                          // Architect - SI, VO
  PM: ["SI", "RFI", "CPI", "DC"],              // Project Manager - SI, RFI, CPI, DC
  PRINCIPAL_PM: ["SI", "CPI", "DC"],           // Principal/PM - SI, CPI, DC
  CM: ["SI", "RFI", "CPI", "DC"],              // Construction Manager - SI, RFI, CPI, DC
  CONTRACTS_MGR: ["SI", "DC"],                 // Contracts Manager - SI, DC
  SE: ["SI", "RFI"],                           // Site Engineer - SI, RFI
  SS: ["RFI"],                                 // Site Supervisor - RFI only
  FOREMAN: ["RFI"],                            // Foreman - RFI only
  CQS: ["DC"],                                 // Consultant QS - DC only
  QS: ["DC"],                                  // Quantity Surveyor - DC only
  PLANNER: ["CPI", "DC"],                      // Planning Engineer - CPI, DC
  CONS_PLANNER: ["CPI"],                       // Consultant Planning Engineer - CPI only
  MECH_ENG: ["RFI"],                           // Mechanical Engineer - RFI only
  ELEC_ENG: ["RFI"],                           // Electrical Engineer - RFI only
  STRUCT_ENG: ["RFI"],                         // Structural Engineer - RFI only
  ADMIN: ALL_TASK_TYPES,                       // Administrator - can create all tasks
};




export default function CreateRequestButton() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [btnsOpen, setBtnsOpen] = useState(false);
  const { userRole } = useUserRoleStore();

  // console.log(userRole)

  // Filter buttons based on user role
  const filteredBtns = useMemo(() => {
    if (!userRole) return [];

    const roles = userRole.split(/\s*\/\s*/).map((r) => r.trim());
    const allowedTypes = new Set<string>();

    roles.forEach((role) => {
      const backbone = resolvePermissionCode(role);
      const typesForRole = rolePermissions[backbone] || [];
      typesForRole.forEach((type) => allowedTypes.add(type));
    });

    return btns.filter((btn) => allowedTypes.has(btn.code));
  }, [userRole]);

  // Hide the button if the user has no creation permissions
  if (filteredBtns.length === 0) return null;

  const handleClick = (btn) => {
    setSelectedType(btn);
    setOpen(true);
    setBtnsOpen(false);
  };

  //   function handleClick(item) {
  //   setBtns((prev) =>
  //     prev.map((b) => ({ ...b, active: b.code === item.code }))
  //   );
  // }


  return (
    <>
      <div className="">
        <DropdownMenu open={btnsOpen} onOpenChange={setBtnsOpen}>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-base font-normal">
              {/* <span className="text-xl">+</span> */}
              <Plus />
              Action
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-72 p-0 rounded-xl overflow-hidden">
            {filteredBtns.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onSelect={(e) => {
                  e.preventDefault(); // keeps menu open
                  handleClick(item.title);
                }}
                className="p-0 cursor-pointer"
              >
                <div
                  className={`border border-border p-4 w-full hover:bg-[#E8F1FF4D] transition ${item.active ? "bg-[#E8F1FF4D]" : "bg-white"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {item.active && (
                      <div className="h-2 w-2 bg-primary rounded-full mt-1.5"></div>
                    )}
                    <div>
                      <p className="text-sm text-foreground">{item.title}</p>

                      {/* {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}

                      {item.time && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {item.time}
                        </p>
                      )} */}
                    </div>
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
