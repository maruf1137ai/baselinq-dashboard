import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowUp, FileText, Globe } from 'lucide-react';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <ChatSidebar onNewChat={handleNewChat} />
        {hasMessages && (
          <div className="flex flex-1 flex-col">
            {/* Main Chat Area */}
            <ScrollArea className="flex-1">
              <div className="mx-auto max-w-4xl px-6 pt-4 pb-2">
                {isLoading && messages.length === 0 && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center text-sm text-muted-foreground">
                      <div className="mb-2 animate-pulse">Loading chat history...</div>
                    </div>
                  </div>
                )}
                {messages.map(message => (
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
                        <div className="flex-1">
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-foreground">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-foreground">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                h1: ({ children }) => <h1 className="text-base font-bold mb-2 text-foreground">{children}</h1>,
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
                                detail: `${source.clause_title} — Page ${source.page_number}`,
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
                                      detail: `${src} — ${item.description}`,
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
                                      <span className="text-[11px] text-muted-foreground font-medium">{cite.label}</span>
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
                                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{cite.subtext}</p>
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
                      <div className="inline-block rounded-[6px] bg-[#F3F2F0] px-4 py-3">
                        <p className="text-sm text-muted-foreground animate-pulse">Analyzing context...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="px-6 py-4">
              <div className="mx-auto max-w-4xl">
                <div className="relative flex items-end gap-2 rounded-[7px] bg-[#F9F9F9] px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Clip />
                  </Button>
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask BaselinQ AI anything..."
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
          <div className="h-full w-full flex items-center justify-center">
            <div>
              <h2 className="text-[32px] text-center mb-14 text-black">Ask BaselinQ AI anything...</h2>
              <div>
                {/* Input Area */}
                <div className="px-6 py-4">
                  <div className="mx-auto max-w-4xl">
                    <div className="relative flex items-end gap-2 rounded-[7px] bg-[#F9F9F9] px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Clip />
                      </Button>
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask BaselinQ AI anything..."
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
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AiWorkSpace;
