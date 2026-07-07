"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatToman } from "@/lib/products";
import { cryptoPaymentOptions } from "@/lib/paymentOptions";

type Topup = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  crypto_currency?: string;
  crypto_network?: string;
  crypto_wallet_address?: string;
  crypto_tx_hash?: string;
  tracking_code?: string;
  status: string;
  admin_note?: string;
  created_at: string;
};

function getTopupStatusLabel(status: string) {
  if (status === "pending") return "در انتظار بررسی";
  if (status === "approved") return "تایید شده";
  if (status === "rejected") return "رد شده";
  if (status === "cancelled") return "لغو شده";
  return status;
}

function getPaymentMethodLabel(method: string) {
  if (method === "crypto") return "کریپتو";
  if (method === "manual_bank") return "پرداخت دستی";
  if (method === "gateway") return "درگاه پرداخت";
  return method;
}

export default function WalletPage() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [topups, setTopups] = useState<Topup[]>([]);

  const [amount, setAmount] = useState("500000");
  const [paymentMethod, setPaymentMethod] = useState<"crypto" | "manual_bank">(
    "crypto"
  );
  const [cryptoOptionId, setCryptoOptionId] = useState(
    cryptoPaymentOptions[0]?.id || ""
  );
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedCrypto = cryptoPaymentOptions.find(
    (item) => item.id === cryptoOptionId
  );

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setAuthReady(true);

      if (data.session?.access_token) {
        loadWalletPage(data.session.access_token);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      setAuthReady(true);

      if (newSession?.access_token) {
        loadWalletPage(newSession.access_token);
      } else {
        setWalletBalance(0);
        setTopups([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadWalletPage = async (token: string) => {
    setLoading(true);
    setMessage("");

    try {
      const [walletResponse, topupsResponse] = await Promise.all([
        fetch("/api/wallet", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/wallet/topups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const walletData = await walletResponse.json();
      const topupsData = await topupsResponse.json();

      if (walletResponse.ok) {
        setWalletBalance(walletData.wallet?.balance ?? 0);
      }

      if (topupsResponse.ok) {
        setTopups(topupsData.topups || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitTopup = async () => {
    if (!session?.access_token) return;

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/wallet/topups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          paymentMethod,
          cryptoOptionId,
          cryptoTxHash,
          trackingCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "ثبت درخواست شارژ با خطا مواجه شد.");
        return;
      }

      setMessage("درخواست شارژ ثبت شد و پس از بررسی ادمین تایید می‌شود.");
      setCryptoTxHash("");
      setTrackingCode("");

      await loadWalletPage(session.access_token);
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <main className="wallet-page">
        <div className="wallet-empty-card">در حال بارگذاری...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="wallet-page">
        <div className="wallet-empty-card">
          <h1>برای مشاهده کیف پول وارد شوید</h1>
          <p>ابتدا وارد حساب کاربری شوید.</p>
          <Link href="/chat">ورود / ثبت‌نام</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="wallet-page">
      <header className="wallet-header">
        <div>
          <h1>کیف پول StarAI</h1>
          <p>شارژ کیف پول با پرداخت دستی یا کریپتو</p>
        </div>

        <div className="wallet-header-actions">
          <Link href="/">صفحه اصلی</Link>
          <Link href="/orders">سفارش‌های من</Link>
          <Link href="/chat">پنل چت</Link>
        </div>
      </header>

      <section className="wallet-grid">
        <div className="wallet-balance-card">
          <span>موجودی فعلی</span>
          <b>{formatToman(walletBalance)}</b>
          <p>برای خرید اکانت‌های AI از این موجودی استفاده می‌شود.</p>
        </div>

        <div className="wallet-topup-card">
          <h2>درخواست شارژ کیف پول</h2>

          <label>
            مبلغ شارژ به تومان
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="50000"
            />
          </label>

          <div className="wallet-method-tabs">
            <button
              className={paymentMethod === "crypto" ? "active" : ""}
              onClick={() => setPaymentMethod("crypto")}
            >
              پرداخت با کریپتو
            </button>

            <button
              className={paymentMethod === "manual_bank" ? "active" : ""}
              onClick={() => setPaymentMethod("manual_bank")}
            >
              پرداخت دستی / کارت
            </button>
          </div>

          {paymentMethod === "crypto" && (
            <div className="crypto-box">
              <label>
                شبکه و ارز
                <select
                  value={cryptoOptionId}
                  onChange={(e) => setCryptoOptionId(e.target.value)}
                >
                  {cryptoPaymentOptions.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCrypto && (
                <>
                  <div className="crypto-address-box">
                    <span>آدرس ولت مقصد</span>
                    <code>{selectedCrypto.walletAddress}</code>

                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          selectedCrypto.walletAddress
                        )
                      }
                    >
                      کپی آدرس
                    </button>
                  </div>

                  <p className="crypto-note">{selectedCrypto.note}</p>
                </>
              )}

              <label>
                TXID / Hash تراکنش
                <input
                  value={cryptoTxHash}
                  onChange={(e) => setCryptoTxHash(e.target.value)}
                  placeholder="بعد از انتقال، هش تراکنش را وارد کنید"
                />
              </label>
            </div>
          )}

          {paymentMethod === "manual_bank" && (
            <div className="crypto-box">
              <p className="crypto-note">
                فعلاً درگاه پرداخت فعال نیست. بعد از پرداخت دستی، کد پیگیری را وارد کنید.
              </p>

              <label>
                کد پیگیری پرداخت
                <input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="مثلاً شماره پیگیری کارت‌به‌کارت"
                />
              </label>
            </div>
          )}

          {message && <div className="wallet-message">{message}</div>}

          <button
            className="wallet-submit-btn"
            onClick={submitTopup}
            disabled={submitting}
          >
            {submitting ? "در حال ثبت..." : "ثبت درخواست شارژ"}
          </button>
        </div>
      </section>

      <section className="wallet-history-section">
        <div className="wallet-history-title">
          <h2>درخواست‌های شارژ</h2>
        </div>

        {loading && (
          <div className="wallet-empty-card">در حال دریافت اطلاعات...</div>
        )}

        {!loading && topups.length === 0 && (
          <div className="wallet-empty-card">
            هنوز درخواست شارژی ثبت نشده است.
          </div>
        )}

        {!loading && topups.length > 0 && (
          <div className="wallet-topups-list">
            {topups.map((topup) => (
              <article className="wallet-topup-item" key={topup.id}>
                <div>
                  <h3>{formatToman(topup.amount)}</h3>
                  <p>{getPaymentMethodLabel(topup.payment_method)}</p>
                </div>

                <div>
                  <span>وضعیت</span>
                  <b>{getTopupStatusLabel(topup.status)}</b>
                </div>

                <div>
                  <span>تاریخ</span>
                  <b>
                    {new Date(topup.created_at).toLocaleDateString("fa-IR")}
                  </b>
                </div>

                {topup.crypto_tx_hash && (
                  <div>
                    <span>TXID</span>
                    <code>{topup.crypto_tx_hash}</code>
                  </div>
                )}

                {topup.admin_note && (
                  <div className="wallet-topup-note">
                    <span>یادداشت ادمین</span>
                    <p>{topup.admin_note}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}