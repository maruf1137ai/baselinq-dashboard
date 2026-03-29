import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  email: boolean;
  slack: boolean;
  inApp: boolean;
}

const initialSettings: NotificationSetting[] = [
  {
    id: 'compliance',
    title: 'Compliance Alerts',
    description: 'JBCC violations and regulatory updates',
    email: true,
    slack: true,
    inApp: true,
  },
  {
    id: 'sla-breach',
    title: 'SLA Breach Alerts',
    description: 'When tasks exceed response deadlines',
    email: true,
    slack: true,
    inApp: true,
  },
  {
    id: 'ai-summaries',
    title: 'AI Summaries',
    description: 'Daily project insights and recommendations',
    email: true,
    slack: false,
    inApp: true,
  },
  {
    id: 'task',
    title: 'Task Reminders',
    description: 'Due dates and task assignments',
    email: true,
    slack: true,
    inApp: true,
  },
  {
    id: 'document-updates',
    title: 'Document Updates',
    description: 'New versions, revisions, and linked changes',
    email: false,
    slack: true,
    inApp: true,
  },
  {
    id: 'meeting-actions',
    title: 'Meeting Action Items',
    description: 'Follow-ups and assigned actions from meetings',
    email: true,
    slack: false,
    inApp: true,
  },
  {
    id: 'obligation-warnings',
    title: 'Obligation Warnings',
    description: 'Contractual obligations approaching due date',
    email: true,
    slack: true,
    inApp: true,
  },
  {
    id: 'vo-approval',
    title: 'VO Approval Requests',
    description: 'Variation orders requiring your approval',
    email: true,
    slack: true,
    inApp: true,
  },
  {
    id: 'billing',
    title: 'Billing Updates',
    description: 'Invoices, payments, and subscription changes',
    email: true,
    slack: false,
    inApp: true,
  },
];

const Notifications = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>(initialSettings);

  const handleCheckboxChange = (id: string, field: 'email' | 'slack' | 'inApp', checked: boolean) => {
    setSettings(prev => prev.map(setting => (setting.id === id ? { ...setting, [field]: checked } : setting)));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage how and when you receive notifications.</p>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[400px] text-xs text-muted-foreground font-normal px-4 py-2.5">Category</TableHead>
              <TableHead className="text-center w-[100px] text-xs text-muted-foreground font-normal px-4 py-2.5">Email</TableHead>
              <TableHead className="text-center w-[100px] text-xs text-muted-foreground font-normal px-4 py-2.5">Slack</TableHead>
              <TableHead className="text-center w-[100px] text-xs text-muted-foreground font-normal px-4 py-2.5">In-App</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map(setting => (
              <TableRow key={setting.id} className="border-t border-border hover:bg-transparent">
                <TableCell className="py-4 px-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">{setting.title}</span>
                    <span className="text-xs text-muted-foreground">{setting.description}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center px-4 py-3">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={setting.email}
                      onCheckedChange={checked => handleCheckboxChange(setting.id, 'email', checked as boolean)}
                      className="h-5 w-5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center px-4 py-3">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={setting.slack}
                      onCheckedChange={checked => handleCheckboxChange(setting.id, 'slack', checked as boolean)}
                      className="h-5 w-5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center px-4 py-3">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={setting.inApp}
                      onCheckedChange={checked => handleCheckboxChange(setting.id, 'inApp', checked as boolean)}
                      className="h-5 w-5 rounded border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button className="h-10 rounded-lg">Save Preferences</Button>
      </div>
    </div>
  );
};

export default Notifications;
