import RiskOverview from '@/components/Compliance/RiskOverView';
import GenerateNoticeModal from '@/components/Compliance/GenerateNoticeModal';
import AddEvidenceModal from '@/components/Compliance/AddEvidenceModal';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertCircle, AlertTriangle, ChevronDown, Filter, Link2, Plus, Sparkles, Search, Shield, Clock, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { differenceInDays, parse } from 'date-fns';

// Demo compliance items
const complianceItems = [
  {
    id: "COMP-001",
    title: "Client Approval for VO-001",
    clause: "JBCC 13.3",
    dueDate: "Jan 8, 2025",
    status: "overdue",
    risk: "high",
    evidence: { current: 0, required: 3 },
    blocksPayment: true,
    penaltyDays: 2,
    linkedItems: ["task-vo", "PC-003"],
  },
  {
    id: "COMP-002",
    title: "Environmental Permit",
    clause: "National Environmental Management Act 107.2",
    dueDate: "Jan 8, 2025",
    status: "overdue",
    risk: "medium",
    evidence: { current: 0, required: 3 },
    blocksPayment: false,
    notes: "Environmental permit renewal in progress. Site inspection scheduled for next week.",
    lastUpdate: "1 day ago by Michael Lee",
  },
  {
    id: "COMP-003",
    title: "HSE Induction — Zone C",
    clause: "OHSA Section 8",
    dueDate: "Feb 1, 2025",
    status: "pending",
    risk: "low",
    evidence: { current: 1, required: 2 },
    blocksPayment: false,
    notes: "12 of 15 workers completed. Remaining 3 scheduled for Jan 28.",
  },
  {
    id: "COMP-004",
    title: "Structural Engineer Certificate",
    clause: "JBCC 17.1",
    dueDate: "Feb 15, 2025",
    status: "pending",
    risk: "medium",
    evidence: { current: 2, required: 4 },
    blocksPayment: false,
    notes: "Awaiting foundation load test results before engineer can certify.",
  },
  {
    id: "COMP-005",
    title: "Fire Safety Compliance",
    clause: "SANS 10400-T",
    dueDate: "Mar 1, 2025",
    status: "compliant",
    risk: "low",
    evidence: { current: 3, required: 3 },
    blocksPayment: false,
  },
];

const statusConfig: Record<string, { badge: string; label: string }> = {
  overdue: { badge: "bg-red-50 text-red-700", label: "Overdue" },
  pending: { badge: "bg-amber-50 text-amber-700", label: "Pending" },
  compliant: { badge: "bg-green-50 text-green-700", label: "Compliant" },
};

const riskConfig: Record<string, { badge: string; label: string }> = {
  high: { badge: "bg-red-50 text-red-700", label: "High Risk" },
  medium: { badge: "bg-amber-50 text-amber-700", label: "Medium Risk" },
  low: { badge: "bg-green-50 text-green-700", label: "Low Risk" },
};

