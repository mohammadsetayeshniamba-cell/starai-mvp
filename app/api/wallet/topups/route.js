import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { getCryptoPaymentOption } from "@/lib/paymentOptions";

const PAYMENT_METHODS = new Set(["manual_bank", "crypto", "gateway"]);

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
      .from("wallet_topups")
      .select(
        "id, amount, currency, payment_method, crypto_currency, crypto_network, crypto_wallet_address, crypto_tx_hash, tracking_code, status, admin_note, created_at, approved_at, rejected_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get topups error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      topups: data,
    });
  } catch (error) {
    console.error("Wallet topups GET error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
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
      amount,
      paymentMethod,
      cryptoOptionId,
      cryptoTxHash,
      trackingCode,
    } = await req.json();

    const cleanAmount = Number(amount);

    if (!cleanAmount || cleanAmount < 50000) {
      return NextResponse.json(
        { error: "حداقل مبلغ شارژ ۵۰٬۰۰۰ تومان است." },
        { status: 400 }
      );
    }

    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json(
        { error: "روش پرداخت نامعتبر است." },
        { status: 400 }
      );
    }

    let cryptoOption = null;

    if (paymentMethod === "crypto") {
      cryptoOption = getCryptoPaymentOption(cryptoOptionId);

      if (!cryptoOption) {
        return NextResponse.json(
          { error: "شبکه کریپتو نامعتبر است." },
          { status: 400 }
        );
      }

      if (!cryptoTxHash || cryptoTxHash.trim().length < 8) {
        return NextResponse.json(
          { error: "هش تراکنش یا TXID را وارد کنید." },
          { status: 400 }
        );
      }
    }

    if (paymentMethod === "manual_bank") {
      if (!trackingCode || trackingCode.trim().length < 4) {
        return NextResponse.json(
          { error: "کد پیگیری پرداخت را وارد کنید." },
          { status: 400 }
        );
      }
    }

    if (paymentMethod === "gateway") {
      return NextResponse.json(
        {
          error:
            "درگاه پرداخت هنوز فعال نشده است. فعلاً از پرداخت کریپتو یا پرداخت دستی استفاده کنید.",
        },
        { status: 501 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("wallet_topups")
      .insert({
        user_id: user.id,
        buyer_email: user.email || null,

        amount: cleanAmount,
        currency: "IRT",

        payment_method: paymentMethod,

        crypto_currency: cryptoOption?.currency || null,
        crypto_network: cryptoOption?.network || null,
        crypto_wallet_address: cryptoOption?.walletAddress || null,
        crypto_tx_hash: cryptoTxHash || null,

        tracking_code: trackingCode || null,

        status: "pending",
      })
      .select(
        "id, amount, currency, payment_method, crypto_currency, crypto_network, crypto_wallet_address, crypto_tx_hash, tracking_code, status, created_at"
      )
      .single();

    if (error) {
      console.error("Create topup error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      topup: data,
    });
  } catch (error) {
    console.error("Wallet topups POST error:", error);

    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}