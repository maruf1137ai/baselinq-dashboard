import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FileText, Link2, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

const documents = [
  {
    id: 1,
    name: 'JBCC Principal Building Agreement',
    type: 'Contract',
    reference: 'CONT-001',
    linked: 5,
    ai: 2,
    version: 'v3',
    updated: 'Oct 20, 2025 14:30',
  },
  {
    id: 2,
    name: 'Structural Engineering Report - Block A',
    type: 'Report',
    reference: 'VO-001',
    linked: 2,
    ai: 1,
    version: 'v2',
    updated: 'Oct 18, 2025 09:15',
  },
  {
    id: 3,
    name: 'Fire Safety Certificate Application',
    type: 'Certificate',
    reference: 'ENV-07',
    linked: 3,
    ai: 1,
    version: 'v1',
    updated: 'Oct 15, 2025 16:45',
  },
  {
    id: 4,
    name: 'HVAC System Technical Specifications',
    type: 'Specification',
    reference: 'SPEC-012',
    linked: 2,
    ai: 0,
    version: 'v4',
    updated: 'Oct 22, 2025 11:20',
  },
  {
    id: 5,
    name: 'Site Layout Architectural Drawing',
    type: 'Drawing',
    reference: 'DWG-A-101',
    linked: 2,
    ai: 1,
    version: 'v5',
    updated: 'Oct 19, 2025 13:00',
  },
  {
    id: 6,
    name: 'Environmental Impact Assessment',
    type: 'Report',
    reference: 'ENV-03',
    linked: 3,
    ai: 1,
    version: 'v2',
    updated: 'Oct 17, 2025 10:30',
  },
  {
    id: 7,
    name: 'Steel Supplier Contract',
    type: 'Contract',
    reference: 'CONT-005',
    linked: 2,
    ai: 2,
    version: 'v1',
    updated: 'Oct 16, 2025 15:10',
  },
];

const DocumentTable = () => {
  return (
    <div className="bg-white rounded-lg">
      <Table>
        <TableHeader className="border-t text-[#6B7280] ">
          <TableRow>
            <TableHead className="w-[400px] font-normal text-sm">Name</TableHead>
            <TableHead className="font-normal text-sm">Reference</TableHead>
            <TableHead className="font-normal text-sm">Linked</TableHead>
            <TableHead className="font-normal text-sm">AI</TableHead>
            <TableHead className="font-normal text-sm">Version</TableHead>
            <TableHead className="font-normal text-sm">Updated</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-[10px] bg-[#F5F5F5] flex items-center justify-center">
                    <FileText className="h-3 w-3 text-gray-500" />
                  </div>
                  <div>
                    <div className=" text-base text-[#1A1F36]">{doc.name}</div>
                    <div className="text-sm text-[#6B7280]">{doc.type}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-[#3A6FF7] ">{doc.reference}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-[#6B7280] text-sm">
                  <Link2 className="h-4 w-4" />
                  <span>{doc.linked}</span>
                </div>
              </TableCell>
              <TableCell>
                {doc.ai > 0 ? (
                  <Badge variant="secondary" className="bg-[#8081F629]  hover:bg-[#E0Eaff] text-sm gap-1 font-normal px-3 py-[6px]">
                    <Sparkles color="#8081F6" className="h-3 w-3" />
                    {doc.ai}
                  </Badge>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className="bg-[#F2F3F5] rounded-[4px] text-[#6B7280] hover:bg-gray-200 text-sm py-1 px-2 font-normal"
                >
                  {doc.version}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-500">
                  <div>
                    <span className="text-[#1A1F36]"> {doc.updated.split(' ')[0]}</span> <br /> {doc.updated.split(' ')[1]}{' '}
                    {doc.updated.split(' ')[2]} {doc.updated.split(' ')[3]}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DocumentTable;