const Compliance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerateNoticeModalOpen, setIsGenerateNoticeModalOpen] = useState(false);
  const [isAddEvidenceModalOpen, setIsAddEvidenceModalOpen] = useState(false);
  const [isRiskDrawerOpen, setIsRiskDrawerOpen] = useState(false);

  const filteredItems = searchTerm
    ? complianceItems.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clause.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : complianceItems;

  const overdueCount = complianceItems.filter(i => i.status === 'overdue').length;
  const pendingCount = complianceItems.filter(i => i.status === 'pending').length;
  const compliantCount = complianceItems.filter(i => i.status === 'compliant').length;
  const totalEvidence = complianceItems.reduce((sum, i) => sum + i.evidence.current, 0);
  const requiredEvidence = complianceItems.reduce((sum, i) => sum + i.evidence.required, 0);
  const complianceScore = Math.round((compliantCount / complianceItems.length) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-normal text-foreground tracking-tight">Compliance</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 text-xs rounded-lg border-border text-foreground" onClick={() => setIsRiskDrawerOpen(true)}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              Risk Overview
            </Button>
            <Button className="h-8 text-xs rounded-lg bg-primary text-white" onClick={() => setIsGenerateNoticeModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Summary Stats — compact inline */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{overdueCount} Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">{pendingCount} Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{compliantCount} Compliant</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">Evidence: {totalEvidence}/{requiredEvidence}</span>
          <span className="text-muted-foreground">•</span>
          <span className={`text-sm font-medium ${complianceScore < 50 ? 'text-red-600' : complianceScore < 80 ? 'text-amber-600' : 'text-green-600'}`}>
            {complianceScore}% Score
          </span>
          <span className="text-xs text-muted-foreground">
            {complianceScore < 50 ? `Low · ${overdueCount} items overdue` : complianceScore < 80 ? 'Needs attention' : 'On track'}
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search compliance items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 pl-10 bg-white border-border rounded-lg text-sm placeholder:text-muted-foreground"
            />
          </div>
          <Button variant="outline" className="h-8 text-xs rounded-lg border-border text-foreground hover:bg-muted">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Analyse with AI
          </Button>
        </div>

        {/* Compliance Items List */}
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const status = statusConfig[item.status];
            const risk = riskConfig[item.risk];
            const evidencePercent = Math.round((item.evidence.current / item.evidence.required) * 100);
            
            // Calculate days overdue for escalation
            const dueDate = parse(item.dueDate, 'MMM d, yyyy', new Date());
            const daysOverdue = item.status === 'overdue' ? differenceInDays(new Date(), dueDate) : 0;
            const isCriticallyOverdue = daysOverdue > 90;

            return (
              <div key={item.id} className={`border rounded-lg p-4 transition-colors ${
                isCriticallyOverdue 
                  ? 'border-red-300 bg-red-50/50 hover:bg-red-50' 
                  : 'border-border hover:bg-muted/30'
              }`}>
                {/* Row 1: Title + badges + due date */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.id}</span>
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <Badge className={`${isCriticallyOverdue ? 'bg-red-100 text-red-800 font-medium' : status.badge} border-0 text-xs px-2 py-0.5 rounded-full`}>
                      {isCriticallyOverdue ? `${daysOverdue}d overdue` : status.label}
                    </Badge>
                    <Badge className={`${risk.badge} border-0 text-xs px-2 py-0.5 rounded-full`}>
                      {risk.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    Due {item.dueDate}
                  </div>
                </div>

                {/* Row 2: Clause + blocks payment + penalty warning */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {item.clause}
                  </span>
                  {item.blocksPayment && (
                    <Badge className="bg-amber-50 text-amber-700 border-0 text-xs px-2 py-0.5 rounded-full">
                      Blocks payment
                    </Badge>
                  )}
                  {item.penaltyDays && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {item.penaltyDays} days until penalty
                    </span>
                  )}
                  {item.notes && (
                    <span className="text-muted-foreground truncate max-w-xs">{item.notes}</span>
                  )}
                </div>

                {/* Row 3: Evidence bar + linked items + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <span className="text-xs text-muted-foreground">Evidence {item.evidence.current}/{item.evidence.required}</span>
                    <div className="flex-1 bg-muted h-1.5 rounded-full">
                      <div className={`h-full rounded-full ${evidencePercent === 100 ? 'bg-green-500' : evidencePercent > 0 ? 'bg-primary' : 'bg-muted'}`} style={{ width: `${evidencePercent}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{evidencePercent}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.linkedItems && item.linkedItems.map((link, i) => (
                      <Badge key={i} className="bg-primary/10 text-primary border-0 text-xs px-2 py-0.5 rounded">
                        {link}
                      </Badge>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg border-border" onClick={() => setIsAddEvidenceModalOpen(true)}>
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
        <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 flex flex-col bg-white">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-4 h-4" />
              Risk Overview
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <RiskOverview />
          </div>
        </SheetContent>
      </Sheet>
      <GenerateNoticeModal isOpen={isGenerateNoticeModalOpen} onClose={() => setIsGenerateNoticeModalOpen(false)} />
      <AddEvidenceModal isOpen={isAddEvidenceModalOpen} onClose={() => setIsAddEvidenceModalOpen(false)} />
    </DashboardLayout>
  );
};

export default Compliance;
