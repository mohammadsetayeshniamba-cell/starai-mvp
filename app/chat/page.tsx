"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatToman } from "@/lib/products";
type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  imagePreview?: string;
  model?: string;
  createdAt?: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
};
const AI_MODELS = [
  {
    id: "openrouter/free",
    name: "Auto Free",
    description: "انتخاب خودکار مدل رایگان",
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT OSS 120B",
    description: "قوی‌تر، مناسب تحلیل و استدلال",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT OSS 20B",
    description: "سریع‌تر و سبک‌تر",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super",
    description: "مناسب تحلیل‌های طولانی",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    description: "مناسب متن و عکس",
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Code",
    description: "مناسب کدنویسی",
  },
];

function getModelLabel(modelId?: string) {
  if (!modelId) return "";

  const found = AI_MODELS.find((model) => model.id === modelId);

  if (found) return found.name;

  return modelId.replace(":free", "");
}
function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [input, setInput] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      setAuthReady(true);

      if (!newSession) {
        setConversations([]);
        setMessages([]);
        setActiveConversationId("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  const checkAdmin = useCallback(
    async (accessToken?: string) => {
      const token = accessToken || session?.access_token;
  
      if (!token) {
        setIsAdmin(false);
        return;
      }
  
      const response = await fetch("/api/admin/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = await response.json();
  
      setIsAdmin(Boolean(data.isAdmin));
    },
    [session?.access_token]
  );

  const refreshConversations = useCallback(
    async (accessToken?: string) => {
      const token = accessToken || session?.access_token;

      if (!token) return [];

      const response = await fetch("/api/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Load conversations error:", data);
        setError("خطا در دریافت تاریخچه چت‌ها.");
        return [];
      }

      const list = data.conversations || [];
      setConversations(list);

      return list;
    },
    [session?.access_token]
  );

  const loadMessages = useCallback(
    async (conversationId: string, accessToken?: string) => {
      const token = accessToken || session?.access_token;

      if (!token || !conversationId) {
        setMessages([]);
        return;
      }

      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Load messages error:", data);
        setError("خطا در دریافت پیام‌های ذخیره‌شده.");
        return;
      }

      const mappedMessages: ChatMessage[] = (data.messages || []).map(
        (m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          imagePreview: m.image_preview || undefined,
          model: m.model || undefined,
          createdAt: m.created_at,
        })
      );

      setMessages(mappedMessages);
    },
    [session?.access_token]
  );
  const refreshWallet = useCallback(
    async (accessToken?: string) => {
      const token = accessToken || session?.access_token;
  
      if (!token) return;
  
      const response = await fetch("/api/wallet", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error("Wallet load error:", data);
        return;
      }
  
      setWalletBalance(data.wallet?.balance ?? 0);
    },
    [session?.access_token]
  );

  useEffect(() => {
    const token = session?.access_token;

    if (!token) return;

    const initConversations = async () => {
        await refreshWallet(token);
        await checkAdmin(token);
        const list = await refreshConversations(token);
      
        if (list.length > 0) {
          setActiveConversationId(list[0].id);
          await loadMessages(list[0].id, token);
        } else {
          setActiveConversationId("");
          setIsAdmin(false);
          setMessages([]);
        }
      };

    initConversations();
  }, [
    session?.access_token,
    refreshWallet,
    checkAdmin,
    refreshConversations,
    loadMessages,
  ]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const handleLogin = async () => {
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthMessage(error.message);
        return;
      }

      setAuthMessage("");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async () => {
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
      });

      if (error) {
        setAuthMessage(error.message);
        return;
      }

      if (!data.session) {
        setAuthMessage("ثبت‌نام انجام شد. ایمیل تایید را بررسی کنید.");
        return;
      }

      setAuthMessage("");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
  };

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

    if (!session?.access_token) {
      setError("برای ارسال پیام باید وارد حساب کاربری شوید.");
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
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
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
        model: data.usedModel || selectedModel,
        createdAt: new Date().toISOString(),
      };
      
      if (data.fallbackFrom) {
        setError("مدل انتخاب‌شده شلوغ بود؛ پاسخ با یک مدل رایگان جایگزین تولید شد.");
      }

      setMessages((prev) => [...prev, assistantMessage]);

      await refreshConversations(session.access_token);
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

  if (!authReady) {
    return (
      <main className="auth-shell">
        <div className="auth-card">در حال بارگذاری...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="auth-logo">★</div>

          <h1>StarAI</h1>

          <p>برای ذخیره و مشاهده چت‌های خود وارد شوید.</p>

          <input
            type="email"
            placeholder="ایمیل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authMessage && <div className="auth-message">{authMessage}</div>}

          {authMode === "login" ? (
            <button onClick={handleLogin} disabled={authLoading}>
              {authLoading ? "در حال ورود..." : "ورود"}
            </button>
          ) : (
            <button onClick={handleSignup} disabled={authLoading}>
              {authLoading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
            </button>
          )}

            <button
            className="auth-switch"
            onClick={() =>
                setAuthMode(authMode === "login" ? "signup" : "login")
            }
            >
            {authMode === "login"
                ? "حساب ندارید؟ ثبت‌نام کنید"
                : "حساب دارید؟ وارد شوید"}
            </button>

            <Link href="/" className="auth-home-link">
            بازگشت به صفحه اصلی
            </Link>
        </div>
      </main>
    );
  }

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

        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8 }}>
  وارد شده با:
  <br />
  <b>{user.email}</b>
