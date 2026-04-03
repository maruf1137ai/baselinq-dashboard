// UPCOMING_FEATURE: All original code commented out — restore when backend integration is ready

// import React, { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Label } from '@/components/ui/label';
// import { Download, Upload, Archive, TriangleAlert } from 'lucide-react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';

import UpcomingFeature from "@/components/settings/UpcomingFeature";

const DataManagement = () => {
  // const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  // const [confirmationText, setConfirmationText] = useState('');
  // const PROJECT_NAME = 'Westfield Shopping Center';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Data Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Export, import, and manage your project data.</p>
      </div>
      <UpcomingFeature title="Data Management" />
      {/* UPCOMING_FEATURE: Original JSX commented out below — restore when backend integration is ready

      <div className="space-y-6">
        <Card className="bg-white border-border  rounded-lg">
          <CardContent className="p-[25px]">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 ">
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className=" text-foreground text-sm font-medium mb-2">Export All Project Data</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Download a complete backup of your project including tasks, documents, financials, and compliance records.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <RadioGroup defaultValue="csv" className="flex items-center gap-2">
                    <div className="flex items-center space-x-2 border border-border rounded-lg px-3 py-2 bg-muted">
                      <RadioGroupItem value="csv" id="csv" className="text-primary border-primary" />
                      <Label htmlFor="csv" className="font-normal text-sm text-foreground">
                        CSV
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border rounded-lg px-3 py-2 bg-muted">
                      <RadioGroupItem value="json" id="json" />
                      <Label htmlFor="json" className="font-normal text-sm text-foreground">
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

        <Card className="bg-white border-border rounded-lg">
          <CardContent className="p-[25px]">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-foreground text-sm font-medium mb-2">Import Data</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Upload and import data from external sources. Supports CSV, JSON, and Excel formats.
                  </p>
                </div>

                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted transition-colors">
                  <div className="mb-3">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-foreground text-sm mb-1">Drop files here or click to browse</p>
                  <p className="text-muted-foreground text-sm">Supported formats: CSV, JSON, XLSX</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-destructive/20 ">
          <CardContent className="p-[25px]">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 ">
                <Archive className="w-4 h-4 text-destructive" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className=" text-destructive text-sm font-medium mb-2">Archive Project</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Permanently archive this project. This action cannot be undone. All data will be moved to read-only archive storage.
                  </p>
                </div>

                <Button variant="destructive" className="bg-destructive hover:bg-destructive/90" onClick={() => setIsArchiveModalOpen(true)}>
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
            <DialogTitle className="flex items-center gap-2 text-sm text-foreground font-normal">
              <TriangleAlert className="w-4 h-4" />
              Archive Project
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 pt-6 space-y-6">
            <div className="bg-sidebar p-4 rounded-lg text-foreground text-sm">
              Warning: This action cannot be undone. The project will be moved to read-only archive storage.
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground font-normal text-sm">Type {PROJECT_NAME} to confirm:</Label>
              <Input
                value={confirmationText}
                onChange={e => setConfirmationText(e.target.value)}
                placeholder={PROJECT_NAME}
                className="bg-muted border-border text-sm h-10"
              />
            </div>

            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="h-1 w-1 rounded-full bg-destructive" />
                All team members will lose access
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="h-1 w-1 rounded-full bg-destructive" />
                No further edits can be made
              </li>
              <li className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="h-1 w-1 rounded-full bg-destructive" />
                Data will be preserved in read-only format
              </li>
            </ul>
          </div>

          <DialogFooter className="p-6 border-t sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setIsArchiveModalOpen(false)}
              className="flex-1 h-10 text-sm font-normal border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-10 text-sm font-normal bg-destructive hover:bg-destructive/90"
              disabled={confirmationText !== PROJECT_NAME}
            >
              Archive Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
};

export default DataManagement;
