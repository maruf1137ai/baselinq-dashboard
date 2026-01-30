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
    id: 'ai-summaries',
    title: 'AI Summaries',
    description: 'Daily project insights and recommendations',
    email: true,
    slack: false,
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
  {
    id: 'task',
    title: 'Task Reminders',
    description: 'Due dates and task assignments',
    email: false,
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
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-[23px] font-medium text-[#1A1A1A] mb-2">Notifications</h2>
        <p className="text-[#6B7280] text-base">Manage how and when you receive notifications.</p>
      </div>

      <div className="border rounded-[10px] overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-[#FAFAFA] text-sm">
            <TableRow className="hover:bg-[#FAFAFA]">
              <TableHead className="w-[400px] pl-6 h-12 text-[#6B7280] font-normal">Category</TableHead>
              <TableHead className="text-center w-[100px] text-[#6B7280] font-normal">Email</TableHead>
              <TableHead className="text-center w-[100px] text-[#6B7280] font-normal">Slack</TableHead>
              <TableHead className="text-center w-[100px] text-[#6B7280] font-normal">In-App</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map(setting => (
              <TableRow key={setting.id} className="hover:bg-transparent">
                <TableCell className="py-6 pl-6">
                  <div className="flex flex-col gap-1">
                    <span className=" text-[#1A1A1A] text-base">{setting.title}</span>
                    <span className="text-[#6B7280] text-sm">{setting.description}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={setting.email}
                      onCheckedChange={checked => handleCheckboxChange(setting.id, 'email', checked as boolean)}
                      className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-[#8081F6] data-[state=checked]:border-[#8081F6]"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={setting.slack}
                      onCheckedChange={checked => handleCheckboxChange(setting.id, 'slack', checked as boolean)}
                      className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-[#8081F6] data-[state=checked]:border-[#8081F6]"
                    />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={setting.inApp}
                      onCheckedChange={checked => handleCheckboxChange(setting.id, 'inApp', checked as boolean)}
                      className="h-5 w-5 rounded border-gray-300 data-[state=checked]:bg-[#8081F6] data-[state=checked]:border-[#8081F6]"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button className="">Save Preferences</Button>
      </div>
    </div>
  );
};

export default Notifications;