</div>

<div className="wallet-mini-card">
  <span>موجودی کیف پول</span>
  <b>{formatToman(walletBalance ?? 0)}</b>

    <Link href="/wallet" className="wallet-buy-link">
      شارژ کیف پول
    </Link>
</div>

<button className="new-chat-btn" onClick={handleNewChat}>
  + چت جدید
</button>

        <button className="logout-btn" onClick={handleLogout}>
          خروج
        </button>
        <Link href="/wallet" className="sidebar-home-link">
          کیف پول
        </Link>
        <Link href="/orders" className="sidebar-home-link">
        سفارش‌های من
        </Link>
        {isAdmin && (
        <Link href="/admin" className="sidebar-home-link">
          پنل ادمین
        </Link>
         )}
        <Link href="/" className="sidebar-home-link">
        صفحه اصلی
        </Link>
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
            <p>ارسال متن، تحلیل عکس و ذخیره چت‌ها در حساب کاربری شما</p>
          </div>

          <div className="model-picker">
  <label>مدل پاسخ‌دهنده</label>

  <select
    className="model-select"
    value={selectedModel}
    onChange={(e) => setSelectedModel(e.target.value)}
  >
    {AI_MODELS.map((model) => (
      <option key={model.id} value={model.id}>
        {model.name}
      </option>
    ))}
  </select>

  <span>
    {AI_MODELS.find((model) => model.id === selectedModel)?.description}
  </span>
</div>
        </header>

        <div className="chat-body">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>

              <h2>از StarAI بپرسید</h2>

              <p>
                یک پیام بنویسید یا یک عکس ارسال کنید. چت‌ها در حساب شما ذخیره می‌شوند.
              </p>

              <div className="quick-cards">
                <button
                  onClick={() =>
                    setInput("برای من یک متن تبلیغاتی کوتاه بنویس")
                  }
                >
                  متن تبلیغاتی
                </button>

                <button
                  onClick={() => setInput("این ایده کسب‌وکار را تحلیل کن")}
                >
                  تحلیل ایده
                </button>

                <button
                  onClick={() => setInput("یک برنامه مطالعه ۷ روزه بده")}
                >
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
                {message.role === "assistant" && message.model && (
                <div className="message-model">
                  پاسخ با: {getModelLabel(message.model)}
                </div>
              )}
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

          <button className="send-btn" onClick={sendMessage} disabled={loading}>
            {loading ? "..." : "ارسال"}
          </button>
        </footer>
      </section>
    </main>
  );
}