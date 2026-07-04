import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const {
      messages = [],
      image,
      model = "openrouter/free",
    } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is missing" },
        { status: 500 }
      );
    }

    const lastMessages = messages.slice(-12);

    const openRouterMessages = lastMessages.map((m, index) => {
      const isLastUserMessage =
        index === lastMessages.length - 1 && m.role === "user";

      if (isLastUserMessage && image) {
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

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content || "پاسخی دریافت نشد.",
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