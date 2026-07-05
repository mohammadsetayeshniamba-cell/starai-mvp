import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const {
      clientId,
      conversationId,
      message,
      image,
      model = "openrouter/free",
    } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing" },
        { status: 500 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    if (!message && !image) {
      return NextResponse.json(
        { error: "message or image is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const { data: newConversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            client_id: clientId,
            title: message ? message.slice(0, 32) : "چت تصویری",
          })
          .select("id")
          .single();

      if (conversationError) {
        console.error("Create conversation error:", conversationError);
        return NextResponse.json(
          { error: conversationError.message },
          { status: 500 }
        );
      }

      activeConversationId = newConversation.id;
    }

    const userContent = message || "این تصویر را تحلیل کن.";

    const { error: userMessageError } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      role: "user",
      content: userContent,
      image_preview: image || null,
    });

    if (userMessageError) {
      console.error("Insert user message error:", userMessageError);
      return NextResponse.json(
        { error: userMessageError.message },
        { status: 500 }
      );
    }

    const { data: recentMessages, error: recentMessagesError } = await supabase
      .from("messages")
      .select("role, content, image_preview, created_at")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (recentMessagesError) {
      console.error("Recent messages error:", recentMessagesError);
      return NextResponse.json(
        { error: recentMessagesError.message },
        { status: 500 }
      );
    }

    const lastMessages = recentMessages.slice(-12);

    const openRouterMessages = lastMessages.map((m, index) => {
      const isLast =
        index === lastMessages.length - 1 && m.role === "user" && image;

      if (isLast) {
        return {
          role: "user",
          content: [
            {
              type: "text",
              text: m.content || "این تصویر را تحلیل کن.",
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        };
      }

      return {
        role: m.role,
        content: m.content,
      };
    });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-OpenRouter-Title": "StarAI MVP",
        },
        body: JSON.stringify({
          model,
          messages: openRouterMessages,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter status:", response.status);
      console.error("OpenRouter response:", data);

      return NextResponse.json(
        {
          error: "OpenRouter API failed",
          status: response.status,
          details: data,
        },
        { status: response.status }
      );
    }

    const reply = data.choices?.[0]?.message?.content || "پاسخی دریافت نشد.";

    const { error: assistantMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: reply,
      });

    if (assistantMessageError) {
      console.error("Insert assistant message error:", assistantMessageError);
      return NextResponse.json(
        { error: assistantMessageError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("conversations")
      .update({
        title: userContent.slice(0, 32),
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId)
      .eq("title", "چت جدید");

    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId);

    return NextResponse.json({
      reply,
      conversationId: activeConversationId,
      usedModel: data.model || model,
    });
  } catch (error) {
    console.error("Server error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}