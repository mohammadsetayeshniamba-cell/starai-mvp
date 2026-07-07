"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatToman } from "@/lib/products";

type Topup = {
  id: string;
  user_id: string;
  buyer_email?: string;
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

function getStatusLabel(status: string) {
  if (status === "pending") return "در انتظار بررسی";
  if (status === "approved") return "تایید شده";
  if (status === "rejected") return "رد شده";
  return status;
}

function getMethodLabel(method: string) {
  if (method === "crypto") return "کریپتو";
  if (method === "manual_bank") return "پرداخت دستی";
  if (method === "gateway") return "درگاه";
  return method;
}

export default function AdminTopupsPage() {
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);

      if (data.session?.access_token) {
        loadTopups(data.session.access_token);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadTopups = async (token: string) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/topups", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage("دسترسی به درخواست‌های شارژ ممکن نیست.");
        setTopups([]);
        return;
      }

      setTopups(data.topups || []);

      const nextNotes: Record<string, string> = {};
      for (const item of data.topups || []) {
        nextNotes[item.id] = item.admin_note || "";
      }
      setNotes(nextNotes);
    } finally {
      setLoading(false);
    }
  };

  const updateTopup = async (topupId: string, action: "approve" | "reject") => {
    if (!session?.access_token) return;

    setSavingId(topupId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/topups", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          topupId,
          action,
          adminNote: notes[topupId] || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "عملیات با خطا مواجه شد.");
        return;
      }

      setMessage("درخواست شارژ با موفقیت بروزرسانی شد.");
      await loadTopups(session.access_token);
    } finally {
      setSavingId("");
    }
  };

  if (!authReady) {
    return (
      <main className="admin-page">
        <div className="admin-empty-card">در حال بارگذاری...</div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>مدیریت شارژ کیف پول</h1>
          <p>تایید یا رد درخواست‌های شارژ بانکی و کریپتو</p>
        </div>

        <div className="admin-header-actions">
          <Link href="/admin">سفارش‌ها</Link>
          <Link href="/">صفحه اصلی</Link>
          <Link href="/chat">پنل چت</Link>
        </div>
      </header>

      {message && <div className="admin-message">{message}</div>}

      {loading && (
        <div className="admin-empty-card">در حال دریافت درخواست‌ها...</div>
      )}

      {!loading && topups.length === 0 && (
        <div className="admin-empty-card">
          <h3>درخواستی ثبت نشده است</h3>
        </div>
      )}

      {!loading && topups.length > 0 && (
        <section className="admin-orders-list">
          {topups.map((topup) => (
            <article className="admin-order-card" key={topup.id}>
              <div className="admin-order-top">
                <div>
                  <h3>{formatToman(topup.amount)}</h3>
                  <p>
                    کاربر: <b>{topup.buyer_email || topup.user_id}</b>
                  </p>
                </div>

                <div className="admin-order-price">
                  {getStatusLabel(topup.status)}
                </div>
              </div>

              <div className="admin-order-info">
                <div>
                  <span>روش پرداخت</span>
                  <b>{getMethodLabel(topup.payment_method)}</b>
                </div>

                <div>
                  <span>شبکه</span>
                  <b>
                    {topup.crypto_currency
                      ? `${topup.crypto_currency} - ${topup.crypto_network}`
                      : "-"}
                  </b>
                </div>

                <div>
                  <span>کد پیگیری</span>
                  <code>{topup.tracking_code || "-"}</code>
                </div>

                <div>
                  <span>تاریخ</span>
                  <b>
                    {new Date(topup.created_at).toLocaleDateString("fa-IR")}
                  </b>
                </div>
              </div>

              {topup.crypto_tx_hash && (
                <div className="admin-hash-box">
                  <span>TXID / Hash</span>
                  <code>{topup.crypto_tx_hash}</code>
                </div>
              )}

              <div className="admin-edit-grid">
                <label>
                  یادداشت ادمین
                  <textarea
                    value={notes[topup.id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({
                        ...prev,
                        [topup.id]: e.target.value,
                      }))
                    }
                    placeholder="مثلاً تایید شد / مبلغ واریزی با درخواست تطابق ندارد..."
                  />
                </label>
              </div>

              {topup.status === "pending" && (
                <div className="admin-action-row">
                  <button
                    className="admin-save-btn"
                    disabled={savingId === topup.id}
                    onClick={() => updateTopup(topup.id, "approve")}
                  >
                    تایید و شارژ کیف پول
                  </button>

                  <button
                    className="admin-reject-btn"
                    disabled={savingId === topup.id}
                    onClick={() => updateTopup(topup.id, "reject")}
                  >
                    رد درخواست
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}