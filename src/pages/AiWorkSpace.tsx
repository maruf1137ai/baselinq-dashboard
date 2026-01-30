import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, BarChart3, FileText, DollarSign, Calendar, FileEdit, AlertTriangle, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { ChatSidebar } from '@/components/WorkSpace/ChatSidebar';
import { DashboardLayout } from '@/components/DashboardLayout';
import BaseLinkAI from '@/components/icons/BaseLinkAI';
import BarChart from '@/components/icons/BarChart';
import Document from '@/components/icons/Document';
import Upload from '@/components/icons/Upload';
import Schedule from '@/components/icons/Schedule';
import Draft from '@/components/icons/Draft';
import Caution from '@/components/icons/Caution';
import Clip from '@/components/icons/Clip';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const quickActions = [
  { icon: BarChart, label: 'Analyse' },
  { icon: Document, label: 'Documents' },
  { icon: Upload, label: 'Finance' },
  { icon: Schedule, label: 'Schedule' },
  { icon: Draft, label: 'Draft RFI' },
  { icon: Caution, label: 'Safety Report' },
];

const AiWorkSpace = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: "Explain Schedule delay analysis like I'm five years old.",
    },
    {
      id: '2',
      role: 'assistant',
      content:
        "Sure! Projects are usually planned against an expected calendar (start dates, milestones, completion). Weather can be an unpredictable factor that causes delays (e.g., concrete can't set in heavy rain, cranes can't operate in high winds).\n\nSchedule delay analysis for weather impact is the process of quantifying how much time was lost due to adverse weather and whether the contractor deserves a time extension or cost compensation.",
    },
    {
      id: '3',
      role: 'assistant',
      content:
        "Certainly! Here's a more detailed explanation:\n\nWeather is one of the most unpredictable but unavoidable factors that affect construction and large-scale project schedules. Unlike design flaws, manpower shortages, or supply chain disruptions, weather is an external risk—completely outside the control of both contractor and client. Yet, it still has the power to derail carefully planned timelines, inflate costs, and trigger contractual disputes.\n\nThis is why schedule delay analysis (SDA) specifically for weather impact is so critical. It gives stakeholders a structured, data-backed way to determine:\n\nHow much delay the weather caused.\nWhich activities were affected.\nWhether the contractor deserves time extensions or cost relief.\nHow liability should be shared (if at all).\nWhy Weather Impact Needs Special Attention\n\nConstruction projects are weather sensitive in ways that aren't always obvious: Heavy rainfall → halts heartworks, excavation, concrete pouring, or roofing.\nExtreme heat/cold → affects curing of concrete, asphalt laying, and worker productivity.\nHigh winds → make crane operations unsafe, stop façade installations, or delay scaffolding.\nSnow/ice → block site access, damage temporary works, or slow down logistics.",
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a simulated response. In a real implementation, this would connect to an AI API.',
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    // toast.success('New chat created');
  };

  const handleQuickAction = (label: string) => {
    toast.info(`Opening ${label}...`);
  };

  return (
    <DashboardLayout padding="p-0">
      <div className="flex h-full">
        <div className="w-64 border-border bg-white">
          <ChatSidebar onNewChat={handleNewChat} />
        </div>
        {messages?.length != 0 && (
          <div className="flex flex-1 flex-col">
            {/* Main Chat Area */}
            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="mx-auto max-w-4xl px-6 py-8">
                {messages.map((message, index) => (
                  <div key={message.id} className="mb-6">
                    {message.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] text-base rounded-[6px] bg-[#F3F2F0] px-4 py-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <BaseLinkAI />
                        {/* <Avatar className="h-6 w-6 shrink-0 mt-1">
                        <AvatarFallback className="b text-xs">
                        
                        </AvatarFallback>
                      </Avatar> */}
                        <div className="flex-1">
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
                          </div>
                          {index === messages.length - 1 && (
                            <div className="mt-4 inline-block rounded-xl bg-muted px-4 py-2">
                              <p className="text-xs font-medium text-foreground">Schedule Delay Analysis – Weather Impact</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="  px-6">
              <div className="mx-auto flex max-w-4xl items-center justify-center flex-wrap gap-2">
                {quickActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.label)}
                      className="gap-2 bg-transparent rounded-[8px] text-[#334155] text-sm"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Input Area */}
            <div className="px-6 py-4">
              <div className="mx-auto max-w-4xl">
                <div className="relative flex items-end gap-2 rounded-[7px] bg-[#F9F9F9]   px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Clip />
                  </Button>
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Base AI anything..."
                    className="min-h-[24px] max-h-[200px] resize-none border-0  px-0 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={1}
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="h-8 w-8 disabled:bg-[#E0E0E0] shrink-0 rounded-full"
                    disabled={!input.trim()}
                  >
                    <ArrowUp />
                  </Button>
                </div>
                <p className="mt-3 text-center text-xs text-[#B5B5B5]">
                  Interaction Faction workspace chats aren't used to train our models. Baseline can make mistakes.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* New chat interface */}
        {messages?.length === 0 && (
          <div className="h-full w-full flex items-center justify-center">
            <div>
              <h2 className="text-[32px] text-center mb-14 text-black">What are you asking Base Ai Today?</h2>
              <div>
                {/* Quick Actions */}
                <div className="  px-6">
                  <div className="mx-auto flex max-w-4xl items-center justify-center flex-wrap gap-2">
                    {quickActions.map(action => {
                      const Icon = action.icon;
                      return (
                        <Button
                          key={action.label}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(action.label)}
                          className="gap-2 bg-transparent rounded-[8px] text-[#334155] text-sm"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Input Area */}
                <div className="px-6 py-4">
                  <div className="mx-auto max-w-4xl">
                    <div className="relative flex items-end gap-2 rounded-[7px] bg-[#F9F9F9]   px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Clip />
                      </Button>
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Base AI anything..."
                        className="min-h-[24px] max-h-[200px] resize-none border-0  px-0 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        rows={1}
                      />
                      <Button
                        onClick={handleSend}
                        size="icon"
                        className="h-8 w-8 disabled:bg-[#E0E0E0] shrink-0 rounded-full"
                        disabled={!input.trim()}
                      >
                        <ArrowUp />
                      </Button>
                    </div>
                    <p className="mt-3 text-center text-xs text-[#B5B5B5]">
                      Interaction Faction workspace chats aren't used to train our models. Baseline can make mistakes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AiWorkSpace;
