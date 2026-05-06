import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  AlertCircle,
  Link2,
  Download,
  CheckCircle2,
  Calendar,
  User,
  Trash2
} from 'lucide-react';
import AiIcon from '@/components/icons/AiIcon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LinkDocumentModal } from './LinkDocumentModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { VersionUploadModal } from './VersionUploadModal';

interface DocumentDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}

export const DocumentDetailPanel: React.FC<DocumentDetailPanelProps> = ({
  isOpen,
  onClose,
  document
}) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isVersionUploadOpen, setIsVersionUploadOpen] = useState(false);
  const [linkedItems, setLinkedItems] = useState(['VO-065', 'RFI-083', 'SI-108', 'RFI-080', 'DC-042']);

  const handleUnlink = (link: string) => {
    setLinkedItems(prev => prev.filter(l => l !== link));
  };

  if (!document) return null;

  const handleLink = (selectedIds: string[]) => {
    // console.log('Linking documents:', selectedIds);
    // In a real app, this would trigger an API call
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-[600px] p-0 flex flex-col bg-white border-l h-full">
          <SheetHeader className="px-6 py-6 border-b shrink-0 bg-gray-50/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-normal text-foreground">{document.name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 font-normal">
                      {document.reference}
                    </Badge>
                    <span className="text-sm text-gray-400">• v{document.version}</span>
                  </div>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="info" className="flex-1 flex flex-col">
              <div className="px-6 border-b shrink-0 bg-white">
                <TabsList className="bg-transparent h-12 w-full justify-start gap-6 rounded-none p-0">
                  <TabsTrigger value="info" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm font-normal">Info</TabsTrigger>
                  <TabsTrigger value="ai" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm font-normal flex gap-1.5 grayscale data-[state=active]:grayscale-0">
                    <AiIcon size={14} className="text-primary" /> AI Analysis
                  </TabsTrigger>
                  <TabsTrigger value="versions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm font-normal">Versions</TabsTrigger>
                  <TabsTrigger value="links" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 text-sm font-normal">Links</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <TabsContent value="info" className="m-0 p-6 space-y-8 animate-in fade-in slide-in-from-right-2">
                  <section>
                    <h4 className="text-xs font-normal text-gray-400 normal-case mb-4">Metadata</h4>
                    <div className="grid grid-cols-2 gap-y-6">
                      <div>
                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Uploaded Date</p>
                        <p className="text-sm font-normal text-gray-900">Oct 20, 2025</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Uploaded By</p>
                        <p className="text-sm font-normal text-gray-900">John Smith</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Discipline</p>
                        <p className="text-sm font-normal text-gray-900">{document.discipline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">File Size</p>
                        <p className="text-sm font-normal text-gray-900">2.4 MB</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-normal text-gray-400 normal-case mb-4">Description</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Main principal building agreement for the East Wing expansion project.
                      Includes revised contingency clauses and updated payment schedules as agreed in the Q3 meeting.
                    </p>
                  </section>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center border border-blue-100 shadow-sm">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-normal text-gray-900">View File</p>
                        <p className="text-xs text-gray-500">PDF Document • 12 Pages</p>
                      </div>
                    </div>
                    {document.userPermissions?.canDownload !== false && (
                      <Button size="sm" variant="outline" className="h-9 px-4 gap-2 border-blue-200 text-blue-700 bg-white hover:bg-blue-50 shadow-sm font-normal">
                        <Download className="h-4 w-4" /> Download
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="m-0 p-6 space-y-6 animate-in fade-in slide-in-from-right-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-normal text-gray-400 normal-case">Findings (4)</h4>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-primary font-normal hover:bg-primary/5">
                      <AiIcon size={12} className="mr-1.5" /> Re-run Analysis
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {[
                      { title: 'Inconsistent Payment Clause', severity: 'high', code: 'JBCC 25.1' },
                      { title: 'Missing Liability Provision', severity: 'high', code: 'JBCC 12.4' },
                      { title: 'Ambiguous Notice Period', severity: 'medium', code: 'JBCC 5.2' },
                      { title: 'Typo in Project Name', severity: 'low', code: 'General' },
                    ].map((finding, i) => (
                      <div key={i} className="group p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className={cn(
                              "mt-1 shrink-0",
                              finding.severity === 'high' ? 'text-red-500' :
                                finding.severity === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                            )}>
                              <AlertCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-normal text-foreground">{finding.title}</span>
                                <Badge variant="outline" className={cn(
                                  "text-xs px-1.5 h-4 font-normal uppercase",
                                  finding.severity === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                                    finding.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                )}>
                                  {finding.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Found in Section 4. This contradicts the previously signed MoU regarding retention payments.</p>
                              <Badge className="mt-3 bg-gray-100 text-gray-600 hover:bg-gray-100 border-0 text-xs font-normal">
                                {finding.code}
                              </Badge>
                            </div>
                          </div>
                          {document.userPermissions?.canResolve !== false && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="versions" className="m-0 p-6 space-y-6 animate-in fade-in slide-in-from-right-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-normal text-gray-400 normal-case">Version History</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-primary font-normal hover:bg-primary/5"
                        onClick={() => setIsVersionHistoryOpen(true)}
                      >
                        View full history
                      </Button>
                      {document.userPermissions?.canUploadVersion !== false && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-normal gap-1.5 border-gray-200"
                          onClick={() => setIsVersionUploadOpen(true)}
                        >
                          Upload New Version
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { v: 'v3', user: 'John Smith', date: 'Oct 20, 2025', current: true },
                      { v: 'v2', user: 'Sarah Wilson', date: 'Oct 15, 2025' },
                      { v: 'v1', user: 'John Smith', date: 'Oct 01, 2025' },
                    ].map((ver, i) => (
                      <div key={i} className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        ver.current ? "bg-white border-primary/20 shadow-sm" : "bg-gray-50/50 border-gray-100"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center font-normal text-xs",
                            ver.current ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
                          )}>
                            {ver.v}
                          </div>
                          <div>
                            <p className="text-sm font-normal text-gray-900">{ver.date}</p>
                            <p className="text-xs text-gray-500">{ver.user}</p>
                          </div>
                        </div>
                        {ver.current ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-normal uppercase">
                            <CheckCircle2 className="h-3 w-3" /> Current
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-normal text-primary">Make Current</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="links" className="m-0 p-6 space-y-6 animate-in fade-in slide-in-from-right-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-normal text-gray-400 normal-case">Linked Items ({linkedItems.length})</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-normal gap-1.5 border-gray-200"
                      onClick={() => setIsLinkModalOpen(true)}
                    >
                      <Link2 className="h-3 w-3" /> Add Link
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {linkedItems.map(link => (
                      <div key={link} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-sm cursor-pointer transition-all group/link">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gray-50 rounded flex items-center justify-center">
                            <Badge className="bg-transparent text-[#3A6FF7] border-0 p-0 text-xs hover:bg-transparent">{link.split('-')[0]}</Badge>
                          </div>
                          <div>
                            <p className="text-sm font-normal text-gray-800">{link}</p>
                            <p className="text-xs text-gray-400">Linked on Oct 21</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnlink(link); }}
                          className="opacity-0 group-hover/link:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                          title="Unlink"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="p-6 border-t bg-gray-50/50 flex gap-3 shrink-0">
            <Button variant="outline" className="flex-1 font-normal h-11 border-gray-200 bg-white" onClick={onClose}>Close</Button>
            <Button className="flex-1 font-normal h-11 shadow-lg shadow-primary/20">Open Document</Button>
          </div>
        </SheetContent>
      </Sheet>

      <LinkDocumentModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onLink={handleLink}
        alreadyLinkedIds={['VO-065', 'RFI-083', 'SI-108', 'RFI-080', 'DC-042']}
      />

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        document={document}
      />

      <VersionUploadModal
        isOpen={isVersionUploadOpen}
        onClose={() => setIsVersionUploadOpen(false)}
        document={document}
      />
    </>
  );
};
