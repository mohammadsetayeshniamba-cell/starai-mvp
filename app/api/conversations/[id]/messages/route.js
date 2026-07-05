import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export async function GET(req, context) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "conversation id is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, image_preview, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase GET messages error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data });
  } catch (error) {
    console.error("GET messages server error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}