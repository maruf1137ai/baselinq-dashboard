import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Calendar,
  Filter,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  BarChart3,
  Printer,
  TrendingUp,
} from 'lucide-react';
import CashIcon from '@/components/icons/CashIcon';
import Asterisk from '@/components/icons/Asterisk';
import { formatDate } from '@/lib/utils';

// JBCC contractual time limits per task type (in calendar days)
const JBCC_DEADLINES: Record<string, { clause: string; days: number; label: string }[]> = {
  VO: [
    { clause: 'JBCC 17.1', days: 14, label: 'Pricing submission' },
    { clause: 'JBCC 17.2', days: 7, label: 'Client approval' },
  ],
  RFI: [
    { clause: 'JBCC 5.5', days: 5, label: 'Response required' },
  ],
  SI: [
    { clause: 'JBCC 18.1', days: 3, label: 'Acknowledgment' },
  ],
  DC: [
    { clause: 'JBCC 29.1', days: 20, label: 'Notice period' },
    { clause: 'JBCC 29.3', days: 28, label: 'Assessment completion' },
  ],
  CPI: [
    { clause: 'JBCC 20.1', days: 30, label: 'Programme schedule' },
  ],
  GI: [
    { clause: 'JBCC 5.1', days: 7, label: 'Acknowledgment' },
  ],
};

const TASK_TYPE_LABELS: Record<string, string> = {
  VO: 'Variation Order',
  RFI: 'Request for Information',
  SI: 'Site Instruction',
  DC: 'Delay Claim',
  CPI: 'Critical Path Item',
  GI: 'General Instruction',
};

// ── Static data ──────────────────────────────────────────

const stats = [
  { label: 'Total Logs', value: '24', icon: <CashIcon /> },
  { label: 'Successful', value: '21', icon: <CashIcon /> },
  { label: 'Failed', value: '3', icon: <CashIcon /> },
  { label: 'Active Users', value: '8', icon: <Asterisk /> },
];

const logs = [
  { date: '2025-10-23', time: '14:32', user: 'John Smith', action: 'Updated project details', module: 'Finance', status: 'Success' },
  { date: '2025-10-23', time: '13:15', user: 'Sarah Johnson', action: 'Approved variation order VO-008', module: 'Tasks', status: 'Success' },
  { date: '2025-10-23', time: '11:45', user: 'Mike Wilson', action: 'Created task TSK-052', module: 'Tasks', status: 'Success' },
  { date: '2025-10-23', time: '10:20', user: 'Emily Davis', action: 'Uploaded compliance document', module: 'Compliance', status: 'Success' },
  { date: '2025-10-23', time: '09:15', user: 'John Smith', action: 'Failed login attempt', module: 'Security', status: 'Failed' },
  { date: '2025-10-22', time: '16:45', user: 'Sarah Johnson', action: 'Scheduled meeting MTG-012', module: 'Meetings', status: 'Success' },
  { date: '2025-10-22', time: '14:10', user: 'Mike Wilson', action: 'Submitted delay claim DC-003', module: 'Tasks', status: 'Success' },
  { date: '2025-10-22', time: '11:30', user: 'Emily Davis', action: 'Rejected site instruction SI-015', module: 'Tasks', status: 'Failed' },
  { date: '2025-10-21', time: '15:20', user: 'John Smith', action: 'Generated compliance report', module: 'Compliance', status: 'Success' },
  { date: '2025-10-21', time: '09:00', user: 'Sarah Johnson', action: 'Created RFI-022', module: 'Tasks', status: 'Success' },
];

const complianceByType = [
  { type: 'VO', total: 12, compliant: 9, overdue: 2 },
  { type: 'RFI', total: 8, compliant: 7, overdue: 1 },
  { type: 'SI', total: 6, compliant: 5, overdue: 1 },
  { type: 'DC', total: 4, compliant: 2, overdue: 2 },
  { type: 'CPI', total: 5, compliant: 4, overdue: 0 },
  { type: 'GI', total: 3, compliant: 3, overdue: 0 },
];

