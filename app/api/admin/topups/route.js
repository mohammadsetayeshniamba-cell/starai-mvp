import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

async function requireAdmin(req) {
  const { user, error: authError } = await getUserFromRequest(req);

  if (authError || !user) {
    return {
      user: null,
      error: authError || "Unauthorized",
      status: 401,
    };
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, user_id, email")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return {
      user: null,
      error: "Admin access required",
      status: 403,
    };
  }

  return {
    user,
    error: null,
    status: 200,
  };
}

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);

    if (admin.error) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("wallet_topups")
      .select(
        "id, user_id, buyer_email, amount, currency, payment_method, crypto_currency, crypto_network, crypto_wallet_address, crypto_tx_hash, tracking_code, status, admin_note, created_at, approved_at, rejected_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin get topups error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      topups: data,
    });
  } catch (error) {
    console.error("Admin topups GET error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin(req);

    if (admin.error) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      );
    }

    const { topupId, action, adminNote } = await req.json();

    if (!topupId) {
      return NextResponse.json(
        { error: "topupId is required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (action === "approve") {
      const { data, error } = await supabase
        .rpc("approve_wallet_topup", {
          p_topup_id: topupId,
        })
        .single();

      if (error) {
        console.error("Approve topup error:", error);

        if (error.message?.includes("TOPUP_NOT_PENDING")) {
          return NextResponse.json(
            { error: "این درخواست قبلاً بررسی شده است." },
            { status: 400 }
          );
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (typeof adminNote === "string") {
        await supabase
          .from("wallet_topups")
          .update({
            admin_note: adminNote,
            updated_at: new Date().toISOString(),
          })
          .eq("id", topupId);
      }

      return NextResponse.json({
        success: true,
        newBalance: data.new_balance,
      });
    }

    if (action === "reject") {
      const { data, error } = await supabase
        .from("wallet_topups")
        .update({
          status: "rejected",
          admin_note: adminNote || null,
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", topupId)
        .eq("status", "pending")
        .select("id")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "امکان رد کردن این درخواست وجود ندارد." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error) {
    console.error("Admin topups PATCH error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}