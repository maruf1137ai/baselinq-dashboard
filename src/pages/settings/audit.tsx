import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Filter, FileText, CheckCircle2, XCircle, Activity } from 'lucide-react';
import CashIcon from '@/components/icons/CashIcon';
import Asterisk from '@/components/icons/Asterisk';

const Audit = () => {
  const stats = [
    { label: 'Total Logs', value: '6', icon: <CashIcon />, color: 'text-[#6B7280]' },
    { label: 'Successful', value: '5', icon: <CashIcon />, color: 'text-[#6B7280]' },
    { label: 'Failed', value: '1', icon: <CashIcon />, color: 'text-[#6B7280]' },
    { label: 'Active Users', value: '4', icon: <Asterisk />, color: 'text-[#6B7280]' },
  ];

  const logs = [
    {
      date: '2025-10-23',
      time: '14:32',
      user: 'John Smith',
      action: 'Updated project details',
      module: 'Finance',
      status: 'Success',
    },
    {
      date: '2025-10-23',
      time: '13:15',
      user: 'Sarah Johnson',
      action: 'Approved variation order VO-008',
      module: 'Finance',
      status: 'Success',
    },
    {
      date: '2025-10-23',
      time: '11:45',
      user: 'Mike Wilson',
      action: 'Created task TSK-052',
      module: 'Tasks',
      status: 'Success',
    },
    {
      date: '2025-10-23',
      time: '10:20',
      user: 'Emily Davis',
      action: 'Uploaded compliance document',
      module: 'Compliance',
      status: 'Success',
    },
    {
      date: '2025-10-23',
      time: '09:15',
      user: 'John Smith',
      action: 'Failed login attempt',
      module: 'Security',
      status: 'Failed',
    },
    {
      date: '2025-10-22',
      time: '16:45',
      user: 'Sarah Johnson',
      action: 'Scheduled meeting MTG-012',
      module: 'Meetings',
      status: 'Success',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-[23px] font-medium text-[#1A1A1A] mb-2">Audit Logs & Compliance</h2>
        <p className="text-[#6B7280] text-base">Track all system actions and maintain compliance records.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-[10px] border border-[#E5E7EB]">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-[#6B7280]">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filters:</span>
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px] bg-[#FAFAFA] border-[#E5E7EB]">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="bg-[#FAFAFA] border-[#E5E7EB] text-[#1A1A1A] font-normal">
            <Calendar className="mr-2 h-4 w-4 text-[#6B7280]" />
            Last 7 days
          </Button>
        </div>

        <Button className="">
          <Download className="mr-1 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card className="bg-[#F3F2F0] !border-0 rounded-[13px] shadow-none">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  {stat?.icon}
                  <p className="text-sm text-gray2 mb-1">{stat?.label}</p>
                </div>
              </div>
              <div className="bg-white pt-[28px] pb-[9px] px-[14px] rounded-[6px]">
                <div className="">
                  <h3 className="text-2xl text-[#0F172A]">{stat?.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-[10px] border border-[#E5E7EB] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#FAFAFA]">
            <TableRow className="hover:bg-[#FAFAFA]">
              <TableHead className="w-[150px] pl-6 h-12 text-[#6B7280] font-normal">Date</TableHead>
              <TableHead className="w-[200px] text-[#6B7280] font-normal">User</TableHead>
              <TableHead className="text-[#6B7280] font-normal">Action</TableHead>
              <TableHead className="w-[150px] text-[#6B7280] font-normal">Module</TableHead>
              <TableHead className="w-[120px] text-right pr-6 text-[#6B7280] font-normal">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow key={index} className="hover:bg-transparent border-b border-[#E5E7EB] last:border-0">
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-[#6B7280] text-sm">{log.date}</span>
                    <span className="text-[#6B7280] text-sm">{log.time}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-[#1A1A1A] text-base">{log.user}</span>
                </TableCell>
                <TableCell className="py-4">
                  <span className="text-[#1A1A1A] text-base">{log.action}</span>
                </TableCell>
                <TableCell className="py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm  bg-[#F3F4F6] text-[#6B7280]">{log.module}</span>
                </TableCell>
                <TableCell className="text-right pr-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm   ${
                      log.status === 'Success' ? 'bg-[#E9F7EC6B] text-[#00C97A] border border-[#16A34A57]' : 'bg-[#FEE2E2] text-[#F06161] '
                    }`}
                  >
                    {log.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Audit;