const deadlineItems = [
  { taskNumber: 'VO-008', taskType: 'VO', clause: 'JBCC 17.1', label: 'Pricing submission', deadline: '28 Oct 2025', daysRemaining: -3, assignedTo: 'Sarah Johnson', isCompleted: false },
  { taskNumber: 'DC-003', taskType: 'DC', clause: 'JBCC 29.1', label: 'Notice period', deadline: '30 Oct 2025', daysRemaining: -1, assignedTo: 'Mike Wilson', isCompleted: false },
  { taskNumber: 'RFI-022', taskType: 'RFI', clause: 'JBCC 5.5', label: 'Response required', deadline: '1 Nov 2025', daysRemaining: 2, assignedTo: 'John Smith', isCompleted: false },
  { taskNumber: 'SI-015', taskType: 'SI', clause: 'JBCC 18.1', label: 'Acknowledgment', deadline: '2 Nov 2025', daysRemaining: 3, assignedTo: 'Emily Davis', isCompleted: false },
  { taskNumber: 'VO-006', taskType: 'VO', clause: 'JBCC 17.2', label: 'Client approval', deadline: '5 Nov 2025', daysRemaining: 6, assignedTo: 'Sarah Johnson', isCompleted: false },
  { taskNumber: 'CPI-004', taskType: 'CPI', clause: 'JBCC 20.1', label: 'Programme schedule', deadline: '15 Nov 2025', daysRemaining: 16, assignedTo: 'Mike Wilson', isCompleted: false },
  { taskNumber: 'GI-002', taskType: 'GI', clause: 'JBCC 5.1', label: 'Acknowledgment', deadline: '18 Nov 2025', daysRemaining: 19, assignedTo: 'Emily Davis', isCompleted: false },
  { taskNumber: 'VO-005', taskType: 'VO', clause: 'JBCC 17.1', label: 'Pricing submission', deadline: '10 Oct 2025', daysRemaining: -21, assignedTo: 'John Smith', isCompleted: true },
  { taskNumber: 'RFI-018', taskType: 'RFI', clause: 'JBCC 5.5', label: 'Response required', deadline: '15 Oct 2025', daysRemaining: -16, assignedTo: 'Sarah Johnson', isCompleted: true },
];

const auditTrailEntries = [
  { action: 'VO Approved', description: 'Variation Order VO-008 approved by Sarah Johnson', createdByName: 'Sarah Johnson', created_at: '2025-10-23T13:15:00Z', taskType: 'VO' },
  { action: 'DC Submitted', description: 'Delay Claim DC-003 submitted for assessment', createdByName: 'Mike Wilson', created_at: '2025-10-22T14:10:00Z', taskType: 'DC' },
  { action: 'RFI Created', description: 'Request for Information RFI-022 created', createdByName: 'Sarah Johnson', created_at: '2025-10-21T09:00:00Z', taskType: 'RFI' },
  { action: 'SI Rejected', description: 'Site Instruction SI-015 rejected — incomplete documentation', createdByName: 'Emily Davis', created_at: '2025-10-22T11:30:00Z', taskType: 'SI' },
  { action: 'VO Completed', description: 'Variation Order VO-005 pricing completed and closed', createdByName: 'John Smith', created_at: '2025-10-10T16:00:00Z', taskType: 'VO' },
  { action: 'CPI Updated', description: 'Critical Path Item CPI-004 progress updated to 65%', createdByName: 'Mike Wilson', created_at: '2025-10-20T10:30:00Z', taskType: 'CPI' },
  { action: 'Compliance Report', description: 'Monthly compliance report generated', createdByName: 'John Smith', created_at: '2025-10-21T15:20:00Z', taskType: '' },
  { action: 'GI Acknowledged', description: 'General Instruction GI-001 acknowledged by contractor', createdByName: 'Emily Davis', created_at: '2025-10-19T08:45:00Z', taskType: 'GI' },
  { action: 'RFI Completed', description: 'Request for Information RFI-018 response provided and closed', createdByName: 'Sarah Johnson', created_at: '2025-10-15T14:00:00Z', taskType: 'RFI' },
  { action: 'DC Notice Issued', description: 'Delay Claim DC-002 notice issued to principal agent', createdByName: 'Mike Wilson', created_at: '2025-10-18T11:15:00Z', taskType: 'DC' },
];

// ── Helpers ──────────────────────────────────────────────

const getDeadlineStatus = (daysRemaining: number): { label: string; color: string } => {
  if (daysRemaining < 0) return { label: 'Overdue', color: 'bg-red-50 text-red-700 border-red-200' };
  if (daysRemaining <= 3) return { label: 'At Risk', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'On Track', color: 'bg-green-50 text-green-700 border-green-200' };
};

// ── Component ────────────────────────────────────────────

