import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, Upload, Archive, TriangleAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const DataManagement = () => {
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const PROJECT_NAME = 'Westfield Shopping Center';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-[23px] font-medium text-[#1A1A1A] mb-2">Data Management</h2>
        <p className="text-[#6B7280] text-base">Export, import, and manage your project data.</p>
      </div>

      <div className="space-y-6">
        {/* Export Section */}
        <Card className="bg-white border-[#E5E7EB]  rounded-[10px]">
          <CardContent className="p-[25px]">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-[10px] bg-[#FAFAFA] flex items-center justify-center shrink-0 ">
                <Download className="h-6 w-6 text-black" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className=" text-[#1A1A1A] text-base mb-2">Export All Project Data</h3>
                  <p className="text-[#6B7280] text-base leading-relaxed">
                    Download a complete backup of your project including tasks, documents, financials, and compliance records.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <RadioGroup defaultValue="csv" className="flex items-center gap-2">
                    <div className="flex items-center space-x-2 border border-[#E5E7EB] rounded-lg px-3 py-2 bg-[#FAFAFA]">
                      <RadioGroupItem value="csv" id="csv" className="text-[#8081F6] border-[#8081F6]" />
                      <Label htmlFor="csv" className="font-normal text-sm text-[#1A1A1A]">
                        CSV
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-[#E5E7EB] rounded-lg px-3 py-2 bg-[#FAFAFA]">
                      <RadioGroupItem value="json" id="json" />
                      <Label htmlFor="json" className="font-normal text-sm text-[#1A1A1A]">
                        JSON
                      </Label>
                    </div>
                  </RadioGroup>

                  <Button>Export Data</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card className="bg-white border-[#E5E7EB] rounded-[10px]">
          <CardContent className="p-[25px]">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#FAFAFA] flex items-center justify-center shrink-0">
                <Upload className="h-6 w-6 text-[#1A1A1A]" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-[#1A1A1A] text-base mb-2">Import Data</h3>
                  <p className="text-[#6B7280] text-base leading-relaxed">
                    Upload and import data from external sources. Supports CSV, JSON, and Excel formats.
                  </p>
                </div>

                <div className="border-2 border-dashed border-[#E5E7EB] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FAFAFA] transition-colors">
                  <div className="mb-3">
                    <Upload className="h-8 w-8 text-[#6B7280]" />
                  </div>
                  <p className="text-[#1A1A1A] text-base mb-1">Drop files here or click to browse</p>
                  <p className="text-[#6B7280] text-sm">Supported formats: CSV, JSON, XLSX</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archive Section */}
        <Card className="bg-white border-[#FEE2E2] ">
          <CardContent className="p-[25px]">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-[#FAFAFA] flex items-center justify-center shrink-0 ">
                <Archive className="h-6 w-6 text-[#F06161]" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className=" text-[#F06161] text-base mb-2">Archive Project</h3>
                  <p className="text-[#6B7280] text-base leading-relaxed">
                    Permanently archive this project. This action cannot be undone. All data will be moved to read-only archive storage.
                  </p>
                </div>

                <Button variant="destructive" className="bg-[#F06161] hover:bg-[#DC2626]" onClick={() => setIsArchiveModalOpen(true)}>
                  Archive Project
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white p-0 gap-0 overflow-hidden">
          <DialogHeader className="py-[18px] px-6  border-b">
            <DialogTitle className="flex items-center gap-2 text-base text-[#1A1A1A] font-normal">
              <TriangleAlert className="h-5 w-5" />
              Archive Project
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 pt-6 space-y-6">
            <div className="bg-[#F3F2F0] p-4 rounded-[10px] text-[#1A1A1A] text-base">
              Warning: This action cannot be undone. The project will be moved to read-only archive storage.
            </div>

            <div className="space-y-3">
              <Label className="text-[#6B7280] font-normal text-base">Type {PROJECT_NAME} to confirm:</Label>
              <Input
                value={confirmationText}
                onChange={e => setConfirmationText(e.target.value)}
                placeholder={PROJECT_NAME}
                className="bg-[#FAFAFA] border-[#E5E7EB] text-base h-11"
              />
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-[#6B7280] text-sm">
                <span className="h-1 w-1 rounded-full bg-[#F06161]" />
                All team members will lose access
              </li>
              <li className="flex items-center gap-2 text-[#6B7280] text-sm">
                <span className="h-1 w-1 rounded-full bg-[#F06161]" />
                No further edits can be made
              </li>
              <li className="flex items-center gap-2 text-[#6B7280] text-sm">
                <span className="h-1 w-1 rounded-full bg-[#F06161]" />
                Data will be preserved in read-only format
              </li>
            </ul>
          </div>

          <DialogFooter className="p-6 border-t sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setIsArchiveModalOpen(false)}
              className="flex-1 h-11 text-base font-normal border-[#E5E7EB] text-[#1A1A1A] hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-11 text-base font-normal bg-[#F06161] hover:bg-[#DC2626]"
              disabled={confirmationText !== PROJECT_NAME}
            >
              Archive Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagement;
