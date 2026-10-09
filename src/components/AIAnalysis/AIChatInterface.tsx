import React, { Fragment, useState, useRef, useEffect } from "react";
import { Send, User, MessageSquare, Info, Shield, Clock, ChevronRight, AlertCircle, MoreHorizontal, FileText } from "lucide-react";
import { AiMark } from "@/components/icons/AiMark";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/dateUtils";
import { fetchData, postData } from "@/lib/Api";
import { toast } from "sonner";
import { AIMarkdown } from "./AIMarkdown";
import { AnswerFeedback } from "./AnswerFeedback";
import { PriceBreakdown } from "./PriceBreakdown";
import { LegacyPriceNotice } from "./LegacyPriceNotice";
import { RFIAnalysisSummary } from "./RFIAnalysisSummary";
import { CitationPill } from "./CitationPill";
import { type AnalysisReportProps } from "./AnalysisReport";
import { analysisSummary } from "./analysisMarkdown";
import { shownSources, type ChatSource } from "@/types/citation";


/** fetchData errors carry the backend `error` (often a code such as "task_not_found"): show text, not codes. */
function readableChatError(err: unknown): string {
  const msg = (err as Error)?.message || "";
  return msg.includes(" ") ? msg : "This chat isn't available — you may not have access to this task.";
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** The saved message's id on the server (an answer can be rated once it has one). */
  serverId?: number;
  sources?: ChatSource[];
  price_breakdown?: unknown;
  price_check_legacy?: boolean;
}

interface AIChatInterfaceProps {
  taskType: string;
  data: any;
  /**
   * The structured analysis, run by "Analyze with AI" on the task page and shown here under the
   * welcome message. The task page owns the request and the job polling, so the chat only renders
   * what it is given. Absent means the analysis was never started for this task.
   */
  analysis?: AnalysisReportProps & { show?: boolean };
}

export function AIChatInterface({ taskType, data, analysis }: AIChatInterfaceProps) {
  // The checked verdict is appended to Linq's opening message rather than arriving as a second
  // one: the welcome already reads the task against the contract, and this is the few lines it
  // cannot say on its own — what a checked analysis concluded, and what needs acting on.
  const analysisNote = analysis?.show
    ? (analysis.error
      || analysisSummary(analysis.analysisData, String(analysis.taskType || taskType).toUpperCase()))
    : "";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // Part 8c: a chat that couldn't start says why (no invented "I've analysed the documentation" greeting).
  const [initError, setInitError] = useState<string | null>(null);
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
            serverId: typeof msg.id === 'number' ? msg.id : undefined,
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content || "",
            timestamp: new Date(msg.created_at),
            sources: msg.sources || [],
            price_breakdown: msg.price_breakdown || null,
            price_check_legacy: Boolean(msg.price_check_legacy),
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
                serverId: typeof m.id === 'number' ? m.id : undefined,
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content || "",
                timestamp: new Date(m.created_at),
                sources: m.sources || [],
                price_breakdown: m.price_breakdown || null,
                price_check_legacy: Boolean(m.price_check_legacy),
              }));
              setMessages(loaded);
            }
          } catch (err: any) {
            const body = err?.response?.data || {};
            setInitError(body.message || (typeof body.error === "string" ? body.error : null)
              || "Linq couldn't start this chat. Please try again.");
          } finally {
            setIsInitializing(false);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setHistoryLoaded(true);
        setInitError(readableChatError(err));
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
        serverId: typeof response.messageId === 'number' ? response.messageId : undefined,
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

  const renderMessage = (msg: Message, i: number) => {
    // The verdict rides on Linq's opening message, under a rule, so the chat shows one message.
    const content = i === 0 && msg.role === 'assistant' && analysisNote
      ? `${msg.content}\n\n---\n\n${analysisNote}`
      : msg.content;
    return (
    <div
      key={i}
      className={cn(
        "flex animate-in fade-in slide-in-from-bottom-3 duration-500",
        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn("shrink-0 mt-1", msg.role === 'user' ? "ml-3" : "mr-3")}>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium shadow-sm",
          msg.role === 'assistant'
            ? "bg-card border border-border text-[#6c5ce7]"
            : "bg-gradient-to-tr from-[#6c5ce7] to-[#a29bfe] text-white"
        )}>
          {msg.role === 'assistant' ? <AiMark size={16} /> : <User className="h-4 w-4" />}
        </div>
      </div>

      <div className={cn("flex flex-col max-w-[82%]", msg.role === 'user' ? "items-end" : "items-start")}>
        {/* Bubble */}
        <div className={cn(
          "px-5 py-4 rounded-xl shadow-sm text-sm leading-[1.7]",
          msg.role === 'assistant'
            ? "bg-card border border-border text-[#2d3748] rounded-tl-none font-medium"
            : "bg-[#6c5ce7] text-white rounded-tr-none font-medium"
        )}>
          {msg.role === 'assistant' ? (
            <AIMarkdown
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
              {content}
            </AIMarkdown>
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )}
        </div>

        {/* VO: labelled AI price estimates; RFI: inline analysis summary; older VO gets a notice. */}
        {msg.role === 'assistant' && (
          <div className="w-full">
            <PriceBreakdown priceData={msg.price_breakdown} />
            <RFIAnalysisSummary data={msg.price_breakdown} />
            {msg.price_check_legacy && <LegacyPriceNotice />}
          </div>
        )}

        {/* Citations: one chip per source with its verification status (Part 5) */}
        {shownSources(msg.sources).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shownSources(msg.sources).map((source, si) => (
              <CitationPill key={si} source={source} />
            ))}
          </div>
        )}
        {msg.role === 'assistant' && <AnswerFeedback className="mt-1" surface="task_chat" targetId={msg.serverId} />}

        {/* Timestamp */}
        <span className="text-xs font-medium text-[#cbd5e0] uppercase tracking-tighter mt-2 hover:text-[#94a3b8] transition-colors">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
    );
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
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-gray-200"
        aria-live="polite" aria-relevant="additions">
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

        {initError && (
          <div role="alert" data-testid="chat-init-error" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-2">
            <p>{initError}</p>
            <button className="underline text-sm" onClick={() => { setInitError(null); setMessages([]); setHistoryLoaded(false); }}>
              Try again
            </button>
          </div>
        )}
        {messages.map(renderMessage)}

        {/* A chat that could not start must not hide a verdict that was reached. */}
        {messages.length === 0 && analysisNote && renderMessage(
          { role: 'assistant', content: analysisNote, timestamp: new Date() }, -1)}

        {(isTyping || analysis?.isLoading) && (
          <div className="flex gap-4 max-w-[90%] mr-auto animate-in fade-in duration-300">
            <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm text-[#6c5ce7]">
              <AiMark size={16} />
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
              {/* The analysis is a message now, so its re-run lives with the other prompts. */}
              {analysis?.onRerun && (
                <button
                  onClick={() => analysis.onRerun?.()}
                  disabled={analysis.isLoading}
                  className="whitespace-nowrap text-xs font-medium text-primary bg-primary/5 hover:bg-primary hover:text-white px-4 py-2 rounded-full border border-primary/30 hover:border-primary transition-all duration-300 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Re-run analysis
                </button>
              )}
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
