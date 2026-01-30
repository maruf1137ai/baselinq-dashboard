// src/components/ChatApp.jsx
import React, { useState, useRef, useEffect } from "react";

/**
 * Initial messages (taken from the JSON above).
 * In a real app you'd fetch this from an API.
 */
const INITIAL_MESSAGES = [
  {
    id: "m1",
    author: "Unknown",
    time: "Today",
    text: "We need clarification on the structural requirements for the basement level. The current drawings show conflicting information regarding the foundation depth.",
    attachments: [
      { name: "foundation-drawings.pdf", type: "application/pdf" },
      { name: "site-survey.dwg", type: "application/octet-stream" },
    ],
  },
  {
    id: "m2",
    author: "Sarah Chen",
    time: "Today 9:24 AM",
    text: "I've analyzed the uploaded drawings and identified the conflicts. The architectural plans show a foundation depth of 8 feet, while the structural drawings indicate 10 feet. Based on the soil report and local building codes, I recommend clarifying this with the structural engineer.",
    attachments: [],
  },
  {
    id: "m3",
    author: "Unknown",
    time: "Today 9:24 AM",
    text: "Thanks for the analysis. Can you also check if this affects the timeline for excavation work?",
    attachments: [],
  },
  {
    id: "m4",
    author: "Sarah Chen",
    time: "Today 9:24 AM",
    text: "Based on the project schedule, the foundation depth clarification could impact the excavation timeline by 2-3 days if we need to go deeper. I've flagged this as a priority item and notified the relevant stakeholders.",
    attachments: [],
  },
  {
    id: "m5",
    author: "System Notes",
    time: "",
    text: "Extreme heat/cold → affects curing of concrete, asphalt laying, and worker productivity. High winds → make crane operations unsafe, stop façade installations, or delay scaffolding. Snow/ice → block site access, damage temporary works, or slow down logistics.",
    attachments: [],
  },
];

function FileIcon({ mime, name }) {
  // Simple icon selection by mime or extension
  const ext = name.split(".").pop().toLowerCase();
  if (mime === "application/pdf" || ext === "pdf") {
    return (
      <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-red-50 text-red-600 text-xs font-semibold">
        PDF
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-gray-100 text-gray-700 text-sm">
      {ext.toUpperCase()}
    </div>
  );
}

export default function Chats() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // { file, url }
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // cleanup object URLs on unmount
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
  }, [files]);

  useEffect(() => {
    // scroll to bottom on messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onSelectFiles(e) {
    const chosen = Array.from(e.target.files || []);
    const mapped = chosen.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
    setFiles((prev) => [...prev, ...mapped]);
    // clear input so same file can be chosen again if needed
    e.target.value = "";
  }

  function handleSend() {
    if (!text.trim() && files.length === 0) return;
    const newMessage = {
      id: "m" + (messages.length + 1),
      author: "You",
      time: new Date().toLocaleString(),
      text: text.trim(),
      attachments: files.map((f) => ({
        name: f.file.name,
        type: f.file.type || "application/octet-stream",
        url: f.url,
      })),
    };
    setMessages((prev) => [...prev, newMessage]);
    setText("");
    setFiles([]);
  }

  function removePendingFile(index) {
    const f = files[index];
    URL.revokeObjectURL(f.url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="h-screen bg-gray-50 flex items-stretch">
      {/* Chat window - flexible */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Messages list */}
        <section className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 max-w-2xl">
            {messages.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
                      {m.author
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{m.author}</div>
                      <div className="text-xs text-gray-400">{m.time}</div>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {m.text}
                </div>

                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {m.attachments.map((a, idx) => (
                      <a
                        key={idx}
                        href={a.url || "#"}
                        target={a.url ? "_blank" : "_self"}
                        rel="noreferrer"
                        className="flex items-center gap-3 border border-gray-100 rounded-md p-2 hover:shadow-sm">
                        <FileIcon mime={a.type} name={a.name} />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {a.name}
                          </div>
                          <div className="text-xs text-gray-400">{a.type}</div>
                        </div>
                        <div className="text-xs text-blue-600">Open</div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Composer */}
        <footer className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            {files.length > 0 && (
              <div className="mb-3 flex gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border border-gray-200 rounded-md px-2 py-1 bg-gray-50">
                    <div className="text-xs font-medium">{f.file.name}</div>
                    <button
                      onClick={() => removePendingFile(i)}
                      className="text-xs text-red-500 hover:underline">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                title="Attach files">
                📎
              </button>
              <input
                ref={fileInputRef}
                onChange={onSelectFiles}
                multiple
                type="file"
                className="hidden"
              />

              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-200 min-w-0"
              />

              <button
                onClick={handleSend}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-60"
                disabled={!text.trim() && files.length === 0}>
                Send
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
