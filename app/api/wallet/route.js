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

    await supabase
      .from("wallets")
      .insert({
        user_id: user.id,
        balance: 0,
        currency: "IRT",
      })
      .select("id")
      .single()
      .then(({ error }) => {
        if (error && error.code !== "23505") {
          console.error("Create wallet error:", error);
        }
      });

    const { data, error } = await supabase
      .from("wallets")
      .select("id, balance, currency, created_at, updated_at")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Get wallet error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      wallet: data,
    });
  } catch (error) {
    console.error("Wallet API error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}