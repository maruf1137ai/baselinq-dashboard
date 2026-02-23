import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Sparkles, MessageSquare, Info, Shield, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchData, postData } from "@/lib/Api";
import { toast } from "sonner";

interface ChatSource {
  clause_number: string;
  clause_title: string;
  page_number: string | number;
  similarity: number;
  excerpt: string;
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
      setError("Failed to get response from AI. Please try again.");
      toast.error("AI Communication Error");

      // Remove the optimistic user message if it failed? 
      // Or just leave it and show error.
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[14px] overflow-hidden border border-[#E7E9EB]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#E7E9EB] bg-[#F8FAFC] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1B1C1F]">Contract Intelligence Bot</h3>
            <p className="text-[10px] text-[#6B7280]">Powered by Baselinq RAG engine</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-200">
          <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-pulse" />
          <span className="text-[10px] font-medium text-gray-600 uppercase">Context Loaded</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
        {isInitializing && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3 py-16">
            <div className="ai-orb-loader">
              <div className="ai-orb-wave" />
              <div className="ai-orb-wave" />
              <div className="ai-orb-wave" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Preparing your {taskType} summary...</p>
              <p className="text-xs text-gray-400 mt-1">Analyzing form data and cross-referencing contract clauses</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-4 max-w-[90%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
              msg.role === 'assistant'
                ? "bg-white border-[#E7E9EB] text-primary"
                : "bg-primary border-primary text-white"
            )}>
              {msg.role === 'assistant' ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </div>

            <div className="space-y-2">
              <div className={cn(
                "p-4 rounded-[16px] text-sm leading-relaxed shadow-sm",
                msg.role === 'assistant'
                  ? "bg-[#F3F4F6] text-[#374151] rounded-tl-none border border-[#E5E7EB]"
                  : "bg-primary text-white rounded-tr-none border border-primary"
              )}>
                {msg.content}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3 w-3" /> Sources cited:
                  </p>
                  <div className="grid gap-2">
                    {msg.sources.map((source, si) => (
                      <div key={si} className="p-2.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-primary/30 transition-colors cursor-help">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-primary">Clause {source.clause_number}</span>
                          <span className="text-[10px] text-[#9CA3AF]">Page {source.page_number}</span>
                        </div>
                        <p className="text-[11px] text-[#4B5563] font-medium line-clamp-1">{source.clause_title}</p>
                        <p className="text-[10px] text-[#9CA3AF] mt-1 italic line-clamp-2">"{source.excerpt}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className={cn(
                "text-[10px] text-[#9CA3AF]",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4 max-w-[90%] mr-auto">
            <div className="h-8 w-8 rounded-full bg-white border border-[#E7E9EB] flex items-center justify-center shrink-0 shadow-sm text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-[#F3F4F6] p-4 rounded-[16px] rounded-tl-none border border-[#E5E7EB] flex flex-col items-center gap-2">
              <div className="ai-orb-loader !w-6 !h-6 translate-y-0.5">
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
              </div>
              <span className="text-[10px] text-primary/60 font-medium animate-pulse">Analyzing context...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-[#E7E9EB]">
        {messages.length < 3 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((suggest) => (
              <button
                key={suggest}
                onClick={() => handleSend(suggest)}
                className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] hover:bg-[#E5E7EB] px-3 py-1.5 rounded-full border border-[#E5E7EB] transition-colors"
              >
                {suggest}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about compliance, risks, or project impact..."
            className="w-full bg-[#f8f9fa] border border-[#E7E9EB] rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={cn(
              "absolute right-2 p-2 rounded-full transition-all",
              input.trim() && !isTyping
                ? "bg-primary text-white hover:bg-primary/90 shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
            <Shield className="h-3 w-3" />
            Contractual Validation
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
            <Clock className="h-3 w-3" />
            Schedule Awareness
          </div>
        </div>
      </div>
    </div>
  );
}
