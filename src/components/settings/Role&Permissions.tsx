import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const modules = ["Finance", "Compliance", "Tasks", "Communication", "Documents", "Programme"];
const roles = ["Project Manager", "Quantity Surveyor", "Site Manager"];

type PermissionState = Record<string, Record<string, boolean>>;

const RolePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>(() => {
    const initial: PermissionState = {};
    modules.forEach((mod) => {
      initial[mod] = {};
      roles.forEach((role) => {
        initial[mod][role] = false;
      });
    });
    return initial;
  });

  const handleToggle = (mod: string, role: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [role]: checked,
      },
    }));
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-muted/50">
            <TableHead className="w-[200px] text-xs text-muted-foreground font-normal px-4 py-2.5">
              Module
            </TableHead>
            {roles.map((role) => (
              <TableHead
                key={role}
                className="text-center text-xs text-muted-foreground font-normal px-4 py-2.5"
              >
                {role}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((mod) => (
            <TableRow key={mod} className="border-t border-border hover:bg-transparent">
              <TableCell className="py-4 px-4">
                <span className="text-sm text-foreground">{mod}</span>
              </TableCell>
              {roles.map((role) => (
                <TableCell key={role} className="text-center px-4 py-3">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={permissions[mod][role]}
                      onCheckedChange={(checked) =>
                        handleToggle(mod, role, checked as boolean)
                      }
                      className="h-5 w-5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RolePermissions;
