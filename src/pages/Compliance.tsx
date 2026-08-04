import RiskOverview from '@/components/Compliance/RiskOverView';
import GenerateNoticeModal from '@/components/Compliance/GenerateNoticeModal';
import AddEvidenceModal from '@/components/Compliance/AddEvidenceModal';
import ComplianceDetailModal from '@/components/Compliance/ComplianceDetailModal';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertTriangle, FileText, Paperclip, Search, Shield, Clock } from 'lucide-react';
import { AiMark } from '@/components/icons/AiMark';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useComplianceObligations, type ComplianceObligation } from '@/hooks/useCompliance';

// Real statuses come from DocumentObligation.Status (Pending / In Progress /
// Completed) plus a derived isOverdue flag — "Overdue" is never a stored
// status here, it's computed from due_date vs today so it can never drift
// out of sync with the data (see documents/views.py::ObligationListView).
const statusConfig: Record<string, { badge: string; label: string }> = {
  Pending: { badge: 'bg-amber-50 text-amber-700', label: 'Pending' },
  'In Progress': { badge: 'bg-amber-50 text-amber-700', label: 'In Progress' },
  Completed: { badge: 'bg-green-50 text-green-700', label: 'Completed' },
};

function formatDue(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Compliance = () => {
  const navigate = useNavigate();
  const projectId = localStorage.getItem('selectedProjectId');
  const { data, isLoading } = useComplianceObligations(projectId);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeObligation, setActiveObligation] = useState<ComplianceObligation | null>(null);
  const [isGenerateNoticeModalOpen, setIsGenerateNoticeModalOpen] = useState(false);
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRiskDrawerOpen, setIsRiskDrawerOpen] = useState(false);

  const obligations = data?.obligations || [];
  const counts = data?.counts;

  const filteredItems = useMemo(() => {
    if (!searchTerm) return obligations;
    const term = searchTerm.toLowerCase();
    return obligations.filter(
      (o) =>
        o.title.toLowerCase().includes(term) ||
        o.documentReference.toLowerCase().includes(term) ||
        o.documentName.toLowerCase().includes(term)
    );
  }, [obligations, searchTerm]);

  const complianceScore = obligations.length > 0
    ? Math.round(((counts?.completed || 0) / obligations.length) * 100)
    : 100;

  const openEvidenceModal = (obligation: ComplianceObligation) => {
    setActiveObligation(obligation);
    setIsAddEvidenceModalOpen(true);
  };

  const openNoticeModal = (obligation: ComplianceObligation) => {
    setActiveObligation(obligation);
    setIsGenerateNoticeModalOpen(true);
  };

  const openDetailModal = (obligation: ComplianceObligation) => {
    setActiveObligation(obligation);
    setIsDetailModalOpen(true);
  };

  const handleAnalyseWithAI = () => {
    toast.info('Select a document to run AI analysis and extract obligations.');
    navigate(`/documents${projectId ? `?project_id=${projectId}` : ''}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-normal text-foreground tracking-tight">Compliance</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 text-xs rounded-lg border-border text-foreground" onClick={() => setIsRiskDrawerOpen(true)}>
              <AlertTriangle className="mr-1.5" />
              Risk Overview
            </Button>
          </div>
        </div>

        {/* Summary Stats — real counts from the obligations endpoint */}
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{counts?.overdue ?? 0} Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">{counts?.pending ?? 0} Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{counts?.completed ?? 0} Completed</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className={`text-sm font-medium ${complianceScore < 50 ? 'text-red-600' : complianceScore < 80 ? 'text-amber-600' : 'text-green-600'}`}>
            {complianceScore}% Score
          </span>
          <span className="text-xs text-muted-foreground">
            {(counts?.total ?? 0) === 0
              ? 'No obligations tracked yet'
              : (counts?.overdue ?? 0) > 0
                ? `${counts?.overdue} item${counts?.overdue === 1 ? '' : 's'} overdue`
                : 'On track'}
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search compliance items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 bg-card border-border rounded-lg text-sm placeholder:text-muted-foreground"
            />
          </div>
          <Button variant="outline" className="h-8 text-xs rounded-lg border-border text-foreground hover:bg-muted" onClick={handleAnalyseWithAI}>
            <AiMark className="mr-1.5" /> Analyse with AI
          </Button>
        </div>

        {/* Compliance Items List */}
        <div className="space-y-3">
          {isLoading && (
            <div className="text-sm text-muted-foreground py-12 text-center">Loading obligations...</div>
          )}

          {!isLoading && filteredItems.length === 0 && (
            searchTerm ? (
              <EmptyState
                icon={Search}
                title="No obligations match this search"
                description={`Nothing matches "${searchTerm}". Try the document reference instead.`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Shield}
                title="No contractual obligations tracked yet"
                description="Obligations appear here once extracted from a document or added manually — with the date they fall due. Missing one can forfeit a claim or hold up a payment certificate."
              />
            )
          )}

          {!isLoading && filteredItems.map((item) => {
            const status = statusConfig[item.status] || statusConfig.Pending;

            return (
              <div
                key={item._id}
                onClick={() => openDetailModal(item)}
                className={`border rounded-xl p-4 transition-colors cursor-pointer ${
                item.isOverdue
                  ? 'border-red-300 bg-red-50/50 hover:bg-red-50'
                  : 'border-border bg-card hover:bg-muted/30'
              }`}>
                {/* Row 1: Title + badges + due date */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <Badge className={`${item.isOverdue ? 'bg-red-100 text-red-800 font-medium' : status.badge} border-0 text-xs px-2 py-0.5 rounded-full`}>
                      {item.isOverdue ? `${item.daysOverdue}d overdue` : status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    Due {formatDue(item.dueDate)}
                  </div>
                </div>

                {/* Row 2: source document + responsible role */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {item.documentReference} — {item.documentName}
                  </span>
                  {item.responsibleRole && (
                    <span className="text-muted-foreground">Responsible: {item.responsibleRole}</span>
                  )}
                  {item.noticeGeneratedAt && (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded-full">
                      Notice drafted
                    </Badge>
                  )}
                </div>

                {/* Row 3: evidence count + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" />
                    {item.evidenceCount} evidence file{item.evidenceCount === 1 ? '' : 's'} attached
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-lg border-border"
                      onClick={(e) => { e.stopPropagation(); openNoticeModal(item); }}
                    >
                      Generate & Link Notice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-lg border-border"
                      onClick={(e) => { e.stopPropagation(); openEvidenceModal(item); }}
                    >
                      Add Evidence
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Overview Drawer */}
      <Sheet open={isRiskDrawerOpen} onOpenChange={setIsRiskDrawerOpen}>
        <SheetContent side="right" size="sm" className="p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Overview
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <RiskOverview
              obligations={obligations}
              onSelect={(o) => { setIsRiskDrawerOpen(false); openDetailModal(o); }}
            />
          </div>
        </SheetContent>
      </Sheet>
      <GenerateNoticeModal
        isOpen={isGenerateNoticeModalOpen}
        onClose={() => setIsGenerateNoticeModalOpen(false)}
        projectId={projectId}
        obligation={activeObligation}
      />
      <AddEvidenceModal
        isOpen={isAddEvidenceModalOpen}
        onClose={() => setIsAddEvidenceModalOpen(false)}
        projectId={projectId}
        obligation={activeObligation}
      />
      <ComplianceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        projectId={projectId}
        obligation={activeObligation}
      />
    </DashboardLayout>
  );
};

export default Compliance;
