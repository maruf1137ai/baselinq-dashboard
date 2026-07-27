import React, { useState, useRef, useEffect } from "react";
import { Send, User, MessageSquare, Info, Shield, Clock, ChevronRight, AlertCircle, MoreHorizontal, FileText } from "lucide-react";
import AiIcon from "@/components/icons/AiIcon";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/dateUtils";
import { fetchData, postData } from "@/lib/Api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatSource {
  clause_number: string;
  clause_title: string;
  page_number: string | number;
  similarity: number;
  excerpt: string;
  document_name?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ChatSource[];
}

interface AIChatInterfaceProps {
  taskType: string;
  data: any;
}

export function AIChatInterface({ taskType, data }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const taskTypeId = taskType === "CRITICALPATHITEM" ? "CPI" : taskType;
  const chatUrl = `ai_analysis/${taskTypeId.toLowerCase()}/${data.id}/chat/`;

  useEffect(() => {
    if (historyLoaded || !data.id) return;

    const loadChatHistory = async () => {
      try {
        const response = await fetchData(chatUrl);
        // Backend returns { messages: [...] }
        if (response?.messages && response.messages.length > 0) {
          const formattedMessages: Message[] = response.messages.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content || "",
            timestamp: new Date(msg.created_at),
            sources: msg.sources || [],
          }));
          setMessages(formattedMessages);
          setHistoryLoaded(true);
        } else {
          // No existing session — request welcome summary via init action
          setHistoryLoaded(true);
          setIsInitializing(true);
          try {
            const initResponse = await postData({
              url: chatUrl,
              data: { action: "init" },
            });
            if (initResponse?.messages && initResponse.messages.length > 0) {
              const loaded: Message[] = initResponse.messages.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content || "",
                timestamp: new Date(m.created_at),
                sources: m.sources || [],
              }));
              setMessages(loaded);
            }
          } catch {
            // Welcome generation failed — show default greeting
            setMessages([
              {
                role: 'assistant',
                content: `Hello! I've analyzed the ${taskType} documentation. How can I help you with the contractual compliance or site implications today?`,
                timestamp: new Date(),
              }
            ]);
          } finally {
            setIsInitializing(false);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setHistoryLoaded(true);
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I've analyzed the ${taskType} documentation. How can I help you with the contractual compliance or site implications today?`,
            timestamp: new Date(),
          }
        ]);
      }
    };

    loadChatHistory();
  }, [chatUrl, data.id, taskType, historyLoaded]);

  const suggestions = [
    `What are the critical risks in this ${taskType}?`,
    `Which contract clauses apply to the timeline?`,
    `Is there any cost impact I should be aware of?`,
    `What are my immediate next steps?`,
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      const response = await postData({
        url: chatUrl,
        data: { message: text }
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply || response.content || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
        sources: response.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat API error:", err);
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || "Failed to get response from AI. Please try again.");
      toast.error(backendMessage || "AI Communication Error");

      // Remove the optimistic user message if it failed? 
      // Or just leave it and show error.
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-muted/50 rounded-xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] relative">
      {/* Premium Header */}
      <div className="px-6 py-4 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg p-1">
              <img src="/LOGO-ai.png" alt="AI Logo" className="w-full h-full object-contain scale-110" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-[#00b894] border-2 border-white rounded-full" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-[#1a1a2e] leading-tight flex items-center gap-1.5">
              Linq Contract
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-gray-200">
        {isInitializing && messages.length === 0 && (
          // <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
          //   <div className="relative">
          //     <div className="w-16 h-16 rounded-full bg-[#f8f7ff] flex items-center justify-center border border-[#6c5ce7]/10">
          //       <Sparkles className="h-8 w-8 text-[#6c5ce7] animate-pulse" />
          //     </div>
          //   </div>
          //   <div className="max-w-[280px]">
          //     <p className="text-sm font-medium text-[#1a1a2e]">Initializing Briefing...</p>
          //     <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed font-normal">
          //       Analyzing {taskType} documentation and synchronizing with standard contract protocols via RAG.
          //     </p>
          //   </div>
          // </div>
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="ai-orb-loader">
              <div className="ai-orb-wave" />
              <div className="ai-orb-wave" />
              <div className="ai-orb-wave" />
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex animate-in fade-in slide-in-from-bottom-3 duration-500",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "shrink-0 mt-1",
              msg.role === 'user' ? "ml-3" : "mr-3"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium shadow-sm",
                msg.role === 'assistant'
                  ? "bg-card border border-border text-[#6c5ce7]"
                  : "bg-gradient-to-tr from-[#6c5ce7] to-[#a29bfe] text-white"
              )}>
                {msg.role === 'assistant' ? <AiIcon size={16} /> : <User className="h-4 w-4" />}
              </div>
            </div>

            <div className={cn(
              "flex flex-col max-w-[82%]",
              msg.role === 'user' ? "items-end" : "items-start"
            )}>
              {/* Bubble */}
              <div className={cn(
                "px-5 py-4 rounded-xl shadow-sm text-sm leading-[1.7]",
                msg.role === 'assistant'
                  ? "bg-card border border-border text-[#2d3748] rounded-tl-none font-medium"
                  : "bg-[#6c5ce7] text-white rounded-tr-none font-medium"
              )}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0 font-normal">{children}</p>,
                      strong: ({ children }) => <strong className="font-medium text-[#1a1a2e]">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-2 my-3 p-3 bg-muted/50 rounded-xl font-normal">{children}</ul>,
                      li: ({ children }) => <li className="pl-1 font-normal">{children}</li>,
                      h1: ({ children }) => <h1 className="text-base font-medium mb-3 text-[#1a1a2e] border-b pb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-medium mb-2 text-[#1a1a2e]">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-medium mb-1.5 text-[#4a5568] uppercase tracking-wide">{children}</h3>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>

              {/* Citations (inline pills with hover popover) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.sources.map((source, si) => (
                    <div key={si} className="relative group">
                      <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors cursor-default">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Clause {source.clause_number}</span>
                      </button>
                      <div className="absolute bottom-full left-0 mb-1.5 w-80 p-3 rounded-lg bg-popover border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                        {source.document_name && (
                          <p className="text-xs font-medium text-primary/70 mb-1 truncate">{source.document_name}</p>
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-xs font-normal text-foreground truncate">{source.clause_title}, Page {source.page_number}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{source.excerpt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <span className="text-xs font-medium text-[#cbd5e0] uppercase tracking-tighter mt-2 hover:text-[#94a3b8] transition-colors">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4 max-w-[90%] mr-auto animate-in fade-in duration-300">
            <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm text-[#6c5ce7]">
              <AiIcon size={16} />
            </div>
            <div className="bg-muted p-4 rounded-xl rounded-tl-none border border-border flex flex-col items-center gap-2">
              <div className="ai-orb-loader !w-6 !h-6 translate-y-0.5">
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
              </div>
              <span className="text-xs text-primary/60 font-medium animate-pulse">Analyzing context...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-auto flex items-center gap-3 p-4 bg-red-50/50 border border-red-100 rounded-xl text-red-600 text-xs font-medium animate-in shake duration-500">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Premium Input Area */}
      <div className="p-6 bg-card border-t border-border">
        <div className="max-w-[100%] mx-auto space-y-5">
          {messages.length < 3 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
              <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-[0.2em] mr-2 shrink-0">Prompts:</span>
              {suggestions.map((suggest) => (
                <button
                  key={suggest}
                  onClick={() => handleSend(suggest)}
                  className="whitespace-nowrap text-xs font-medium text-[#4b5563] bg-card hover:bg-[#6c5ce7] hover:text-white px-4 py-2 rounded-full border border-border hover:border-[#6c5ce7] transition-all duration-300 shadow-sm active:scale-95"
                >
                  {suggest}
                </button>
              ))}
            </div>
          )}

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#6c5ce7]/5 to-[#a29bfe]/5 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Examine compliance, risks, or schedule impacts..."
                rows={1}
                className="w-full bg-muted/50 border-2 border-border rounded-lg pl-6 pr-14 py-4 text-sm font-medium text-[#1a1a2e] focus:outline-none focus:bg-card focus:border-[#6c5ce7] transition-all duration-300 placeholder:text-[#94a3b8] placeholder:font-normal resize-none overflow-hidden leading-relaxed"
              />
              <button
                aria-label="Send message"
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className={cn(
                  "absolute right-2.5 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
                  input.trim() && !isTyping
                    ? "bg-[#6c5ce7] text-white hover:bg-[#5a4ccb] hover:scale-105 shadow-lg shadow-purple-200"
                    : "bg-muted text-[#cbd5e0] cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
