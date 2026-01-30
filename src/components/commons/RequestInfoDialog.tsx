'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function RequestInfoDialog({ wFull, onSubmit }: { wFull?: boolean; onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');

  const handleSend = () => {
    const requestData = {
      recipient,
      date: date ? date.toISOString() : null, // Ensure serializable
      message,
      note,
      createdAt: new Date().toISOString()
    };
    
    onSubmit(requestData);
    setOpen(false);
    
    // Reset form
    setRecipient('');
    setMessage('');
    setNote('');
    setDate(undefined);
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
            {/* Recipient */}
            <div>
              <Label htmlFor="recipient" className="text-sm text-[#1A1F36]">
                Recipient(s)
              </Label>
              <Input 
                id="recipient" 
                placeholder="David Contractor, Sarah Johnson" 
                className="mt-2" 
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
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
            <Button onClick={handleSend}>Send Request</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
