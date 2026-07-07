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
  const models = [
    selectedModel,
    "openrouter/free",
    "openai/gpt-oss-20b:free",
    "openai/gpt-oss-120b:free",
    "google/gemma-4-31b-it:free",
  ];

  return [...new Set(models)].filter((model) =>
    ALLOWED_FREE_MODELS.has(model)
  );
}

function parseMaybeJson(rawText) {
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return {
      raw: rawText,
    };
  }
}
function isSecurityPolicyError(message) {
  return String(message || "")
    .toLowerCase()
    .includes("access denied by security policy");
}

async function callOpenRouter({ model, messages, siteUrl }) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl || "http://localhost:3000",
      "X-Title": "StarAI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 900,
    }),
  });

  const rawText = await response.text();
  const data = parseMaybeJson(rawText);

  if (!response.ok) {
    const openRouterMessage =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      data?.raw ||
      rawText ||
      `OpenRouter HTTP ${response.status}`;

    throw new Error(
      `Model ${model} failed: ${response.status} ${response.statusText} - ${openRouterMessage}`
    );
  }

  const reply = data?.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error(
      `Model ${model} returned no content. Raw response: ${rawText.slice(
        0,
        500
      )}`
    );
  }

  return {
    reply,
    usedModel: data?.model || model,
  };
}

function getErrorStatus(message) {
  if (message.includes("OPENROUTER_API_KEY")) return 500;
  if (message.includes("401")) return 401;
  if (message.includes("402")) return 402;
  if (message.includes("403")) return 403;
  if (message.includes("429")) return 429;
  return 500;
}

export async function POST(req) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
      return NextResponse.json(
        {
          error: authError || "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const siteUrl =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
    const {
      message,
      messages = [],
      conversationId,
      clientId,
      model = "openrouter/free",
      imagePreview,
    } = body;

    if (!message || !String(message).trim()) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let activeConversationId = conversationId || "";

    if (activeConversationId) {
      const { data: existingConversation, error: conversationError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("id", activeConversationId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (conversationError) {
        console.error("Conversation check error:", conversationError);
      }

      if (!existingConversation) {
        activeConversationId = "";
      }
    }

    if (!activeConversationId) {
      const title =
        String(message).trim().length > 40
          ? String(message).trim().slice(0, 40) + "..."
          : String(message).trim();

      const { data: newConversation, error: createConversationError } =
        await supabase
          .from("conversations")
          .insert({
            client_id: clientId || user.id,
            user_id: user.id,
            title,
          })
          .select("id")
          .single();

      if (createConversationError) {
        console.error("Create conversation error:", createConversationError);

        return NextResponse.json(
          {
            error: createConversationError.message,
          },
          { status: 500 }
        );
      }

      activeConversationId = newConversation.id;
    }
    function buildPolicyFallbackReply() {
      return [
        "این گفتگو شامل بخشی از متن یا تاریخچه‌ای است که توسط سیاست امنیتی مدل قابل ارسال نیست.",
        "",
        "برای ادامه، لطفاً پیام را بدون اطلاعات حساس مثل پسورد، API Key، توکن، لاگ امنیتی یا متن مشکوک دوباره بنویسید.",
        "",
        "پیشنهاد: یک چت جدید باز کنید و فقط سؤال اصلی را بدون اطلاعات محرمانه بپرسید.",
      ].join("\n");
    }

    const cleanMessage = sanitizeForModel(message);
    
    const { error: saveUserMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "user",
        content: cleanMessage,
        image_preview: imagePreview || null,
      });

    if (saveUserMessageError) {
      console.error("Save user message error:", saveUserMessageError);
    }

    const systemMessage = {
      role: "system",
      content:
      "You are StarAI, a helpful Persian-first AI assistant. پاسخ‌ها را شفاف، کاربردی و تا حد امکان فارسی بده. برای قالب‌بندی از Markdown استفاده کن. اگر جدول لازم بود، جدول را با فرمت Markdown/GFM بساز. از HTML خام مثل <br> استفاده نکن و به جای آن خط جدید معمولی بگذار.",
    };
    
    function sanitizeForModel(text) {
      return String(text || "")
        .replace(/sk-[a-zA-Z0-9-_]{12,}/g, "[REDACTED_API_KEY]")
        .replace(/sk-or-v1-[a-zA-Z0-9-_]{12,}/g, "[REDACTED_OPENROUTER_KEY]")
        .replace(/sb_secret_[a-zA-Z0-9-_]{12,}/g, "[REDACTED_SUPABASE_SECRET]")
        .replace(/eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/g, "[REDACTED_TOKEN]")
        .replace(/password\s*[:=]\s*[^\s\n]+/gi, "password: [REDACTED]")
        .replace(/رمز\s*[:=]\s*[^\s\n]+/gi, "رمز: [REDACTED]")
        .trim();
    }
    
 const historyMessages = [];

    
    const fullChatMessages = [systemMessage, ...historyMessages];
    
    const lastMessage = fullChatMessages[fullChatMessages.length - 1];
    
    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      lastMessage.content !== cleanMessage
    ) {
      fullChatMessages.push({
        role: "user",
        content: cleanMessage,
      });
    }
    
    const minimalChatMessages = [
      systemMessage,
      {
        role: "user",
        content: cleanMessage,
      },
    ];
    const fallbackModels = getFallbackModels(model);

    if (fallbackModels.length === 0) {
      return NextResponse.json(
        {
          error: "Selected model is not allowed.",
        },
        { status: 400 }
      );
    }

    let reply = "";
    let usedModel = "";
    let fallbackFrom = "";
    let historySkippedDueToPolicy = false;
    const modelErrors = [];
    
    for (const candidateModel of fallbackModels) {
      try {
        const result = await callOpenRouter({
          model: candidateModel,
          messages: minimalChatMessages,
          siteUrl,
        });
        reply = result.reply;
        usedModel = result.usedModel || candidateModel;
    
        if (candidateModel !== model) {
          fallbackFrom = model;
        }
    
        break;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
    
        console.error("OpenRouter model failed with history:", errorMessage);
        modelErrors.push(errorMessage);
    
        if (isSecurityPolicyError(errorMessage)) {
          try {
            const retryResult = await callOpenRouter({
              model: candidateModel,
              messages: minimalChatMessages,
            });
    
            reply = retryResult.reply;
            usedModel = retryResult.usedModel || candidateModel;
            historySkippedDueToPolicy = true;
    
            if (candidateModel !== model) {
              fallbackFrom = model;
            }
    
            break;
          } catch (retryError) {
            const retryErrorMessage =
              retryError instanceof Error
                ? retryError.message
                : String(retryError);
    
            console.error(
              "OpenRouter model failed without history:",
              retryErrorMessage
            );
    
            modelErrors.push(retryErrorMessage);
          }
        }
      }
    }

    if (!reply) {
      const allErrorsText = modelErrors.join(" | ");
    
      throw new Error("OpenRouter API failed. " + allErrorsText);
    }

    const { error: saveAssistantMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: reply,
        model: usedModel,
      });

    if (saveAssistantMessageError) {
      console.error(
        "Save assistant message error:",
        saveAssistantMessageError
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
        historySkippedDueToPolicy,
      });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || "Server error");

    console.error("Chat API fatal error:", message);

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: getErrorStatus(message),
      }
    );
  }
}