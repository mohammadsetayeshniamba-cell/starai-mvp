"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  imagePreview?: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
};

const CLIENT_ID_KEY = "starai_client_id_v1";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [clientId, setClientId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("openrouter/free");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let savedClientId = localStorage.getItem(CLIENT_ID_KEY);

    if (!savedClientId) {
      savedClientId = createId();
      localStorage.setItem(CLIENT_ID_KEY, savedClientId);
    }

    setClientId(savedClientId);
  }, []);

  const refreshConversations = useCallback(async (id: string) => {
    if (!id) return;

    const response = await fetch(
      `/api/conversations?clientId=${encodeURIComponent(id)}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Load conversations error:", data);
      return;
    }

    setConversations(data.conversations || []);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const response = await fetch(
      `/api/conversations/${conversationId}/messages`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Load messages error:", data);
      setError("خطا در دریافت پیام‌های ذخیره‌شده.");
      return;
    }

    const mappedMessages: ChatMessage[] = (data.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      imagePreview: m.image_preview || undefined,
      createdAt: m.created_at,
    }));

    setMessages(mappedMessages);
  }, []);

  useEffect(() => {
    if (clientId) {
      refreshConversations(clientId);
    }
  }, [clientId, refreshConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const handleNewChat = () => {
    setActiveConversationId("");
    setMessages([]);
    setInput("");
    setImageDataUrl("");
    setError("");
  };

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setError("");
    await loadMessages(conversationId);
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

    if (!clientId) {
      setError("clientId هنوز آماده نشده. صفحه را یک بار refresh کن.");
      return;
    }

    setLoading(true);
    setError("");

    const userContent = text || "این تصویر را تحلیل کن.";
    const selectedImage = imageDataUrl;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: userContent,
      imagePreview: selectedImage || undefined,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImageDataUrl("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          conversationId: activeConversationId || null,
          message: userContent,
          image: selectedImage || "",
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Chat API error:", data);
        throw new Error(data?.error || "Chat request failed");
      }

      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
      }

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await refreshConversations(clientId);
    } catch (err) {
      console.error(err);

      setError("ارسال پیام با خطا مواجه شد. ترمینال یا Vercel Logs را بررسی کن.");

      const errorMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "خطا در دریافت پاسخ از AI.",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
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
          {conversations.length === 0 && (
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              هنوز چتی ذخیره نشده.
            </div>
          )}

          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={
                conversation.id === activeConversationId
                  ? "conversation-item active"
                  : "conversation-item"
              }
              onClick={() => handleSelectConversation(conversation.id)}
            >
              <span>{conversation.title || "چت جدید"}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <h1>چت هوش مصنوعی</h1>
            <p>ارسال متن، تحلیل عکس و ذخیره چت‌ها در دیتابیس</p>
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
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h2>از StarAI بپرسید</h2>
              <p>
                یک پیام بنویسید یا یک عکس ارسال کنید. چت‌ها در Supabase ذخیره می‌شوند.
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

          {messages.map((message) => (
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