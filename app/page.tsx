"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    setError("");
    setLoading(true);

    const userMsg = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");

    try {
      const res = await axios.post("/api/chat", {
        message: currentInput,
      });

      const botMsg = {
        role: "assistant",
        content: res.data.reply,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);

      setError("ارسال پیام با خطا مواجه شد. ترمینال را چک کن.");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "خطا در دریافت پاسخ از AI",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2>StarAI Chat MVP</h2>
      <h3>Mohammad Setayeshnia</h3>

      <div
        style={{
          height: 400,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: 12,
          marginBottom: 12,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{m.role === "user" ? "شما" : "AI"}:</b>
            <div>{m.content}</div>
          </div>
        ))}

        {loading && <div>AI در حال پاسخ دادن است...</div>}
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="پیام خود را بنویسید..."
          style={{
            flex: 1,
            padding: 10,
            border: "1px solid #ccc",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          style={{ padding: "10px 16px" }}
        >
          {loading ? "..." : "ارسال"}
        </button>
      </div>
    </main>
  );
}