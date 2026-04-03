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

// Role to document type mapping (backbone codes + display names + new role codes)
const rolePermissions: Record<string, string[]> = {
  // Backbone codes
  "CLIENT": ALL_TASK_TYPES,
  "OWNER": ALL_TASK_TYPES,
  "CPM": ALL_TASK_TYPES,
  "PM": ["SI", "DC", "CPI"],
  "CM": ["RFI", "SI", "DC", "CPI"],
  "ARCH": ["VO", "SI"],
  "CQS": ["VO"],
  "CONS_PLANNER": ["CPI", "DC"],
  "CONTRACTS_MGR": ["VO", "DC"],
  "PLANNER": ["CPI", "DC"],
  "SE": ["RFI"],
  "SS": ["RFI", "SI"],
  "FOREMAN": ["RFI"],
  // Legacy display names
  "Client": ALL_TASK_TYPES,
  "Owner": ALL_TASK_TYPES,
  "CLIENT/OWNER": ALL_TASK_TYPES,
  "Client/Owner": ALL_TASK_TYPES,
  "Client / Owner": ALL_TASK_TYPES,
  "Client Project Manager": ALL_TASK_TYPES,
  "Architect": ["VO", "SI"],
  "Consultant Quantity Surveyor": ["VO"],
  "Consultant Planning Engineer": ["CPI", "DC"],
  "Construction Manager": ["RFI", "SI", "DC", "CPI"],
  "Contracts Manager": ["VO", "DC"],
  "Planning Engineer": ["CPI", "DC"],
  "Site Engineer": ["RFI"],
  "Site Supervisor": ["RFI", "SI"],
  "Foreman": ["RFI"],
  "Project Manager": ["SI", "DC", "CPI"],
  // New role codes
  "ADMIN": ALL_TASK_TYPES,
  "PROJECT_ADMIN": ALL_TASK_TYPES,
  "PRINCIPAL_PM": ["SI", "DC", "CPI"],
  "SUPER_USER": ALL_TASK_TYPES,
  "QS": ["VO"],
  "STANDARD": ["RFI"],
  "STRUCT_ENG": ["RFI"],
  "MECH_ENG": ["RFI"],
  "ELEC_ENG": ["RFI"],
  "SPECIAL_USER": ["SI", "DC", "CPI"],
  "LIMITED": ["RFI"],
  "VIEWER": ["RFI"],
  "LIMITED_VIEWER": ["RFI"],
  "LEGAL": ["VO", "DC"],
  // New role display names
  "Administrator": ALL_TASK_TYPES,
  "Project Administrator": ALL_TASK_TYPES,
  "Principal / PM": ["SI", "DC", "CPI"],
  "Super User": ALL_TASK_TYPES,
  "Quantity Surveyor": ["VO"],
  "Standard User": ["RFI"],
  "Structural Engineer": ["RFI"],
  "Mechanical Engineer": ["RFI"],
  "Electrical Engineer": ["RFI"],
  "Special User": ["SI", "DC", "CPI"],
  "Limited User": ["RFI"],
  "Limited Viewer": ["RFI"],
  "Legal": ["VO", "DC"],
};

function getPermittedTypes(role: string): string[] | null {
  if (!role) return null;
  if (rolePermissions[role]) return rolePermissions[role];
  const upper = role.trim().toUpperCase();
  const ciKey = Object.keys(rolePermissions).find(k => k.toUpperCase() === upper);
  if (ciKey) return rolePermissions[ciKey];
  const code = NEW_ROLE_DISPLAY_TO_CODE[role.trim()];
  if (code && rolePermissions[code]) return rolePermissions[code];
  const backbone = resolvePermissionCode(role);
  if (backbone && backbone !== upper && rolePermissions[backbone]) return rolePermissions[backbone];
  return null;
}


export default function CreateRequestButton() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [btnsOpen, setBtnsOpen] = useState(false);
  const { userRole } = useUserRoleStore();

  // console.log(userRole)

  // Filter buttons based on user role
  const filteredBtns = btns;

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
