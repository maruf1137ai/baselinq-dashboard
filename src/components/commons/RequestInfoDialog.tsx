'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import useFetch from '@/hooks/useFetch';
import { postData, patchData } from '@/lib/Api';
import { toast } from 'sonner';

interface UserRole {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectUser {
  id: number;
  email: string;
  name: string;
  organization: string | null;
  role: UserRole | null;
  profile: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectUsersResponse {
  projectId: string;
  projectNumber: string;
  projectName: string;
  users: ProjectUser[];
  totalUsers: number;
}

interface RequestInfoDialogProps {
  wFull?: boolean;
  taskType: string;
  taskId: string | number;
  assignedTo?: { userId: string; role: string; name: string }[];
  onSuccess?: () => void;
}

export function RequestInfoDialog({ wFull, taskType, taskId, assignedTo = [], onSuccess }: RequestInfoDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SelectedProjectID = localStorage.getItem('selectedProjectId')

  const { data: usersData } = useFetch<any>(`projects/${SelectedProjectID}/team-members/`);
  const availableUsers = usersData?.teamMembers || [];

  const toggleRecipient = (member: any) => {
    setSelectedRecipients((prev: any[]) => {
      const isSelected = prev.some(r => r._id === member._id);
      if (isSelected) {
        return prev.filter(r => r._id !== member._id);
      } else {
        return [...prev, member];
      }
    });
  };

  const removeRecipient = (memberId: string) => {
    setSelectedRecipients((prev: any[]) => prev.filter(r => r._id !== memberId));
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send request for each selected recipient
      const promises = selectedRecipients.map((recipient) =>
        postData({
          url: 'tasks/request-task-info/',
          data: {
            taskType,
            taskId: String(taskId),
            recipientId: recipient.user?.id || recipient.id,
            requestDetails: message,
            optionalNote: note || '',
            dueDate: date ? format(date, 'yyyy-MM-dd') : null,
          },
        })
      );

      await Promise.all(promises);

      // Assign recipients who are not already assigned to the task
      const newUserIds = selectedRecipients
        .filter((r) => !assignedTo.some((a) => String(a.userId) === String(r.userId)))
        .map((r) => String(r.userId));

      if (newUserIds.length > 0) {
        const existingUserIds = assignedTo.map((a) => a.userId);
        await patchData({
          url: `tasks/tasks/${taskId}/`,
          data: {
            assignedTo: [...existingUserIds, ...newUserIds],
          },
        });
      }

      toast.success('Request sent successfully');
      setOpen(false);
      onSuccess?.();

      // Reset form
      setSelectedRecipients([]);
      setMessage('');
      setNote('');
      setDate(undefined);
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={cn('bg-transparent text-black border border-border hover:bg-transparent', wFull && 'w-full')}>
          <span className="mr-2">+</span>
          Request Info
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[420px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-border">
          <DialogTitle className="text-lg text-foreground">Request Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="space-y-5">
            {/* Recipient Multi-Select */}
            <div>
              <Label className="text-sm text-foreground">
                Recipient(s)
              </Label>
              <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={recipientPopoverOpen}
                    className="w-full justify-between mt-2 h-auto min-h-[40px] font-normal"
                  >
                    {selectedRecipients.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedRecipients.map((member) => (
                          <Badge
                            key={member._id}
                            variant="secondary"
                            className="mr-1 mb-1 bg-muted text-foreground hover:bg-[#E5E7EB]"
                          >
                            {member.user?.name || member.name}
                            <button
                              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  removeRecipient(member._id);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeRecipient(member._id);
                              }}
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select recipients...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map((member: any) => {
                          const memberName = member.user?.name || member.name || member.user?.email || "";
                          const memberRole = member.user?.role?.name || member.roleName || "No role";
                          const isSelected = selectedRecipients.some(r => r._id === member._id);
                          return (
                            <CommandItem
                              key={member._id}
                              value={memberName}
                              onSelect={() => toggleRecipient(member)}
                              className="cursor-pointer w-full"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-[#6c5ce7] flex items-center justify-center text-white text-sm font-medium">
                                    {memberName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{memberName}</span>
                                    <span className="text-xs text-muted-foreground">{memberRole}</span>
                                  </div>
                                </div>
                                {/* Radio-like check circle */}
                                <div className={cn(
                                  "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                  isSelected
                                    ? "border-[#6c5ce7] bg-[#6c5ce7]"
                                    : "border-gray-300 bg-white"
                                )}>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date */}
            <div className="flex flex-col">
              <Label className="text-sm text-foreground mb-2">
                Due Date
              </Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="message" className="text-sm text-foreground">
                Request details
              </Label>
              <Textarea
                id="message"
                placeholder="Please provide updated foundation drawings with soil test results..."
                className="min-h-[120px] w-full mt-2"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Note */}
            <div>
              <Label htmlFor="note" className="text-sm text-foreground">
                Optional note
              </Label>
              <Input
                id="note"
                placeholder="Add any additional context..."
                className="mt-2"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex items-end justify-end border-t py-4 mt-4 px-6">
          <div className="flex gap-2 items-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