const Audit = () => {
  const [typeFilter, setTypeFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [auditTypeFilter, setAuditTypeFilter] = useState('all');
  const [logStatusFilter, setLogStatusFilter] = useState('all');

  // Computed compliance stats
  const totalTasks = complianceByType.reduce((s, t) => s + t.total, 0);
  const compliantTasks = complianceByType.reduce((s, t) => s + t.compliant, 0);
  const overdueItems = complianceByType.reduce((s, t) => s + t.overdue, 0);
  const complianceScore = totalTasks > 0 ? Math.round((compliantTasks / totalTasks) * 100) : 0;
  const riskLevel = overdueItems > 5 ? 'High' : overdueItems > 2 ? 'Medium' : 'Low';

  const riskColors: Record<string, string> = {
    High: 'text-red-600 bg-red-50 border-red-200',
    Medium: 'text-amber-600 bg-amber-50 border-amber-200',
    Low: 'text-green-600 bg-green-50 border-green-200',
  };

  // Filtered deadlines
  const filteredDeadlines = useMemo(() => {
    let filtered = deadlineItems;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((d) => d.taskType === typeFilter);
    }
    if (deadlineFilter === 'overdue') {
      filtered = filtered.filter((d) => d.daysRemaining < 0 && !d.isCompleted);
    } else if (deadlineFilter === 'at-risk') {
      filtered = filtered.filter((d) => d.daysRemaining >= 0 && d.daysRemaining <= 3 && !d.isCompleted);
    } else if (deadlineFilter === 'on-track') {
      filtered = filtered.filter((d) => d.daysRemaining > 3 && !d.isCompleted);
    } else if (deadlineFilter === 'completed') {
      filtered = filtered.filter((d) => d.isCompleted);
    }
    return filtered;
  }, [typeFilter, deadlineFilter]);

  // Filtered audit trail
  const filteredAuditTrail = useMemo(() => {
    let entries = [...auditTrailEntries];
    if (auditTypeFilter !== 'all') {
      entries = entries.filter((e) => e.taskType === auditTypeFilter);
    }
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [auditTypeFilter]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (logStatusFilter === 'all') return logs;
    return logs.filter((l) => l.status.toLowerCase() === logStatusFilter);
  }, [logStatusFilter]);

  // CSV export
  const exportCSV = () => {
    const headers = ['Task #', 'Type', 'Clause', 'Requirement', 'Deadline', 'Days Remaining', 'Status', 'Assigned To'];
    const rows = deadlineItems.map((d) => [
      d.taskNumber, d.taskType, d.clause, d.label, d.deadline,
      d.daysRemaining, d.isCompleted ? 'Completed' : getDeadlineStatus(d.daysRemaining).label, d.assignedTo,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Audit Logs & Compliance</h2>
        <p className="text-sm text-muted-foreground mt-1">Track all system actions, JBCC compliance, and contractual deadlines.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-sidebar p-1 rounded-lg h-auto w-full">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2 text-sm w-full">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm w-full">
            <Activity className="w-4 h-4 mr-2" />
            Audit Trail
          </TabsTrigger>
          {/* <TabsTrigger value="deadlines" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
            <Clock className="w-4 h-4 mr-2" />
            Deadline Tracker
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
            <FileText className="w-4 h-4 mr-2" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-[8px] px-4 py-2 text-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </TabsTrigger> */}
        </TabsList>

        {/* ── Tab 1: Compliance Overview ── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2.5 mb-2">
                  <CashIcon />
                  <p className="text-sm text-muted-foreground mb-1">Compliance Score</p>
                </div>
                <div className="bg-white py-[6px] px-[14px] rounded-[6px]">
                  <h3 className="text-2xl text-[#0F172A]">{complianceScore}%</h3>
                  <Progress value={complianceScore} className="h-[8px] my-2.5" />
                  <p className="text-xs text-[#717784]">
                    {complianceScore >= 80 ? 'Above target threshold' : complianceScore >= 50 ? 'Approaching target' : 'Below target threshold'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
              <CardContent className="p-2.5 flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 mb-2">
                  <CashIcon />
                  <p className="text-sm text-muted-foreground mb-1">Pending Deadlines</p>
                </div>
                <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                  <h3 className="text-2xl text-[#0F172A]">
                    {deadlineItems.filter((d) => !d.isCompleted && d.daysRemaining >= 0 && d.daysRemaining <= 7).length}
                  </h3>
                  <p className="text-xs text-[#717784]">Due within 7 days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
              <CardContent className="p-2.5 flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 mb-2">
                  <CashIcon />
                  <p className="text-sm text-muted-foreground mb-1">Overdue Items</p>
                </div>
                <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                  <h3 className="text-2xl text-[#0F172A]">
                    <span className={overdueItems > 0 ? 'text-[#DC2626]' : ''}>{overdueItems}</span>
                  </h3>
                  <p className="text-xs text-[#717784]">
                    {overdueItems > 0 ? `${overdueItems} items past deadline` : 'All items on track'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#F3F2F0] !border-0 flex flex-col rounded-[13px] shadow-none">
              <CardContent className="p-2.5 flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 mb-2">
                  <Asterisk />
                  <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                </div>
                <div className="bg-white flex flex-col justify-between flex-1 py-[10px] px-[14px] rounded-[6px]">
                  <Badge className={`${riskColors[riskLevel]} border w-fit text-sm`}>{riskLevel}</Badge>
                  <p className="text-xs text-[#717784] mt-2">Based on {overdueItems} overdue items</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance by Task Type */}
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-medium text-[#1A1A1A]">Compliance by Document Type</h3>
            </div>
            <Table>
              <TableHeader className="bg-[#FAFAFA]">
                <TableRow className="hover:bg-[#FAFAFA]">
                  <TableHead className="pl-6 h-12 text-[#6B7280] font-normal">Document Type</TableHead>
                  <TableHead className="text-[#6B7280] font-normal">Total</TableHead>
                  <TableHead className="text-[#6B7280] font-normal">Compliant</TableHead>
                  <TableHead className="text-[#6B7280] font-normal">Overdue</TableHead>
                  <TableHead className="text-[#6B7280] font-normal">Compliance %</TableHead>
                  <TableHead className="pr-6 text-right text-[#6B7280] font-normal">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceByType.map((item) => {
                  const pct = item.total > 0 ? Math.round((item.compliant / item.total) * 100) : 0;
                  return (
                    <TableRow key={item.type} className="hover:bg-muted border-b border-border last:border-0">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#F3F4F6] text-[#1A1A1A] border-none text-xs font-medium">{item.type}</Badge>
                          <span className="text-sm text-[#6B7280]">{TASK_TYPE_LABELS[item.type] || item.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-[#1A1A1A]">{item.total}</TableCell>
                      <TableCell className="py-4 text-sm text-green-600">{item.compliant}</TableCell>
                      <TableCell className="py-4 text-sm text-red-600">{item.overdue}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 w-20" />
                          <span className="text-sm text-[#1A1A1A]">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <Badge className={`${pct >= 80 ? 'bg-green-50 text-green-700 border-green-200' : pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'} border text-xs`}>
                          {pct >= 80 ? 'Good' : pct >= 50 ? 'Needs Attention' : 'Critical'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Tab 2: Audit Trail ── */}
        <TabsContent value="audit-trail" className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filter by type:</span>
            </div>
            <Select value={auditTypeFilter} onValueChange={setAuditTypeFilter}>
              <SelectTrigger className="w-[160px] bg-white border-[#E5E7EB]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="VO">VO - Variation Order</SelectItem>
                <SelectItem value="RFI">RFI - Request for Info</SelectItem>
                <SelectItem value="SI">SI - Site Instruction</SelectItem>
                <SelectItem value="DC">DC - Delay Claim</SelectItem>
                <SelectItem value="CPI">CPI - Critical Path</SelectItem>
                <SelectItem value="GI">GI - General Instruction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-sm font-medium text-foreground mb-6">Compliance Activity Timeline</h3>
            <div className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
              {filteredAuditTrail.map((log, i) => (
                <div key={i} className="relative pl-8">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 bg-white border-2 rounded-full z-10 ${(log.action || '').toLowerCase().includes('completed') || (log.action || '').toLowerCase().includes('approved')
                    ? 'border-green-600'
                    : (log.action || '').toLowerCase().includes('rejected') || (log.action || '').toLowerCase().includes('overdue')
                      ? 'border-red-600'
                      : 'border-blue-600'
                    }`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-medium text-foreground">{log.action}</p>
                      {log.taskType && (
                        <Badge className="bg-[#F3F4F6] text-[#6B7280] border-none text-[10px]">{log.taskType}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} &middot; {log.createdByName}
                    </p>
                    {log.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{log.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>


      </Tabs>
    </div>
  );
};

export default Audit;
