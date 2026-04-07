import React, { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
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
  ArrowRight,
  Loader2,
} from 'lucide-react';
import AiIcon from '@/components/icons/AiIcon';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchData, postData } from '@/lib/Api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface AskRegulationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
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
    clauseTitle?: string;
    page: string;
    snippet?: string;
  }>;
  followUps?: string[];
  hasActions?: boolean;
}

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
  onClose,
  documentId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const projectId = localStorage.getItem('selectedProjectId');
  const isProjectLevel = !documentId;

  // Determine which endpoints to use
  const historyUrl = isProjectLevel
    ? (projectId ? `documents/${projectId}/chat-with-documents/` : '')
    : `documents/chat/?document=${documentId}`;

  const sendUrl = isProjectLevel
    ? (projectId ? `documents/${projectId}/chat-with-documents/` : 'documents/chat/')
    : 'documents/chat/';

  // Load chat history
  const { data: historyData } = useQuery({
    queryKey: ['document-chat', documentId || projectId],
    queryFn: () => fetchData(historyUrl),
    enabled: isOpen && !!historyUrl,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (historyData?.messages && messages.length === 0) {
      const mapped = historyData.messages.map((msg: any, i: number) => ({
        id: msg._id || `hist-${i}`,
        role: msg.role || (msg.isUser ? 'user' : 'assistant'),
        content: msg.content || msg.message || '',
        timestamp: msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        citations: msg.sources?.map((s: any) => ({
          docName: s.document_name || s.documentName || '',
          version: '',
          clause: s.clause_number || s.clause || '',
          clauseTitle: s.clause_title || '',
          page: s.page_number?.toString() || s.page || '',
          snippet: s.excerpt || s.snippet || '',
        })),
        followUps: msg.followUps,
        hasActions: msg.role === 'assistant',
      }));
      setMessages(mapped);
    }
  }, [historyData]);

  // Reset messages when drawer closes
  useEffect(() => {
    if (!isOpen) setMessages([]);
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Send message mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (message: string) => {
      const data: any = { message };
      if (isProjectLevel) {
        data.projectId = projectId;
      } else {
        data.documentId = documentId;
      }
      return postData({ url: sendUrl, data });
    },
    onSuccess: (response) => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply || response.content || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.sources?.map((s: any) => ({
          docName: s.document_name || s.documentName || '',
          version: '',
          clause: s.clause_number || s.clause || '',
          clauseTitle: s.clause_title || '',
          page: s.page_number?.toString() || s.page || '',
          snippet: s.excerpt || s.snippet || '',
        })),
        followUps: response.followUps,
        hasActions: true,
      };
      setMessages(prev => [...prev, assistantMsg]);
    },
    onError: () => {
      toast.error('Failed to get AI response.');
    },
  });

  // Create obligation from chat
  const { mutate: createObligationFromChat } = useMutation({
    mutationFn: (data: { documentId?: string; title: string }) =>
      postData({ url: 'documents/chat/create-obligation/', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obligations'] });
      toast.success('Obligation created from chat.');
    },
    onError: () => toast.error('Failed to create obligation.'),
  });

  // Export chat answer
  const { mutate: exportAnswer } = useMutation({
    mutationFn: (data: { question?: string; content: string; sources?: any[] }) =>
      postData({ url: 'documents/chat/export/', data, config: { responseType: 'blob' } }),
    onSuccess: (response) => {
      const blob = new Blob([response], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = 'chat-export.md';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Answer exported.');
    },
    onError: () => toast.error('Failed to export answer.'),
  });

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
    sendMessage(text);
  };

  // Find the last assistant message for action buttons context
  const getLastAssistantMessage = () => messages.filter(m => m.role === 'assistant').pop();

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
              <p className="text-xs text-gray-500 font-normal">
                {isProjectLevel ? 'Search across all project documents' : 'Search within this document'}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar bg-muted/50 px-6 py-3 space-y-5"
        >
          {messages.length === 0 ? (
            <div className="space-y-8 max-w-2xl mx-auto pt-4">
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
                    "max-w-[85%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed font-normal shadow-sm",
                    msg.role === 'user'
                      ? "bg-[#1A1F36] text-white rounded-tr-none"
                      : "bg-white border border-gray-100 text-foreground rounded-tl-none"
                  )}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-6 w-6 bg-[#8081F6]/10 rounded-lg flex items-center justify-center">
                          <AiIcon size={14} className="text-[#8081F6]" />
                        </div>
                        <span className="text-xs text-gray-400 font-normal">Contract AI &bull; {msg.timestamp}</span>
                      </div>
                    )}

                    {msg.role === 'user' ? (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : (
                      <div className="prose prose-sm prose-gray max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed font-normal text-sm text-gray-700">{children}</p>,
                            strong: ({ children }) => <strong className="font-normal text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
                            h1: ({ children }) => <h1 className="text-lg font-normal mb-3 mt-4 text-gray-900 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-normal mb-2 mt-4 text-gray-900 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-normal mb-2 mt-3 text-gray-800 first:mt-0">{children}</h3>,
                            ul: ({ children }) => <ul className="list-disc list-outside space-y-1.5 my-2 ml-4 font-normal">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-outside space-y-2 my-3 ml-4 font-normal">{children}</ol>,
                            li: ({ children }) => <li className="text-sm leading-relaxed text-gray-700 pl-1 font-normal">{children}</li>,
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-3 border-purple-300 bg-purple-50/50 pl-4 pr-3 py-2 my-3 rounded-r-lg text-sm italic text-gray-600">
                                {children}
                              </blockquote>
                            ),
                            hr: () => <hr className="my-5 border-gray-100" />,
                            code: ({ children, className }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code className="bg-gray-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                              ) : (
                                <code className="block bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto my-2">{children}</code>
                              );
                            },
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 underline decoration-purple-300 underline-offset-2">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-8 space-y-4 pt-6 border-t border-gray-50">
                        <h4 className="text-xs font-normal text-gray-400 uppercase tracking-widest pl-1">Sources</h4>
                        <div className="space-y-3">
                          {msg.citations.map((cite, ci) => (
                            <div key={ci} className="bg-gray-50/50 border border-gray-100/50 rounded-xl p-3 flex items-start justify-between group/source hover:bg-white hover:border-primary/20 transition-all">
                              <div className="flex gap-3">
                                <div className="mt-1 h-6 w-6 rounded bg-white border border-gray-100 flex items-center justify-center shrink-0">
                                  <FileText className="h-3 w-3 text-gray-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-900 mb-0.5">
                                    {cite.docName}
                                  </p>
                                  <p className="text-xs text-gray-600 font-normal">
                                    {cite.clause && <span className="text-purple-600 font-medium">Clause {cite.clause}</span>}
                                    {cite.clauseTitle && <span> — {cite.clauseTitle}</span>}
                                    {cite.page && <span className="text-gray-400"> · Page {cite.page}</span>}
                                  </p>
                                  {cite.snippet && (
                                    <p className="text-xs text-gray-400 font-normal mt-1 line-clamp-2 italic">
                                      "{cite.snippet}"
                                    </p>
                                  )}
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

                    {msg.role === 'assistant' && msg.hasActions && (
                      <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                          onClick={() => {
                            const title = msg.content.split('\n').find(l => l.trim())?.replace(/^#+\s*/, '').slice(0, 100) || 'Obligation from chat';
                            createObligationFromChat({ documentId, title });
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" /> Create Obligation
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-gray-50 transition-all"
                          onClick={() => exportAnswer({
                            content: msg.content,
                            sources: msg.citations,
                          })}
                        >
                          <Download className="h-3 w-3" /> Export Answer
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-full hover:bg-gray-50 transition-all">
                          <Share2 className="h-3 w-3" /> Share
                        </Button>
                      </div>
                    )}
                  </div>

                  {msg.followUps && msg.followUps.length > 0 && (
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
              {isSending && (
                <div className="flex flex-col gap-3 items-start">
                  <div className="bg-white border border-gray-100 rounded-3xl rounded-tl-none p-6 shadow-sm">
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
              disabled={!inputValue.trim() || isSending}
              className="h-10 w-10 p-0 rounded-2xl bg-[#8081F6] hover:bg-[#8081F6]/90 shadow-lg shadow-[#8081F6]/20 transition-all disabled:opacity-50 disabled:shadow-none shrink-0"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
