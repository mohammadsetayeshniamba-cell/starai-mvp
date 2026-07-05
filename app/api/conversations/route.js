import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Supabase GET conversations error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversations: data });
  } catch (error) {
    console.error("GET conversations server error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
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

    const { title = "چت جدید" } = await req.json();

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        client_id: user.id,
        title,
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) {
      console.error("Supabase POST conversation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("POST conversations server error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}