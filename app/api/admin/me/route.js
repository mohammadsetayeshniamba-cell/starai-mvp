import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
      return NextResponse.json({
        isAdmin: false,
      });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Admin check error:", error);

      return NextResponse.json({
        isAdmin: false,
      });
    }

    return NextResponse.json({
      isAdmin: Boolean(data),
    });
  } catch (error) {
    console.error("Admin me error:", error);

    return NextResponse.json({
      isAdmin: false,
    });
  }
}