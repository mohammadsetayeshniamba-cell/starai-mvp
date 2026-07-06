import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";

const FULFILLMENT_STATUSES = new Set([
  "pending",
  "processing",
  "delivered",
]);

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
      .from("orders")
      .select(
        "id, user_id, buyer_email, product_slug, product_name, plan_id, plan_name, account_type, price, currency, status, fulfillment_status, customer_note, admin_note, delivery_message, delivered_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin get orders error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      orders: data,
    });
  } catch (error) {
    console.error("Admin orders GET error:", error);

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

    const {
      orderId,
      fulfillmentStatus,
      adminNote,
      deliveryMessage,
    } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (fulfillmentStatus) {
      if (!FULFILLMENT_STATUSES.has(fulfillmentStatus)) {
        return NextResponse.json(
          { error: "Invalid fulfillment status" },
          { status: 400 }
        );
      }

      updates.fulfillment_status = fulfillmentStatus;

      if (fulfillmentStatus === "delivered") {
        updates.delivered_at = new Date().toISOString();
      }
    }

    if (typeof adminNote === "string") {
      updates.admin_note = adminNote;
    }

    if (typeof deliveryMessage === "string") {
      updates.delivery_message = deliveryMessage;
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select(
        "id, user_id, buyer_email, product_slug, product_name, plan_id, plan_name, account_type, price, currency, status, fulfillment_status, customer_note, admin_note, delivery_message, delivered_at, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error("Admin update order error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      order: data,
    });
  } catch (error) {
    console.error("Admin orders PATCH error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}