import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, X, Pause, MessageSquare, ChevronRight, ChevronDown, ChevronUp, Info, Calendar, DollarSign, Clock } from "lucide-react";
import { uploadFile } from "@/supabse/api";
import { toast } from "sonner";
import { fetchData, postData } from "@/lib/Api";
import { Badge } from "../ui/badge";

const ChatWindow = ({ channel, projectName = "Project", taskDetails }: { channel: any, projectName?: string, taskDetails?: any }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showContext, setShowContext] = useState(true);

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  // Extract task specific fields for the context card
  const getContextFields = () => {
    if (!taskDetails?.task) return null;

    const task = taskDetails.task;
    const type = taskDetails.taskType;

    const common = {
      title: task.title || task.subject || task.taskActivityName,
      status: task.status || channel?.status,
      dueDate: task.dueDate || task.finishDate,
      priority: task.priority
    };

    switch (type) {
      case 'VO':
        return {
          ...common,
          cost: task.grandTotal ? `R ${Number(task.grandTotal).toLocaleString()}` : null,
          impact: "Cost & Time",
          details: [
            { label: "Amount", value: `R ${Number(task.grandTotal || 0).toLocaleString()}` },
            { label: "Extension", value: task.extensionDays ? `${task.extensionDays} Days` : "None" }
          ]
        };
      case 'DC':
        return {
          ...common,
          cost: task.estimatedCostImpact?.amount ? `R ${Number(task.estimatedCostImpact.amount).toLocaleString()}` : null,
          impact: "Delay Claim",
          details: [
            { label: "Claimed", value: task.requestedExtensionDays ? `${task.requestedExtensionDays} Days` : "N/A" },
            { label: "Cause", value: task.causeCategory || "General" }
          ]
        };
      case 'RFI':
        return {
          ...common,
          details: [
            { label: "Discipline", value: task.discipline },
            { label: "Question", value: task.question, fullWidth: true }
          ]
        };
      case 'SI':
        return {
          ...common,
          details: [
            { label: "Instruction", value: task.instruction, fullWidth: true },
            { label: "Location", value: task.location || "General" }
          ]
        };
      case 'CPI':
        return {
          ...common,
          details: [
            { label: "Start", value: task.startDate ? new Date(task.startDate).toLocaleDateString() : "N/A" },
            { label: "Duration", value: `${task.duration || 0} Days` }
          ]
        }
      default:
        return common;
    }
  };

  const contextData = getContextFields();

  // Fetch messages from API
  const fetchMessages = async () => {
    if (!channel?.id) return;
    try {
      const response = await fetchData(`channels/${channel.id}/messages/`);
      if (response) {
        const formattedMessages = response.map((msg: any) => ({
          id: msg.id,
          sender_id: msg.sender_id,
          content: msg.content,
          sender_name: msg.sender_name,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          files: msg.attachments || [],
          is_urgent: msg.is_urgent,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Set up polling to refetch messages every 2.5 seconds
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 2500); // 2.5 seconds

    // Cleanup: Clear interval when component unmounts or channel changes
    return () => {
      clearInterval(intervalId);
    };
  }, [channel]);

  // Auto-scroll to bottom only when user is near the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isNearBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  };

  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSend = async () => {
    if (message.trim() === "" && attachedFiles.length === 0 && !isRecording) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    setIsUploading(true);
    try {
      const uploadedFiles = [];

      // Upload files if any
      for (const fileData of attachedFiles) {
        try {
          const url = await uploadFile(fileData.file, channel.id);
          uploadedFiles.push({
            name: fileData.name,
            type: fileData.type,
            url: url
          });
        } catch (error) {
          console.error(`Failed to upload ${fileData.name}`, error);
          toast.error(`Failed to upload ${fileData.name}`);
        }
      }

      // Post message to API
      await postData({
        url: `channels/${channel.id}/messages/`,
        data: {
          content: message.trim(),
          is_urgent: false,
          parent: null,
        },
      });

      setMessage("");
      setAttachedFiles([]);

      // Refresh messages from API
      await fetchMessages();
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = (e: any) => {
    const files = Array.from(e.target.files || []) as any[];
    const newFiles = files.map((file: any) => ({
      name: file.name,
      type: file.name.split(".").pop(),
      file: file,
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // Check if we should save
        if (mediaRecorderRef.current && (mediaRecorderRef.current as any).isCancelled) {
          console.log("Recording cancelled");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
          type: "audio/webm",
        });

        // Upload and send immediately
        await handleAudioUploadAndSend(audioFile);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        (mediaRecorderRef.current as any).isCancelled = true;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const handleAudioUploadAndSend = async (audioFile: File) => {
    setIsUploading(true);
    try {
      // Upload audio file first
      const url = await uploadFile(audioFile, channel.id);

      // Post voice message to API
      await postData({
        url: `channels/${channel.id}/messages/`,
        data: {
          content: `[Voice Message: ${url}]`,
          is_urgent: false,
          parent: null,
        },
      });

      // Refresh messages from API
      await fetchMessages();
    } catch (error) {
      console.error("Failed to send voice message", error);
      toast.error("Failed to send voice message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      startRecording();
    }
  };

  const FileIcon = ({ type }: { type: string }) => {
    const getFileColor = (fileType: string) => {
      switch (fileType) {
        case "pdf":
          return "#FF4444";
        case "dwg":
          return "#4CAF50";
        case "doc":
        case "docx":
          return "#2196F3";
        case "xls":
        case "xlsx":
          return "#4CAF50";
        default:
          return "#99A1AF";
      }
    };

    return (
      <svg
        className="size-[12px]"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 12 12">
        <path
          d="M8 3L3.793 7.293C3.60543 7.48057 3.50005 7.73498 3.50005 8.00025C3.50005 8.26552 3.60543 8.51993 3.793 8.7075C3.98057 8.89507 4.23498 9.00045 4.50025 9.00045C4.76552 9.00045 5.01993 8.89507 5.2075 8.7075L9.4145 4.4145C9.78958 4.03942 10.0003 3.5307 10.0003 3.00025C10.0003 2.4698 9.78958 1.96108 9.4145 1.586C9.03942 1.21092 8.5307 1.0002 8.00025 1.0002C7.4698 1.0002 6.96108 1.21092 6.586 1.586L2.3965 5.8615C2.1142 6.13924 1.88968 6.47012 1.7359 6.83507C1.58212 7.20001 1.50211 7.59179 1.5005 7.98781C1.49889 8.38383 1.5757 8.77625 1.7265 9.14243C1.87731 9.50861 2.09912 9.84132 2.37915 10.1213C2.65918 10.4014 2.99189 10.6232 3.35807 10.774C3.72425 10.9248 4.11667 11.0016 4.51269 11C4.90871 10.9984 5.30049 10.9184 5.66543 10.7646C6.03038 10.6108 6.36126 10.3863 6.639 10.104L10.8285 5.8285"
          stroke={getFileColor(type)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (!channel) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] gap-3">
        <MessageSquare className="h-10 w-10 stroke-[1.5]" />
        <p className="text-sm">Select a channel to view conversation</p>
      </div>
    );
  }

  const displayId = channel.taskId
    ? `${channel.taskType || "TSK"}-${String(channel.taskId).padStart(3, '0')}`
    : `# ${channel.name}`;

  return (
    <div>
      <div className="nav py-3 px-6 border-b border-r border-[#DEDEDE] flex flex-col gap-3">
        {/* Breadcrumb & Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-gray-500 font-medium breadcrumb flex items-center gap-1">
              <span>{projectName}</span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span>Communications</span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span className="text-gray-900 font-medium">{displayId}</span>
            </div>
          </div>
          {contextData && (
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md transition-colors"
            >
              <Info className="w-3 h-3" />
              {showContext ? "Hide Context" : "Show Context"}
            </button>
          )}
        </div>

        {/* Document Context Card */}
        {showContext && contextData && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-1 mr-2" title={contextData.title}>
                {contextData.title}
              </h3>
              <div className="flex gap-2 shrink-0">
                {contextData.status && (
                  <Badge variant="outline" className="bg-white text-gray-700 border-gray-200 text-[10px] h-5">
                    {contextData.status}
                  </Badge>
                )}
                {contextData.priority && (
                  <Badge variant="outline" className={`text-[10px] h-5 ${contextData.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                    {contextData.priority}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4">
              {contextData.dueDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Due Date</p>
                    <p className="text-xs text-gray-900">{new Date(contextData.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {(contextData as any).cost && (
                <div className="flex items-start gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">Cost Impact</p>
                    <p className="text-xs text-gray-900 font-medium">{(contextData as any).cost}</p>
                  </div>
                </div>
              )}

              {(contextData as any).details?.map((detail: any, i: number) => (
                <div key={i} className={`flex items-start gap-2 ${detail.fullWidth ? 'col-span-2' : ''}`}>
                  <div className="w-3.5 shrink-0" /> {/* Spacer for alignment */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium">{detail.label}</p>
                    <p className="text-xs text-gray-900 line-clamp-1" title={detail.value}>{detail.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {channel.description && !showContext && (
          <p className="text text-sm text-[#6A7282] mt-1">
            {channel.description}
          </p>
        )}
      </div>

      <div className="bg-white border-r border-[#DEDEDE] h-[calc(100vh-209px)] relative overflow-hidden pb-[70px]">
        <div ref={scrollContainerRef} className="relative w-full px-5 h-full overflow-y-auto ">
          <div className="relative size-full">
            {/* Chat Messages */}
            <div
              className="box-border content-stretch flex flex-col gap-2 items-end left-0 overflow-clip px-0 py-[20.444px] top-0 w-full"
              data-name="chat">
              {/* Channel welcome banner */}
              <div className="flex flex-col items-center justify-center w-full py-8 self-center hidden">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <MessageSquare className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-[#101828] text-center">
                  {channel.name || displayId}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Channel created{channel.created_at ? ` on ${new Date(channel.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}{channel.created_by_name ? ` by ${channel.created_by_name}` : ""}
                </p>
                {channel.description && (
                  <p className="text-xs text-[#6A7282] mt-1.5 max-w-sm text-center">{channel.description}</p>
                )}
              </div>

              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center w-full text-[#9CA3AF] gap-2 self-center" style={{ minHeight: "calc(100% - 200px)" }}>
                  <MessageSquare className="h-8 w-8 stroke-[1.5]" />
                  <p className="text-xs">No messages yet — start the conversation below</p>
                </div>
              )}
              {messages.map((msg) => {
                const isCurrentUser = currentUser?.id === msg.sender_id;
                const senderInitial = msg.sender_name?.charAt(0)?.toUpperCase() || "?";

                return (
                  <div
                    key={msg.id}
                    className={`relative max-w-[85%] ${isCurrentUser ? "" : "self-start"}`}>
                    {isCurrentUser ? (
                      // Current User Message (right side)
                      <div className="relative rounded-[10px] bg-[#F3F2F0] py-2.5 px-4">
                        <div className="relative text-[#101828] text-base">
                          <p className="leading-[26px] whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                        {/* Files */}
                        {msg.files && msg.files.length > 0 && (
                          <div className="flex items-start gap-2 flex-wrap mt-2">
                            {msg.files.map((file: any, index: number) => (
                              file.type?.startsWith('audio/') || file.name?.endsWith('.webm') ? (
                                <div key={index} className="w-full min-w-[200px] mt-2">
                                  <audio controls className="w-full h-8">
                                    <source src={file.url} type={file.type || "audio/webm"} />
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              ) : (
                                <a
                                  key={index}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white inline-flex items-center gap-1 rounded-[4px] py-2 px-3 hover:bg-gray-50 transition-colors">
                                  <FileIcon type={file.type} />
                                  <div className="text-[#364153] text-[14px]">
                                    <p className="leading-[20px]">{file.name}</p>
                                  </div>
                                </a>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Other User Message (left side with avatar)
                      <div className="flex gap-3 items-start">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-[#101828] flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-medium">{senderInitial}</span>
                        </div>
                        <div className="flex-1">
                          {/* Sender Name */}
                          <p className="text-[#6A7282] text-xs mb-1 capitalize">{msg.sender_name}</p>
                          {/* Message Box */}
                          <div className="relative rounded-[10px] bg-[#F3F2F0] py-2.5 px-4">
                            <div className="relative text-[#101828] text-base">
                              <p className="leading-[26px] whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            </div>
                            {/* Files */}
                            {msg.files && msg.files.length > 0 && (
                              <div className="flex items-start gap-2 flex-wrap mt-2">
                                {msg.files.map((file: any, index: number) => (
                                  file.type?.startsWith('audio/') || file.name?.endsWith('.webm') ? (
                                    <div key={index} className="w-full min-w-[200px] mt-2">
                                      <audio controls className="w-full h-8">
                                        <source src={file.url} type={file.type || "audio/webm"} />
                                        Your browser does not support the audio element.
                                      </audio>
                                    </div>
                                  ) : (
                                    <a
                                      key={index}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-white inline-flex items-center gap-1 rounded-[4px] py-2 px-3 hover:bg-gray-50 transition-colors">
                                      <FileIcon type={file.type} />
                                      <div className="text-[#364153] text-[14px]">
                                        <p className="leading-[20px]">{file.name}</p>
                                      </div>
                                    </a>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="content-stretch flex gap-[20.444px] items-start relative shrink-0 w-full self-start">
                  <div
                    className="relative rounded-[20.444px] shrink-0 size-[35.778px]"
                    data-name="app-icons">
                    <div className="box-border content-stretch flex flex-col gap-[10.222px] items-center justify-center overflow-clip p-[10.222px] relative rounded-[inherit] size-[35.778px] border-[#e0e0e0] border-[1.278px]">
                      <div className="h-[14.842px] relative shrink-0 w-[14.374px]">
                        <svg
                          className="block size-full"
                          fill="none"
                          preserveAspectRatio="none"
                          viewBox="0 0 15 15">
                          <g id="Group 6">
                            <g id="Vector">
                              <path
                                d="M3.36331 11.7917H14.3537V14.8418H0.00474542V14.5144C0.00474542 10.8604 0.00652495 7.20642 0 3.55186C0 3.32527 0.0747403 3.16867 0.224814 3.00495C1.05882 2.09561 2.00257 1.33397 3.11833 0.796552C3.23044 0.742573 3.3473 0.697491 3.48314 0.638767C3.4428 4.36273 3.40306 8.05111 3.36272 11.7917H3.36331Z"
                                fill="var(--fill-0, black)"
                              />
                              <path
                                d="M3.36331 11.7917H14.3537V14.8418H0.00474542V14.5144C0.00474542 10.8604 0.00652495 7.20642 0 3.55186C0 3.32527 0.0747403 3.16867 0.224814 3.00495C1.05882 2.09561 2.00257 1.33397 3.11833 0.796552C3.23044 0.742573 3.3473 0.697491 3.48314 0.638767C3.4428 4.36273 3.40306 8.05111 3.36272 11.7917H3.36331Z"
                                fill="var(--fill-1, black)"
                              />
                            </g>
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-[#F3F2F0] rounded-[10px] py-3 px-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Search - Input Area */}
        <div className="w-full flex flex-col gap-2 absolute bottom-2.5 left-0 px-5">
          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="bg-white inline-flex items-center gap-1 rounded-[4px] py-1 px-2 border border-[#DEDEDE]">
                  <FileIcon type={file.type} />
                  <div className="text-[#364153] text-[12px]">
                    <p className="leading-[16px]">{file.name}</p>
                  </div>
                  <button
                    onClick={() => removeAttachedFile(index)}
                    className="text-[#6A7282] hover:text-[#101828] ml-1">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-4 bg-[#f9f9f9] px-4 py-2 rounded-full w-full box-border">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileAttach}
              className="hidden"
              multiple
            />

            {/* Attachment Icon */}
            <button
              onClick={triggerFileInput}
              className="shrink-0 w-6 h-6 text-[#676767] cursor-pointer hover:text-[#101828]">
              <svg
                className="w-6 h-6"
                viewBox="0 0 16 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9.90245 7.34739V13.4168C9.90245 14.6518 8.90131 15.6529 7.66634 15.6529C6.43137 15.6529 5.43023 14.6518 5.43023 13.4168V5.43072C5.43023 2.96078 7.43251 0.958496 9.90245 0.958496C12.3724 0.958496 14.3747 2.96078 14.3747 5.43072V13.4168C14.3747 17.1217 11.3713 20.1252 7.66634 20.1252C3.96143 20.1252 0.958008 17.1217 0.958008 13.4168V7.34739"
                  stroke="currentColor"
                  strokeWidth="1.91667"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Voice Icon */}
            <button
              onClick={handleVoiceRecord}
              className={`shrink-0 w-6 h-6 cursor-pointer hover:text-[#101828] ${isRecording ? "text-red-500" : "text-[#676767]"
                }`}>
              {isRecording && !isPaused ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>

            {/* Input or Recording UI */}
            {isRecording ? (
              <div className="flex-grow flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-red-500 ${!isPaused && "animate-pulse"}`} />
                <span className="text-[#676767] text-[16px]">
                  {isPaused ? "Recording Paused" : "Recording..."}
                </span>
                <button
                  onClick={() => {
                    stopRecording(true);
                  }}
                  className="ml-auto p-1 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4 text-[#676767]" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                placeholder="Type a message…"
                className="flex-grow bg-transparent outline-none text-[16px] text-[#676767]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={((message.trim() === "" && attachedFiles.length === 0) && !isRecording) || isUploading}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${((message.trim() || attachedFiles.length > 0) || isRecording) && !isUploading
                ? "bg-[#101828] cursor-pointer"
                : "bg-[#e0e0e0] cursor-not-allowed"
                }`}>
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div >
  );
};

export default ChatWindow;
