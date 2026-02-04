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
import { postData } from '@/lib/Api';
import { toast } from 'sonner';

interface ProjectUser {
  id: number;
  email: string;
  name: string;
  organization: string | null;
  role: string | null;
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
  onSuccess?: () => void;
}

export function RequestInfoDialog({ wFull, taskType, taskId, onSuccess }: RequestInfoDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [selectedRecipients, setSelectedRecipients] = useState<ProjectUser[]>([]);
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersData } = useFetch<ProjectUsersResponse>('projects/1/users/');
  const availableUsers = usersData?.users || [];

  const toggleRecipient = (user: ProjectUser) => {
    setSelectedRecipients(prev => {
      const isSelected = prev.some(r => r.id === user.id);
      if (isSelected) {
        return prev.filter(r => r.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const removeRecipient = (userId: number) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== userId));
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
            recipientId: recipient.id,
            requestDetails: message,
            optionalNote: note || '',
            dueDate: date ? format(date, 'yyyy-MM-dd') : null,
          },
        })
      );

      await Promise.all(promises);

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
        <Button className={cn('bg-transparent text-black border border-[#D1D5DC] hover:bg-transparent', wFull && 'w-full')}>
          <span className="mr-2">+</span>
          Request Info
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[420px] bg-white p-0">
        <DialogHeader className="py-[22px] px-6 border-b border-[#E5E7EB]">
          <DialogTitle className="text-lg text-[#1A1F36]">Request Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6">
          <div className="space-y-5">
            {/* Recipient Multi-Select */}
            <div>
              <Label className="text-sm text-[#1A1F36]">
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
                        {selectedRecipients.map((user) => (
                          <Badge
                            key={user.id}
                            variant="secondary"
                            className="mr-1 mb-1 bg-[#F3F4F6] text-[#1A1F36] hover:bg-[#E5E7EB]"
                          >
                            {user.name}
                            <button
                              className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  removeRecipient(user.id);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeRecipient(user.id);
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
                    <CommandInput placeholder="Search team members..." />
                    <CommandList>
                      <CommandEmpty>No team member found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map((user) => {
                          const isSelected = selectedRecipients.some(r => r.id === user.id);
                          return (
                            <CommandItem
                              key={user.id}
                              value={user.name}
                              onSelect={() => toggleRecipient(user)}
                              className="cursor-pointer w-full"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  {/* Avatar circle with first letter */}
                                  <div className="h-8 w-8 rounded-full bg-[#8081F6] flex items-center justify-center text-white text-sm font-medium">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{user.name}</span>
                                    <span className="text-xs text-muted-foreground">{user.role || 'No role'}</span>
                                  </div>
                                </div>
                                {/* Radio-like check circle */}
                                <div className={cn(
                                  "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                                  isSelected
                                    ? "border-[#8081F6] bg-[#8081F6]"
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
              <Label className="text-sm text-[#1A1F36] mb-2">
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
              <Label htmlFor="message" className="text-sm text-[#1A1F36]">
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
              <Label htmlFor="note" className="text-sm text-[#1A1F36]">
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
