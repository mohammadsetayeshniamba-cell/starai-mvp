"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  imagePreview?: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

const STORAGE_KEY = "starai_conversations_v1";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createNewConversation(): Conversation {
  return {
    id: createId(),
    title: "چت جدید",
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [input, setInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Conversation[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id);
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const firstConversation = createNewConversation();
    setConversations([firstConversation]);
    setActiveConversationId(firstConversation.id);
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, loading]);

  const updateConversationMessages = (
    conversationId: string,
    messages: ChatMessage[],
    fallbackTitle?: string
  ) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id !== conversationId) return conversation;

        const firstUserMessage = messages.find((m) => m.role === "user");
        const title =
          conversation.title === "چت جدید" && firstUserMessage
            ? firstUserMessage.content.slice(0, 32) || fallbackTitle || "چت تصویری"
            : conversation.title;

        return {
          ...conversation,
          title,
          messages,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleNewChat = () => {
    const newConversation = createNewConversation();

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setInput("");
    setImageDataUrl("");
    setError("");
  };

  const handleDeleteConversation = (id: string) => {
    const filtered = conversations.filter((c) => c.id !== id);

    if (filtered.length === 0) {
      const newConversation = createNewConversation();
      setConversations([newConversation]);
      setActiveConversationId(newConversation.id);
      return;
    }

    setConversations(filtered);

    if (activeConversationId === id) {
      setActiveConversationId(filtered[0].id);
    }
  };

  const handleImageSelect = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("فقط فایل تصویر قابل قبول است.");
      return;
    }

    if (file.size > 1_000_000) {
      alert("برای MVP فعلاً عکس کمتر از 1MB آپلود کن.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImageDataUrl(String(reader.result));
    };

    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text && !imageDataUrl) return;
    if (!activeConversation) return;

    setLoading(true);
    setError("");

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text || "این تصویر را تحلیل کن.",
      imagePreview: imageDataUrl || undefined,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...activeConversation.messages, userMessage];

    updateConversationMessages(
      activeConversation.id,
      nextMessages,
      imageDataUrl ? "چت تصویری" : undefined
    );

    setInput("");
    setImageDataUrl("");

    try {
      const apiMessages = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          image: userMessage.imagePreview || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Chat API error:", data);
        throw new Error(data?.error || "Chat request failed");
      }

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };

      updateConversationMessages(activeConversation.id, [
        ...nextMessages,
        assistantMessage,
      ]);
    } catch (err) {
      console.error(err);

      setError("ارسال پیام با خطا مواجه شد. لاگ ترمینال یا Vercel را بررسی کن.");

      const errorMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "خطا در دریافت پاسخ از AI.",
        createdAt: new Date().toISOString(),
      };

      updateConversationMessages(activeConversation.id, [
        ...nextMessages,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">★</div>
          <div>
            <div className="brand-title">StarAI</div>
            <div className="brand-subtitle">AI Chat Platform</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          + چت جدید
        </button>

        <div className="sidebar-section-title">تاریخچه چت‌ها</div>

        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={
                conversation.id === activeConversationId
                  ? "conversation-item active"
                  : "conversation-item"
              }
              onClick={() => setActiveConversationId(conversation.id)}
            >
              <span>{conversation.title}</span>

              <span
                className="delete-chat"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conversation.id);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <h1>چت هوش مصنوعی</h1>
            <p>ارسال متن، تحلیل عکس و ذخیره چت‌ها</p>
          </div>

          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="openrouter/free">OpenRouter Free</option>
          </select>
        </header>

        <div className="chat-body">
          {activeConversation?.messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h2>از StarAI بپرسید</h2>
              <p>
                یک پیام بنویسید یا یک عکس ارسال کنید تا مدل هوش مصنوعی پاسخ دهد.
              </p>

              <div className="quick-cards">
                <button onClick={() => setInput("برای من یک متن تبلیغاتی کوتاه بنویس")}>
                  متن تبلیغاتی
                </button>
                <button onClick={() => setInput("این ایده کسب‌وکار را تحلیل کن")}>
                  تحلیل ایده
                </button>
                <button onClick={() => setInput("یک برنامه مطالعه ۷ روزه بده")}>
                  برنامه‌ریزی
                </button>
              </div>
            </div>
          )}

          {activeConversation?.messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "message-row user-message"
                  : "message-row assistant-message"
              }
            >
              <div className="message-bubble">
                <div className="message-role">
                  {message.role === "user" ? "شما" : "StarAI"}
                </div>

                {message.imagePreview && (
                  <img
                    src={message.imagePreview}
                    alt="uploaded"
                    className="message-image"
                  />
                )}

                <div className="message-content">{message.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant-message">
              <div className="message-bubble typing">در حال پاسخ دادن...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <div className="error-box">{error}</div>}

        {imageDataUrl && (
          <div className="image-preview-bar">
            <img src={imageDataUrl} alt="preview" />
            <span>تصویر آماده ارسال است</span>
            <button onClick={() => setImageDataUrl("")}>حذف</button>
          </div>
        )}

        <footer className="composer">
          <label className="upload-btn">
            📎
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageSelect(e.target.files?.[0])}
            />
          </label>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />

          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={loading}
          >
            {loading ? "..." : "ارسال"}
          </button>
        </footer>
      </section>
    </main>
  );
}