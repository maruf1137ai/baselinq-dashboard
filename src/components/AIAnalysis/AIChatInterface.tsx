import React, { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Sparkles, MessageSquare, Info, Shield, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchData, postData } from "@/lib/Api";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    clause: string;
    title: string;
    page: number;
    text: string;
  }>;
}

interface AIChatInterfaceProps {
  taskType: string;
  data: any;
}

export function AIChatInterface({ taskType, data }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const taskTypeId = taskType === "CRITICALPATHITEM" ? "CPI" : taskType;
  const chatUrl = `ai_analysis/${taskTypeId.toLowerCase()}/${data.id}/chat/`;

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const history = await fetchData(chatUrl);
        if (history && Array.isArray(history)) {
          const formattedMessages: Message[] = history.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content || msg.message || "",
            timestamp: new Date(msg.timestamp || msg.created_at),
            sources: msg.sources || []
          }));
          setMessages(formattedMessages);
        } else {
          // If no history, add greeting
          setMessages([
            {
              role: 'assistant',
              content: `Hello! I've analyzed the ${taskType} documentation. How can I help you with the contractual compliance or site implications today?`,
              timestamp: new Date(),
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        // Fallback to greeting on error
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I've analyzed the ${taskType} documentation. How can I help you with the contractual compliance or site implications today?`,
            timestamp: new Date(),
          }
        ]);
      }
    };

    if (data.id) {
      loadChatHistory();
    }
  }, [chatUrl, data.id, taskType]);

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
        content: response.response || response.message || response.content || "I'm sorry, I couldn't process that request.",
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

  const generateMockResponse = (query: string, type: string, data: any): string => {
    const q = query.toLowerCase();
    if (q.includes('risk')) {
      return `Based on my analysis, the primary risk for this ${type} is ${data.risk_level === 'HIGH' ? 'High' : 'Moderate'}. ${data.summary} I recommend prioritizing the compliance items listed in your report.`;
    }
    if (q.includes('clause') || q.includes('contract')) {
      return `Several clauses are relevant here. Specifically, Clause ${data.contract_citations?.[0]?.clause_number || '10.3'} regarding ${data.contract_citations?.[0]?.clause_title || 'Response Time'} is critical for ensuring this ${type} stays on track.`;
    }
    if (q.includes('cost') || q.includes('price')) {
      return `Looking at the impact assessment, the cost implications are currently categorized as ${data.potential_implications?.cost_implications?.likely ? 'Likely' : 'Unlikely'}. You should monitor any variations that might be triggered by this request.`;
    }
    return `I've cross-referenced your query with the project's Contract Schedule and the ${type} details. This ${type} is currently ${data.overall_assessment || 'being processed'}. Is there anything specific about the ${data.rfi_id || 'item'} you'd like me to clarify?`;
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
                          <span className="text-[11px] font-bold text-primary">Clause {source.clause}</span>
                          <span className="text-[10px] text-[#9CA3AF]">Page {source.page}</span>
                        </div>
                        <p className="text-[11px] text-[#4B5563] font-medium line-clamp-1">{source.title}</p>
                        <p className="text-[10px] text-[#9CA3AF] mt-1 italic line-clamp-2">"{source.text}"</p>
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
