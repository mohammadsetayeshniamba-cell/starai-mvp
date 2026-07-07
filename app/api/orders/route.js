import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { getProductBySlug } from "@/lib/products";

const ACCOUNT_TYPES = new Set([
  "customer_email",
  "stariai_account",
  "shared_account",
]);

function getAccountTypeLabel(accountType) {
  if (accountType === "customer_email") return "خرید با ایمیل مشتری";
  if (accountType === "stariai_account") return "اکانت آماده StarAI";
  if (accountType === "shared_account") return "اکانت اشتراکی";
  return accountType;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

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
      .from("orders")
      .select(
        "id, product_slug, product_name, plan_id, plan_name, account_type, fulfillment_email, price, currency, status, fulfillment_status, delivery_message, delivered_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get orders error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch (error) {
    console.error("Orders GET API error:", error);
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

    const {
      productSlug,
      planId,
      accountType,
      fulfillmentEmail,
    } = await req.json();

    if (!productSlug || !planId || !accountType) {
      return NextResponse.json(
        { error: "productSlug, planId and accountType are required" },
        { status: 400 }
      );
    }

    if (!ACCOUNT_TYPES.has(accountType)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    if (accountType === "customer_email" && !isValidEmail(fulfillmentEmail)) {
      return NextResponse.json(
        {
          error:
            "برای خرید با ایمیل شخصی، ایمیل مقصد معتبر را وارد کنید.",
        },
        { status: 400 }
      );
    }

    const product = getProductBySlug(productSlug);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const plan = product.plans.find((item) => item.id === planId);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    const finalPrice =
      accountType === "shared_account"
        ? Math.ceil(plan.price / 4)
        : plan.price;

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .rpc("purchase_with_wallet", {
        p_user_id: user.id,
        p_buyer_email: user.email || null,
        p_fulfillment_email:
          accountType === "customer_email"
            ? String(fulfillmentEmail).trim()
            : null,
        p_product_slug: product.slug,
        p_product_name: product.name,
        p_plan_id: plan.id,
        p_plan_name: plan.name,
        p_account_type: accountType,
        p_price: finalPrice,
      })
      .single();

    if (error) {
      console.error("Purchase RPC error:", error);

      if (error.message?.includes("INSUFFICIENT_BALANCE")) {
        return NextResponse.json(
          {
            error: "INSUFFICIENT_BALANCE",
            message: "موجودی کیف پول کافی نیست.",
          },
          { status: 402 }
        );
      }

      if (error.message?.includes("FULFILLMENT_EMAIL_REQUIRED")) {
        return NextResponse.json(
          {
            error: "FULFILLMENT_EMAIL_REQUIRED",
            message: "ایمیل مقصد برای ساخت اکانت الزامی است.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let autoDelivery = null;

    if (accountType !== "customer_email") {
      const { data: deliveryData, error: deliveryError } = await supabase
        .rpc("auto_deliver_order_from_inventory", {
          p_order_id: data.order_id,
        })
        .single();

      if (deliveryError) {
        console.error("Auto delivery error:", deliveryError);
      } else {
        autoDelivery = deliveryData;
      }
    }

    return NextResponse.json({
      orderId: data.order_id,
      newBalance: data.new_balance,
      product: {
        slug: product.slug,
        name: product.name,
      },
      plan: {
        id: plan.id,
        name: plan.name,
      },
      accountType,
      accountTypeLabel: getAccountTypeLabel(accountType),
      fulfillmentEmail:
        accountType === "customer_email"
          ? String(fulfillmentEmail).trim()
          : null,
      price: finalPrice,
      autoDelivered: Boolean(autoDelivery?.delivered),
      deliveryMessage: autoDelivery?.message || null,
    });
  } catch (error) {
    console.error("Orders POST API error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}