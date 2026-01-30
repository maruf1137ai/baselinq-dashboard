import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, X, Pause } from "lucide-react";
import { useUpdateTask } from "@/supabse/hook/useTask";
import { uploadFile } from "@/supabse/api";
import { toast } from "sonner";

const ChatWindow = ({ task }: { task: any }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const { mutateAsync: updateTask } = useUpdateTask();

  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Sync messages with selected task
  useEffect(() => {
    if (task?.chat) {
      setMessages(task.chat);
    } else {
      setMessages([]);
    }
  }, [task]);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
          const url = await uploadFile(fileData.file, task.id);
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

      // Add user message
      const newUserMessage = {
        id: Date.now(),
        type: "user",
        content: message.trim(),
        files: uploadedFiles,
        sender: "You",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const newChatHistory = [...(messages || []), newUserMessage];
      setMessages(newChatHistory);
      setMessage("");
      setAttachedFiles([]);

      if (task?.id) {
        await updateTask({ id: task.id, chat: newChatHistory });
      }
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
      const url = await uploadFile(audioFile, task.id);

      const newUserMessage = {
        id: Date.now(),
        type: "user",
        content: "", // Empty content for voice messages
        files: [{
          name: "Voice Message",
          type: "audio/webm",
          url: url
        }],
        sender: "You",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const newChatHistory = [...(messages || []), newUserMessage];
      setMessages(newChatHistory);

      if (task?.id) {
        await updateTask({ id: task.id, chat: newChatHistory });
      }
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

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a task to view conversation
      </div>
    );
  }

  const displayId = task.type ? `${task.type}-${task.id.slice(0, 4)}` : `Task-${task.id.slice(0, 4)}`;

  return (
    <div>
      <div className="nav py-3 px-6 border-b border-r border-[#DEDEDE] flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="title text-base text-[#101828]">{displayId}</div>
          <p className="text text-sm text-[#6A7282] mt-1">
            {task.title}
          </p>
        </div>
        <div className="date text-xs py-2 px-3 bg-[#FFF7ED] border border-[#FED7AA] text-[#F97316] rounded-full">
          Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Date'}
        </div>
      </div>

      <div className="bg-white border-r border-[#DEDEDE] h-[calc(100vh-138px)] relative overflow-hidden pb-[70px]">
        <div className="relative w-full px-5 h-full overflow-y-auto ">
          <div className="relative size-full">
            {/* Chat Messages */}
            <div
              className="box-border content-stretch flex flex-col gap-[30.667px] items-end left-0 overflow-clip px-0 py-[20.444px] top-0 w-full"
              data-name="chat">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`relative max-w-[396px] w-full ${msg.type === "user" ? "" : "self-start"
                    }`}>
                  {msg.type === "user" ? (
                    // User Message
                    <div className="relative rounded-[10px] w-full bg-[#F3F2F0] py-5 px-4">
                      <div className="relative text-[#101828] text-base">
                        <p className="leading-[26px] whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                      {/* Files */}
                      {msg.files && msg.files.length > 0 && (
                        <div className="flex items-start gap-2 flex-wrap mt-2">
                          {msg.files.map((file, index) => (
                            file.type.startsWith('audio/') || file.name.endsWith('.webm') ? (
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
                    // AI Message
                    <div
                      className="content-stretch flex gap-[20.444px] items-start relative shrink-0 w-full"
                      data-name="gpt-response">
                      {/* AppIcons */}
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
                                <g id="Vector_2">
                                  <path
                                    d="M14.3421 7.03081C11.1709 5.32661 7.8272 4.88233 4.30017 5.48914V0.370621C5.26111 0.0811511 6.25231 -0.0380774 7.25715 0.0105631C9.01711 0.0953874 10.6792 0.561624 12.2054 1.44131C12.9006 1.84229 13.5436 2.33344 14.2027 2.79434C14.2756 2.84536 14.3367 2.96696 14.3385 3.05712C14.3575 4.32948 14.3664 5.60244 14.3747 6.8754C14.3747 6.92879 14.3527 6.98217 14.3421 7.03081Z"
                                    fill="var(--fill-0, black)"
                                  />
                                  <path
                                    d="M14.3421 7.03081C11.1709 5.32661 7.8272 4.88233 4.30017 5.48914V0.370621C5.26111 0.0811511 6.25231 -0.0380774 7.25715 0.0105631C9.01711 0.0953874 10.6792 0.561624 12.2054 1.44131C12.9006 1.84229 13.5436 2.33344 14.2027 2.79434C14.2756 2.84536 14.3367 2.96696 14.3385 3.05712C14.3575 4.32948 14.3664 5.60244 14.3747 6.8754C14.3747 6.92879 14.3527 6.98217 14.3421 7.03081Z"
                                    fill="var(--fill-1, black)"
                                  />
                                </g>
                                <g id="Vector_3">
                                  <path
                                    d="M14.3435 10.8195H4.2969C4.29038 10.7376 4.2797 10.6617 4.2797 10.5864C4.27851 9.2535 4.28207 7.92064 4.27555 6.58836C4.27436 6.38787 4.31707 6.31669 4.5407 6.27101C5.70866 6.03315 6.89264 5.97502 8.06832 6.06043C10.2429 6.21881 12.3155 6.7586 14.1484 8.00902C14.2279 8.06359 14.3335 8.15909 14.3346 8.2368C14.3483 9.09275 14.3429 9.94871 14.3429 10.8195H14.3435Z"
                                    fill="var(--fill-0, black)"
                                  />
                                  <path
                                    d="M14.3435 10.8195H4.2969C4.29038 10.7376 4.2797 10.6617 4.2797 10.5864C4.27851 9.2535 4.28207 7.92064 4.27555 6.58836C4.27436 6.38787 4.31707 6.31669 4.5407 6.27101C5.70866 6.03315 6.89264 5.97502 8.06832 6.06043C10.2429 6.21881 12.3155 6.7586 14.1484 8.00902C14.2279 8.06359 14.3335 8.15909 14.3346 8.2368C14.3483 9.09275 14.3429 9.94871 14.3429 10.8195H14.3435Z"
                                    fill="var(--fill-1, black)"
                                  />
                                </g>
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      {/* TextArea */}
                      <div
                        className="basis-0 box-border content-stretch flex flex-col gap-[15.333px] grow items-start min-h-px min-w-px pt-[11.5px] px-0 relative shrink-0"
                        data-name="text-area">
                        <div className="leading-[28.111px] not-italic relative shrink-0 text-[#0d0d0d] text-[16.611px] w-full">
                          <p className="mb-0 whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* <div className="flex items-center justify-between mt-2.5">
                    <div className="text-[#6a7282] text-[12px]">
                      <p className="leading-[16px]">
                        {msg.type === "user" ? msg.sender : "AI Assistant"}
                      </p>
                    </div>
                    <div className="text-[#99a1af] text-[12px]">
                      <p className="leading-[16px]">{msg.timestamp}</p>
                    </div>
                  </div> */}
                </div>
              ))}

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
    </div>
  );
};

export default ChatWindow;
