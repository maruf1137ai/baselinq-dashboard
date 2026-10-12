import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowUp, FileText, X, Paperclip } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ChatSidebar } from '@/components/WorkSpace/ChatSidebar';
import { DashboardLayout } from '@/components/DashboardLayout';
import Clip from '@/components/icons/Clip';
import { fetchData, postData, getPresignedUrl, uploadFileToPresignedUrl } from '@/lib/Api';
import { AIMarkdown } from '@/components/AIAnalysis/AIMarkdown';
import { AnswerFeedback } from '@/components/AIAnalysis/AnswerFeedback';
import { PriceBreakdown } from '@/components/AIAnalysis/PriceBreakdown';
import { LegacyPriceNotice } from '@/components/AIAnalysis/LegacyPriceNotice';
import { CitationPill } from '@/components/AIAnalysis/CitationPill';
import { shownSources, type ChatSource } from '@/types/citation';
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { AiMark } from "@/components/icons/AiMark";
import { PageHeader } from "@/components/ui/page-header";


/** fetchData errors carry the backend `error` (often a code such as "task_not_found"): show text, not codes. */
function readableChatError(err: unknown): string {
  const msg = (err as Error)?.message || "";
  return msg.includes(" ") ? msg : "This chat isn't available — you may not have access to this task.";
}

interface Message {
  id: string;
  /** The saved message's id on the server (an answer can be rated once it has one). */
  serverId?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  price_breakdown?: unknown;
  price_check_legacy?: boolean;
  attachment?: { file_name: string; file_type: string };
}


