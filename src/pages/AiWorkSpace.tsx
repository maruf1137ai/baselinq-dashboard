import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUp, FileText, Globe, PanelLeft } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { ChatSidebar } from '@/components/WorkSpace/ChatSidebar';
import { DashboardLayout } from '@/components/DashboardLayout';
import BaseLinkAI from '@/components/icons/BaseLinkAI';
import Clip from '@/components/icons/Clip';
import { fetchData, postData } from '@/lib/Api';
import ReactMarkdown from 'react-markdown';
import { PriceBreakdown } from '@/components/AIAnalysis/PriceBreakdown';
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";

interface ChatSource {
  clause_number: string;
  clause_title: string;
  page_number: string | number;
  similarity: number;
  excerpt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  price_breakdown?: any;
}


const AiWorkSpace = () => {
  const { taskTypeSlug, taskId } = useParams<{ taskTypeSlug: string; taskId: string }>();
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(' ')[0] || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatUrl = taskTypeSlug && taskId
    ? `ai_analysis/${taskTypeSlug.toLowerCase()}/${taskId}/chat/`
    : null;

  // Load chat history from API when task params are present
  useEffect(() => {
    if (!chatUrl) return;

    const loadChatHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetchData(chatUrl);
        // console.log(response);
        if (response?.messages && response.messages.length > 0) {
          const formatted: Message[] = response.messages.map((msg: any, i: number) => ({
            id: msg.id?.toString() || `hist-${i}`,
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content || '',
            sources: msg.sources || [],
            price_breakdown: msg.price_breakdown || null,
          }));
          setMessages(formatted);
        } else {
          // No existing session — initialize with welcome summary
          try {
            const initResponse = await postData({
              url: chatUrl,
              data: { action: 'init' },
            });
            if (initResponse?.messages && initResponse.messages.length > 0) {
              const loaded: Message[] = initResponse.messages.map((m: any, i: number) => ({
                id: m.id?.toString() || `init-${i}`,
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content || '',
                sources: m.sources || [],
                price_breakdown: m.price_breakdown || null,
              }));
              setMessages(loaded);
            }
          } catch {
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: `Hello! I've analyzed the ${taskTypeSlug?.toUpperCase()} documentation. How can I help you today?`,
              },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I've analyzed the ${taskTypeSlug?.toUpperCase()} documentation. How can I help you today?`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatHistory();
  }, [chatUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (chatUrl) {
      // Real API call
      try {
        const response = await postData({
          url: chatUrl,
          data: { message: userMessage.content },
        });
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.reply || response.content || "I'm sorry, I couldn't process that request.",
          sources: response.sources || [],
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (err) {
        console.error('Chat API error:', err);
        toast.error('Failed to get AI response. Please try again.');
      } finally {
        setIsTyping(false);
      }
    } else {
      // No task context — simulated response
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Please open a specific task to start an AI-assisted conversation with full contract context.',
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1000);
    }
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
  };

  const hasMessages = messages.length > 0 || isLoading;

  return (
    <DashboardLayout padding="p-0">
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="px-6 py-4 border-b border-border">
          <h1 className="text-2xl font-normal tracking-tight text-foreground">Linq</h1>
        </div>
        <div className="flex flex-1 overflow-hidden">
        <ChatSidebar onNewChat={handleNewChat} open={true} onToggle={() => {}} />
        {hasMessages && (
          <div className="flex flex-1 flex-col min-w-0">
                        {/* Main Chat Area */}
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-4xl px-3 sm:px-6 pt-4 pb-2">
                {isLoading && messages.length === 0 && (
                  <div className="flex items-center justify-center py-20">
                    <AwesomeLoader message="Analyzing context" />
                  </div>
                )}
                {messages.map(message => (
                  <div key={message.id} className="mb-6">
                    {message.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] text-sm rounded-lg bg-sidebar px-4 py-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0 p-1">
                          <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <div className="prose prose-sm max-w-none text-justify">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground mb-2 last:mb-0 text-justify">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-foreground">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-foreground">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed text-justify">{children}</li>,
                                h1: ({ children }) => <h1 className="text-sm font-bold mb-2 text-foreground">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 text-foreground">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-foreground">{children}</h3>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          {/* Price Breakdown (VO only) */}
                          {message.price_breakdown?.items_analysis?.length > 0 && (
                            <div className="mt-4">
                              <PriceBreakdown
                                priceData={message.price_breakdown}
                                visibleSections={999}
                                startSelector={0}
                              />
                            </div>
                          )}
                          {/* Citations (ChatGPT style) */}
                          {(() => {
                            const hasClauseSources = message.sources && message.sources.length > 0;
                            const hasPriceSources = message.price_breakdown?.items_analysis?.some(
                              (item: any) => item.market_verification?.web_search_result || item.market_verification?.sources?.length
                            );
                            if (!hasClauseSources && !hasPriceSources) return null;

                            // Build combined citation list
                            const citations: { type: 'clause' | 'market'; label: string; detail: string; subtext: string }[] = [];

                            // Contract clause citations
                            message.sources?.forEach((source) => {
                              citations.push({
                                type: 'clause',
                                label: `Clause ${source.clause_number}`,
                                detail: `${source.clause_title}, Page ${source.page_number}`,
                                subtext: source.excerpt,
                              });
                            });

                            // Market price citations from price_breakdown
                            message.price_breakdown?.items_analysis?.forEach((item: any) => {
                              const mv = item.market_verification;
                              if (mv?.sources?.length) {
                                mv.sources.forEach((src: string) => {
                                  if (src && src !== 'Internal estimation model - web search recommended') {
                                    citations.push({
                                      type: 'market',
                                      label: item.description?.slice(0, 25) + (item.description?.length > 25 ? '...' : ''),
                                      detail: `${src}, ${item.description}`,
                                      subtext: mv.assessment || '',
                                    });
                                  }
                                });
                              }
                            });

                            if (citations.length === 0) return null;

                            return (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {citations.map((cite, ci) => (
                                  <div key={ci} className="relative group">
                                    <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors cursor-default">
                                      {cite.type === 'clause' ? (
                                        <FileText className="h-3 w-3 text-muted-foreground" />
                                      ) : (
                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      <span className="text-xs text-muted-foreground font-medium">{cite.label}</span>
                                    </button>
                                    {/* Hover popover */}
                                    <div className="absolute bottom-full left-0 mb-1.5 w-72 p-3 rounded-lg bg-popover border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        {cite.type === 'clause' ? (
                                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                        ) : (
                                          <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                                        )}
                                        <p className="text-xs font-semibold text-foreground truncate">{cite.detail}</p>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{cite.subtext}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="mb-6 flex gap-3">
                    <BaseLinkAI />
                    <div className="flex-1">
                      <div className="inline-block rounded-lg bg-sidebar px-4 py-3">
                        <p className="text-sm text-muted-foreground animate-pulse">Analyzing context...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-3 sm:px-6 py-4">
              <div className="mx-auto max-w-4xl">
                <div className="relative flex items-end gap-2 rounded-lg border border-border bg-[#F9F9F9] px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Clip />
                  </Button>
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="How can Link AI assist you today?"
                    className="min-h-[24px] max-h-[200px] resize-none border-0 px-0 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={1}
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="h-8 w-8 disabled:bg-[#E0E0E0] shrink-0 rounded-full"
                    disabled={!input.trim() || isTyping}
                  >
                    <ArrowUp />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* New chat interface (no task context) */}
        {!hasMessages && (
          <div className="h-full w-full flex flex-col bg-gradient-to-b from-white via-white to-[#F4F4FF]">
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-[680px] mx-auto px-4">

                {/* Brand badge */}
                {/* <div className="flex justify-center mb-8">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] text-white text-xs font-medium">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      <img src="/LOGO-ai.png" alt="Linq AI" className="w-full h-full object-contain" />
                    </div>
                    <span>Linq AI</span>
                  </div>
                </div> */}

                {/* Greeting heading with inline logo */}
                <h2 className="text-2xl sm:text-2xl font-normal tracking-tight text-center text-foreground mb-8 flex items-center justify-center gap-3 flex-wrap">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center p-1.5 shrink-0">
                    <img src="/LOGO-ai.png" alt="Linq AI" className="w-full h-full object-contain" />
                  </div>
                  {firstName ? `What can I help with, ${firstName}?` : 'What can I help with?'}
                </h2>

                {/* Input with bottom toolbar */}
                <div className="rounded-2xl bg-white border border-border shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#8081F6]/30 focus-within:border-[#8081F6] transition-all">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Drop your question here..."
                    className="min-h-[90px] max-h-[200px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={3}
                  />
                  {/* Bottom toolbar */}
                  <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Clip />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSend}
                        size="icon"
                        className="h-8 w-8 disabled:bg-[#E0E0E0] shrink-0 rounded-full"
                        disabled={!input.trim() || isTyping}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Suggested prompt chips */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  {[
                    "What are my overdue obligations this week?",
                    "Summarise the key risks in CONT-001",
                    "Which VOs are pending approval and what's the combined value?",
                    "What does the contract say about delay penalties?",
                    "Flag any payment certificates missing supporting docs",
                    "What compliance items block the next payment?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                      className="text-xs text-muted-foreground bg-white hover:bg-primary hover:text-white px-3 py-1.5 rounded-full border border-border hover:border-primary transition-all duration-200 active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
};

export default AiWorkSpace;
