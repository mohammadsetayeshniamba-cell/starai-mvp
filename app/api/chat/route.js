import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

const ALLOWED_FREE_MODELS = new Set([
    "openrouter/free",
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
    "cohere/north-mini-code:free",
  ]);
  
  function getFallbackModels(selectedModel) {
    const fallbackOrder = [
      selectedModel,
      "openrouter/free",
      "openai/gpt-oss-20b:free",
      "google/gemma-4-31b-it:free",
    ];
  
    return [...new Set(fallbackOrder)].filter((model) =>
      ALLOWED_FREE_MODELS.has(model)
    );
  }
  
  async function callOpenRouter({ model, messages }) {
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
          messages,
        }),
      }
    );
  
    const data = await response.json();
  
    return {
      response,
      data,
    };
  }
export async function POST(req) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      conversationId,
      message,
      image,
      model = "openrouter/free",
    } = await req.json();
    const selectedModel = ALLOWED_FREE_MODELS.has(model)
    ? model
    : "openrouter/free";
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing" },
        { status: 500 }
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

    if (activeConversationId) {
      const { data: existingConversation, error: existingError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("id", activeConversationId)
          .eq("user_id", user.id)
          .single();

      if (existingError || !existingConversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    if (!activeConversationId) {
      const { data: newConversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            client_id: user.id,
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
      .order("created_at", { ascending: false })
      .limit(30);

    if (recentMessagesError) {
      console.error("Recent messages error:", recentMessagesError);
      return NextResponse.json(
        { error: recentMessagesError.message },
        { status: 500 }
      );
    }

    const lastMessages = [...recentMessages].reverse().slice(-12);

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

    const fallbackModels = getFallbackModels(selectedModel);

    let finalResponse = null;
    let finalData = null;
    let workingModel = null;
    let lastErrorData = null;
    let lastStatus = null;
    
    for (const candidateModel of fallbackModels) {
      console.log("Trying OpenRouter model:", candidateModel);
    
      const { response, data } = await callOpenRouter({
        model: candidateModel,
        messages: openRouterMessages,
      });
    
      if (response.ok) {
        finalResponse = response;
        finalData = data;
        workingModel = candidateModel;
        break;
      }
    
      lastErrorData = data;
      lastStatus = response.status;
    
      console.error("OpenRouter failed model:", candidateModel);
      console.error("OpenRouter status:", response.status);
      console.error("OpenRouter response:", data);
    
      const shouldRetry =
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;
    
      if (!shouldRetry) {
        break;
      }
    }
    
    if (!finalResponse || !finalData || !workingModel) {
      return NextResponse.json(
        {
          error: "OpenRouter API failed",
          status: lastStatus,
          details: lastErrorData,
        },
        { status: lastStatus || 500 }
      );
    }
    
    const data = finalData;
    const fallbackFrom =
      workingModel !== selectedModel ? selectedModel : null;

    const reply = data.choices?.[0]?.message?.content || "پاسخی دریافت نشد.";
    const usedModel = data.model || workingModel;
        const { error: assistantMessageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: activeConversationId,
      role: "assistant",
      content: reply,
      model: usedModel,
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeConversationId)
      .eq("user_id", user.id);

      return NextResponse.json({
        reply,
        conversationId: activeConversationId,
        usedModel,
        fallbackFrom,
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