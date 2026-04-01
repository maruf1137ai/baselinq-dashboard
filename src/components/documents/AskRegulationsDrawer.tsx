import React, { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Paperclip,
  ExternalLink,
  CheckCircle2,
  Link2,
  Download,
  Share2,
  ChevronRight,
  FileText,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import AiIcon from '@/components/icons/AiIcon';
import { cn } from '@/lib/utils';

interface AskRegulationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Array<{
    docName: string;
    version: string;
    clause: string;
    page: string;
    snippet?: string;
  }>;
  followUps?: string[];
  hasActions?: boolean;
}

const mockDocuments = [
  'JBCC Principal Building Agreement (v3)',
  'Structural Engineering Report (v2)',
  'Fire Safety Certificate (v1)',
  'HVAC Technical Specifications (v4)',
  'Site Layout Drawing (v5)',
  'Revised Payment Schedule (v1)',
  'Health & Safety Protocol (v2)'
];

const initialSuggestedQuestions = [
  "What are the payment terms?",
  "What happens with unforeseen conditions?",
  "What are the contractor's delay obligations?",
  "What is the defects liability period?",
  "What are the extension of time procedures?",
  "What fire safety requirements apply?"
];

export const AskRegulationsDrawer: React.FC<AskRegulationsDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const handleSend = (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI Response
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `### Extension of Time — JBCC Provisions\n\nUnder your JBCC Principal Building Agreement, the contractor is entitled to an extension of time in the following circumstances:\n\n1. **Delays caused by the employer** or principal agent (Clause 29.1)\n2. **Unforeseen circumstances** beyond the contractor's control (Clause 29.3)\n3. **Delays due to variations** instructed by the principal agent (Clause 29.2)\n\nThe contractor must notify the principal agent of any delay within 20 working days of becoming aware of the cause (Clause 29.4).\n\nThe principal agent must assess and grant or refuse the extension within 15 working days of receiving the contractor's substantiation (Clause 29.5).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          { docName: 'JBCC Principal Building Agreement', version: 'v3', clause: 'Clause 29.1', page: '34' },
          { docName: 'JBCC Principal Building Agreement', version: 'v3', clause: 'Clause 29.2', page: '35' },
          { docName: 'JBCC Principal Building Agreement', version: 'v3', clause: 'Clause 29.3', page: '35' },
          { docName: 'JBCC Principal Building Agreement', version: 'v3', clause: 'Clause 29.4', page: '36' },
          { docName: 'JBCC Principal Building Agreement', version: 'v3', clause: 'Clause 29.5', page: '37' },
          { docName: 'Structural Engineering Report', version: 'v2', clause: 'Section 4.2', page: '12', snippet: 'mentions foundation delay risks' },
        ],
        followUps: [
          "What are valid grounds for delay claims?",
          "What penalties apply for late completion?",
          "How is the new completion date calculated?"
        ],
        hasActions: true
      };
      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="sm:max-w-[750px] p-0 flex flex-col bg-white h-full shadow-2xl border-l z-[100] gap-0">
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#8081F6]/10 rounded-xl flex items-center justify-center">
              <AiIcon size={20} className="text-[#8081F6]" />
            </div>
            <div>
              <SheetTitle className="text-base font-normal text-foreground">Ask Regulations</SheetTitle>
              <p className="text-xs text-gray-500 font-normal">Search across all {mockDocuments.length} project documents</p>
            </div>
          </div>
        </SheetHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar bg-muted/50 px-6 py-3 space-y-5"
        >
          {messages.length === 0 ? (
            <div className="space-y-8 max-w-2xl mx-auto pt-4">
              {/* Context Card */}
              <div className="bg-white rounded-full border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-foreground font-normal">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Searching across:</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {mockDocuments.slice(0, 5).map(doc => (
                    <div key={doc} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50/50 px-3 py-2 rounded-lg border border-gray-100/50">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {doc}
                    </div>
                  ))}
                  <div className="text-xs text-gray-400 pl-4 mt-1 font-normal italic">
                    + 2 more documents
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-4">
                <h4 className="text-xs font-normal text-gray-400 uppercase tracking-widest pl-1">Suggested Questions</h4>
                <div className="flex flex-wrap gap-2">
                  {initialSuggestedQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="px-5 py-2.5 bg-white border border-gray-100 hover:border-primary/30 hover:bg-primary/[0.02] text-sm text-gray-600 rounded-2xl transition-all shadow-sm font-normal text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-3",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-full px-5 py-3.5 text-sm leading-relaxed font-normal shadow-sm",
                    msg.role === 'user'
                      ? "bg-[#1A1F36] text-white rounded-tr-none"
                      : "bg-white border border-gray-100 text-foreground rounded-tl-none"
                  )}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-6 w-6 bg-[#8081F6]/10 rounded-lg flex items-center justify-center">
                          <AiIcon size={14} className="text-[#8081F6]" />
                        </div>
                        <span className="text-xs text-gray-400 font-normal">Contract AI • {msg.timestamp}</span>
                      </div>
                    )}

                    <div className="prose prose-sm prose-gray max-w-none">
                      {/* Render multiline text or markdown-ish content */}
                      {msg.content.split('\n').map((line, i) => {
                        if (line.startsWith('###')) return <h3 key={i} className="text-lg font-normal mb-4 mt-2">{line.replace('### ', '')}</h3>;
                        if (line.startsWith('---')) return <hr key={i} className="my-6 border-gray-100" />;

                        // Simple regex to highlighting "Clause X.Y" as chips
                        const parts = line.split(/(Clause \d+\.\d+|Section \d+\.\d+)/g);
                        return (
                          <p key={i} className="leading-relaxed">
                            {parts.map((part, pi) => (
                              /(Clause \d+\.\d+|Section \d+\.\d+)/.test(part) ? (
                                <Badge key={pi} variant="secondary" className="mx-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100 rounded-md px-1.5 font-normal">
                                  {part}
                                </Badge>
                              ) : part
                            ))}
                          </p>
                        );
                      })}
                    </div>

                    {msg.citations && (
                      <div className="mt-8 space-y-4 pt-6 border-t border-gray-50">
                        <h4 className="text-xs font-normal text-gray-400 uppercase tracking-widest pl-1">Sources</h4>
                        <div className="space-y-3">
                          {msg.citations.map((cite, ci) => (
                            <div key={ci} className="bg-gray-50/50 border border-gray-100/50 rounded-xl p-3 flex items-start justify-between group/source hover:bg-white hover:border-primary/20 transition-all">
                              <div className="flex gap-3">
                                <div className="mt-1 h-6 w-6 rounded bg-white border border-gray-100 flex items-center justify-center shrink-0">
                                  <FileText className="h-3 w-3 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-normal text-gray-900 mb-0.5">
                                    {cite.docName} ({cite.version})
                                  </p>
                                  <p className="text-xs text-gray-500 font-normal">
                                    {cite.clause}, Page {cite.page} {cite.snippet && `· (${cite.snippet})`}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover/source:opacity-100 text-primary">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.hasActions && (
                      <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-all">
                          <CheckCircle2 className="h-3 w-3" /> Create Obligation
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all">
                          <Link2 className="h-3 w-3" /> Link to Document
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-gray-50 transition-all">
                          <Download className="h-3 w-3" /> Export Answer
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-gray-50 transition-all">
                          <Share2 className="h-3 w-3" /> Share
                        </Button>
                      </div>
                    )}
                  </div>

                  {msg.followUps && (
                    <div className="mt-2 space-y-3">
                      <h4 className="text-xs font-normal text-gray-400 uppercase tracking-widest pl-6">Follow-up Questions</h4>
                      <div className="flex flex-col gap-2 pl-6">
                        {msg.followUps.map(f => (
                          <button
                            key={f}
                            onClick={() => handleSend(f)}
                            className="bg-white border border-gray-100 hover:border-[#8081F6]/30 hover:bg-[#8081F6]/[0.02] text-xs text-gray-600 px-4 py-2.5 rounded-2xl w-fit transition-all shadow-sm font-normal text-left flex items-center gap-2 group"
                          >
                            {f} <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex flex-col gap-3 items-start">
                  <div className="bg-white border border-gray-100 rounded-full rounded-tl-none p-6 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-1.5 bg-[#8081F6] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 bg-[#8081F6] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 bg-[#8081F6] rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-5 border-t bg-white shrink-0">
          <div className="relative flex items-center bg-gray-50 border border-gray-100 rounded-3xl px-4 py-2 focus-within:bg-white focus-within:border-[#8081F6]/30 focus-within:ring-4 focus-within:ring-[#8081F6]/5 transition-all">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              rows={1}
              placeholder="Ask about regulations, clauses, or obligations..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent py-2 px-2 text-sm font-normal transition-all resize-none min-h-[40px] max-h-[200px] outline-none"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!inputValue.trim()}
              className="h-10 w-10 p-0 rounded-2xl bg-[#8081F6] hover:bg-[#8081F6]/90 shadow-lg shadow-[#8081F6]/20 transition-all disabled:opacity-50 disabled:shadow-none shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {/* <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400 font-normal">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verifiable Citations</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Multi-doc context</span>
            <button className="hover:text-gray-600 transition-colors">Privacy Policy</button>
          </div> */}
        </div>
      </SheetContent>
    </Sheet>
  );
};