const AiWorkSpace = () => {
  // Two route shapes feed into this component:
  //   /ai-workspace/:taskTypeSlug/:taskId   → task-bound chat (existing)
  //   /ai-workspace/project/:projectId/:sessionId?  → general project chat
  const { taskTypeSlug, taskId, projectId, sessionId } = useParams<{
    taskTypeSlug?: string;
    taskId?: string;
    projectId?: string;
    sessionId?: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(' ')[0] || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [pendingAttachment, setPendingAttachment] = useState<{ file_name: string; attachment_id: number } | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  // Part 8c: a task chat that couldn't start says why, with a retry (no invented greeting).
  const [initError, setInitError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTaskMode = !!(taskTypeSlug && taskId && taskTypeSlug !== 'project');
  const isProjectMode = !!projectId;

  const chatUrl = isTaskMode
    ? `ai_analysis/${taskTypeSlug!.toLowerCase()}/${taskId}/chat/`
    : isProjectMode
      ? `ai_analysis/project/${projectId}/chat/`
      : null;

  // Bare /ai-workspace has no chat backend. Redirect to a project chat for
  // the currently selected project so clicking "Linq" in the sidebar lands
  // the user in a real chat instead of the dead-end fake-response state.
  useEffect(() => {
    if (isTaskMode || isProjectMode) return;
    const sel = typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null;
    if (sel) {
      navigate(`/ai-workspace/project/${sel}`, { replace: true });
    }
  }, [isTaskMode, isProjectMode, navigate]);

  // Load chat history (or init a new session in project mode without sessionId).
  useEffect(() => {
    if (!chatUrl) return;

    const formatMsgs = (raw: any[]): Message[] =>
      raw.map((msg: any, i: number) => ({
        id: msg.id?.toString() || `hist-${i}`,
        serverId: typeof msg.id === 'number' ? msg.id : undefined,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content || '',
        sources: msg.sources || [],
        price_breakdown: msg.price_breakdown || null,
        price_check_legacy: Boolean(msg.price_check_legacy),
      }));

    // Part 15: a reply for a chat the user has already left (a quick switch, or React's double run in
    // development) is ignored — it used to overwrite the chat now on screen.
    let cancelled = false;

    const load = async () => {
      setInitError(null);
      setIsLoading(true);
      try {
        if (isProjectMode) {
          if (sessionId) {
            // Existing project session — fetch its history.
            const r = await fetchData(`${chatUrl}?session_id=${sessionId}`);
            if (cancelled) return;
            setMessages(formatMsgs(r?.messages || []));
          } else {
            // Fresh "+ New Chat" — no session yet, no welcome message.
            // Session is created lazily by the backend when the user sends
            // their first message; that response carries the new session id.
            setMessages([]);
          }
          return;
        }

        // Task mode — original behaviour.
        const response = await fetchData(chatUrl);
        if (cancelled) return;
        if (response?.sessionId) setActiveSessionId(response.sessionId);
        if (response?.messages && response.messages.length > 0) {
          setMessages(formatMsgs(response.messages));
        } else {
          try {
            const initResponse = await postData({
              url: chatUrl,
              data: { action: 'init' },
            });
            if (cancelled) return;
            if (initResponse?.sessionId) setActiveSessionId(initResponse.sessionId);
            if (initResponse?.messages && initResponse.messages.length > 0) {
              setMessages(formatMsgs(initResponse.messages));
            }
          } catch (err: any) {
            if (cancelled) return;
            const body = err?.response?.data || {};
            setInitError(body.message || (typeof body.error === 'string' ? body.error : null)
              || "Linq couldn't start this chat. Please try again.");
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load chat history:', err);
        if (isTaskMode) {
          setInitError(readableChatError(err));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [chatUrl, sessionId, reloadKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    if (!chatUrl) {
      // No project or task to answer from (Part 15: this used to fake a reply after a second).
      toast.info('Select a project first — Linq answers from your project and its documents.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachment: pendingAttachment
        ? { file_name: pendingAttachment.file_name, file_type: 'document' }
        : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (chatUrl) {
      // Real API call
      try {
        const body: any = { message: userMessage.content };
        const effectiveSessionId = sessionId || (activeSessionId ? String(activeSessionId) : null);
        if (isProjectMode && effectiveSessionId) {
          body.session_id = parseInt(effectiveSessionId);
        }
        const response = await postData({
          url: chatUrl,
          data: body,
        });
        if (response?.sessionId && isTaskMode) setActiveSessionId(response.sessionId);
        const aiMessage: Message = {
          id: response.messageId ? String(response.messageId) : (Date.now() + 1).toString(),
          serverId: typeof response.messageId === 'number' ? response.messageId : undefined,
          role: 'assistant',
          content: response.reply || response.content || "I'm sorry, I couldn't process that request.",
          sources: response.sources || [],
        };
        setMessages(prev => [...prev, aiMessage]);
        setPendingAttachment(null);

        // Project mode, first message: backend created a fresh session and
        // (likely) generated a title. Sync the URL to the new session id and
        // refresh the sidebar so the new chat appears with its title.
        if (isProjectMode && projectId && response?.sessionId) {
          if (!sessionId) {
            navigate(`/ai-workspace/project/${projectId}/${response.sessionId}`, { replace: true });
            setActiveSessionId(null);
          }
          if (response?.title) {
            // The project in the URL, not whatever project was last selected elsewhere (Part 15).
            queryClient.invalidateQueries({
              queryKey: [`ai_analysis/chat-sessions/?project_id=${projectId}`],
            });
          }
        }
      } catch (err: any) {
        console.error('Chat API error:', err);
        const backendMessage = err?.response?.data?.message;
        toast.error(backendMessage || 'Failed to get AI response. Please try again.');
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatUrl) return;
    e.target.value = '';

    setAttachmentLoading(true);
    try {
      let resolvedSessionId: number | null = activeSessionId ?? (sessionId ? parseInt(sessionId) : null);

      // No session yet — create one via init (works for both project and task chats)
      if (!resolvedSessionId) {
        const initResp = await postData({ url: chatUrl, data: { action: 'init' } });
        resolvedSessionId = initResp?.sessionId ?? null;
        if (resolvedSessionId) setActiveSessionId(resolvedSessionId);
      }

      if (!resolvedSessionId) {
        toast.error('Could not create a session to attach the file.');
        return;
      }

      const { upload_url, key } = await getPresignedUrl({
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        folder: `chat_attachments/${resolvedSessionId}`,
      });

      await uploadFileToPresignedUrl(upload_url, file, file.type || 'application/octet-stream');

      const attachResp = await postData({
        url: `ai_analysis/session/${resolvedSessionId}/attach/`,
        data: { s3_key: key, file_name: file.name, file_type: file.type || 'application/octet-stream' },
      });

      setPendingAttachment({ file_name: file.name, attachment_id: attachResp.attachment_id });
      toast.success(`"${file.name}" attached and analyzed.`);
    } catch (err: any) {
      console.error('Attachment error:', err);
      toast.error(err?.response?.data?.error || 'Failed to attach file. Please try again.');
    } finally {
      setAttachmentLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    // Part 15: a new chat is a new session — the next question must not continue the old one.
    setMessages([]);
    setInput('');
    setActiveSessionId(null);
    setPendingAttachment(null);
    setInitError(null);
  };

  // The error card lives in the chat area, so a failed load (no messages, no longer loading) must still show it.
  const hasMessages = messages.length > 0 || isLoading || !!initError;

  const clipButton = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
      onClick={() => fileInputRef.current?.click()}
      disabled={attachmentLoading}
      title="Attach file"
      aria-label="Attach a file"
    >
      {attachmentLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      ) : (
        <Clip />
      )}
    </Button>
  );

  const attachmentChip = pendingAttachment && (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border text-xs text-foreground">
      <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="max-w-[180px] truncate">{pendingAttachment.file_name}</span>
      <button
        aria-label="Remove attachment"
        onClick={() => setPendingAttachment(null)}
        className="ml-1 text-muted-foreground hover:text-foreground"
        title="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <DashboardLayout padding="p-0">
      <div className="flex flex-col h-[calc(100vh-var(--app-header-h))]">
        {/* EXCEPTION to the page-top rule, on the BODY only: the chat canvas
            below is full-bleed, so DashboardLayout is asked for padding="p-0"
            and this header band re-applies the canonical p-6. Was `py-4`,
            which floated the title 8px above every other page's title. */}
        <div className="p-6 border-b border-border">
          <PageHeader title="Linq" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <ChatSidebar onNewChat={handleNewChat} open={true} onToggle={() => { }} />
          {hasMessages && (
            <div className="flex flex-1 flex-col min-w-0">
              {/* Main Chat Area */}
              <ScrollArea className="flex-1">
                <div className="mx-auto max-w-4xl px-3 sm:px-6 pt-4 pb-2" aria-live="polite" aria-relevant="additions">
                  {/* Part 15: screen readers hear each new answer */}
                  {isLoading && messages.length === 0 && (
                    <div className="flex items-center justify-center py-20">
                      <AwesomeLoader message="Analyzing context" />
                    </div>
                  )}
                  {initError && (
                    <div role="alert" data-testid="chat-init-error" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-2">
                      <p>{initError}</p>
                      <button className="underline text-sm" onClick={() => { setInitError(null); setReloadKey((k) => k + 1); }}>
                        Try again
                      </button>
                    </div>
                  )}
                  {messages.map(message => (
                    <div key={message.id} className="mb-6">
                      {message.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] text-sm rounded-lg bg-muted/50 px-4 py-3 space-y-2">
                            {message.attachment && (
                              <div className="flex items-center gap-2.5 p-2 rounded-md bg-red-50 border border-red-100">
                                <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center shrink-0">
                                  <FileText className="h-4 w-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{message.attachment.file_name}</p>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wide">PDF</p>
                                </div>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#f0f0ff] flex items-center justify-center shrink-0">
                            <AiMark size={16} className="text-[#6366f1]" />
                          </div>
                          <div className="flex-1">
                            <div className="prose prose-sm max-w-none text-justify">
                              <AIMarkdown
                                components={{
                                  p: ({ children }) => <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground mb-2 last:mb-0 text-justify">{children}</p>,
                                  strong: ({ children }) => <strong className="font-normal">{children}</strong>,
                                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-foreground">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-foreground">{children}</ol>,
                                  li: ({ children }) => <li className="leading-relaxed text-justify">{children}</li>,
                                  h1: ({ children }) => <h1 className="text-sm font-normal mb-2 text-foreground">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-sm font-normal mb-1.5 text-foreground">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-normal mb-1 text-foreground">{children}</h3>,
                                }}
                              >
                                {message.content}
                              </AIMarkdown>
                            </div>
                            {/* VO: labelled AI price estimates; older messages get a notice instead */}
                            <PriceBreakdown priceData={message.price_breakdown} />
                            {message.price_check_legacy && <LegacyPriceNotice />}
                            {/* Citations: one chip per source with its verification status (Part 5) */}
                            {shownSources(message.sources).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {shownSources(message.sources).map((source, ci) => (
                                  <CitationPill key={ci} source={source} />
                                ))}
                              </div>
                            )}
                            <AnswerFeedback className="mt-2" surface={isTaskMode ? 'task_chat' : 'linq_chat'}
                              targetId={message.serverId} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="mb-6">
                      <AwesomeLoader compact message="Analyzing context" />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="px-3 sm:px-6 py-4">
                <div className="mx-auto max-w-4xl">
                  {attachmentChip && (
                    <div className="flex flex-wrap gap-1.5 mb-2 px-1">{attachmentChip}</div>
                  )}
                  <div className="relative flex items-end gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
                    {clipButton}
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
                      aria-label="Send message"
                      className="h-8 w-8 disabled:bg-muted shrink-0 rounded-full"
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
            <div className="h-full w-full flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-[680px] mx-auto px-4">

                  {/* Brand badge */}
                  {/* <div className="flex justify-center mb-8">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] text-white text-xs font-medium">
                    <div className="h-4 w-4 flex items-center justify-center shrink-0">
                      <img src="/LOGO-ai.png" alt="Linq AI" className="w-full h-full object-contain" />
                    </div>
                    <span>Linq AI</span>
                  </div>
                </div> */}

                  {/* Greeting heading with inline logo */}
                  <h2 className="text-2xl font-normal tracking-tight text-center text-foreground mb-8 flex items-center justify-center gap-3 flex-wrap">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#f0f0ff] flex items-center justify-center shrink-0">
                      <AiMark size={20} className="text-[#6366f1]" />
                    </div>
                    {firstName ? `What can I help with, ${firstName}?` : 'What can I help with?'}
                  </h2>

                  {/* Input with bottom toolbar */}
                  <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-[#6c5ce7]/30 focus-within:border-[#6c5ce7] transition-all">
                    {attachmentChip && (
                      <div className="flex flex-wrap gap-1.5 px-4 pt-3">{attachmentChip}</div>
                    )}
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
                      {clipButton}
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSend}
                          size="icon"
                          aria-label="Send message"
                          className="h-8 w-8 disabled:bg-muted shrink-0 rounded-full"
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
                      "Summarise the key risks in our contract",
                      "Which VOs are pending approval and what's the combined value?",
                      "What does the contract say about delay penalties?",
                      "Flag any payment certificates missing supporting docs",
                      "What compliance items block the next payment?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                        className="text-xs text-muted-foreground bg-card hover:bg-primary hover:text-white px-3 py-1.5 rounded-full border border-border hover:border-primary transition-all duration-200 active:scale-95"
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </DashboardLayout>
  );
};

export default AiWorkSpace;
