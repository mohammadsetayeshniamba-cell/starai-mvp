"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatToman } from "@/lib/products";

type Order = {
  id: string;
  product_slug: string;
  product_name: string;
  plan_id: string;
  plan_name: string;
  account_type: string;
  price: number;
  currency: string;
  status: string;
  fulfillment_status: string;
  created_at: string;
  delivery_message?: string;
  delivered_at?: string;
};

function getAccountTypeLabel(accountType: string) {
  if (accountType === "customer_email") return "اکانت با ایمیل مشتری";
  if (accountType === "stariai_account") return "اکانت آماده StarAI";
  if (accountType === "shared_account") return "اکانت اشتراکی";
  return accountType;
}

function getFulfillmentLabel(status: string) {
  if (status === "pending") return "در انتظار بررسی";
  if (status === "processing") return "در حال آماده‌سازی";
  if (status === "delivered") return "تحویل داده شده";
  return status;
}

function getPaymentStatusLabel(status: string) {
  if (status === "paid") return "پرداخت شده";
  if (status === "cancelled") return "لغو شده";
  if (status === "refunded") return "بازگشت وجه";
  return status;
}

export default function OrdersPage() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setAuthReady(true);

      if (data.session?.access_token) {
        loadData(data.session.access_token);
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
        loadData(newSession.access_token);
      } else {
        setOrders([]);
        setWalletBalance(0);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (token: string) => {
    setLoading(true);
    setMessage("");

    try {
      const [walletResponse, ordersResponse] = await Promise.all([
        fetch("/api/wallet", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const walletData = await walletResponse.json();
      const ordersData = await ordersResponse.json();

      if (!walletResponse.ok) {
        console.error("Wallet error:", walletData);
      } else {
        setWalletBalance(walletData.wallet?.balance ?? 0);
      }

      if (!ordersResponse.ok) {
        console.error("Orders error:", ordersData);
        setMessage("خطا در دریافت سفارش‌ها.");
      } else {
        setOrders(ordersData.orders || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
  };

  if (!authReady) {
    return (
      <main className="orders-page">
        <div className="orders-empty-card">در حال بارگذاری...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="orders-page">
        <div className="orders-empty-card">
          <h1>برای مشاهده سفارش‌ها وارد شوید</h1>
          <p>ابتدا وارد حساب کاربری شوید تا سفارش‌های شما نمایش داده شود.</p>

          <div className="orders-actions">
            <Link href="/chat">ورود / ثبت‌نام</Link>
            <Link href="/">صفحه اصلی</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <header className="orders-header">
        <div>
          <h1>سفارش‌های من</h1>
          <p>وضعیت خرید اکانت‌های هوش مصنوعی شما</p>
        </div>

        <div className="orders-header-actions">
          <Link href="/">صفحه اصلی</Link>
          <Link href="/chat">پنل چت</Link>
          <button onClick={handleLogout}>خروج</button>
        </div>
      </header>

      <section className="orders-summary-grid">
        <div className="orders-summary-card">
          <span>موجودی کیف پول</span>
          <b>{formatToman(walletBalance)}</b>
        </div>

        <div className="orders-summary-card">
          <span>تعداد سفارش‌ها</span>
          <b>{orders.length}</b>
        </div>

        <div className="orders-summary-card">
          <span>سفارش‌های در انتظار</span>
          <b>
            {
              orders.filter(
                (order) => order.fulfillment_status !== "delivered"
              ).length
            }
          </b>
        </div>
      </section>

      {message && <div className="orders-message">{message}</div>}

      <section className="orders-list-section">
        <div className="orders-list-title">
          <h2>لیست سفارش‌ها</h2>
          <Link href="/#products">خرید اکانت جدید</Link>
        </div>

        {loading && <div className="orders-empty-card">در حال دریافت سفارش‌ها...</div>}

        {!loading && orders.length === 0 && (
          <div className="orders-empty-card">
            <h3>هنوز سفارشی ثبت نکرده‌اید</h3>
            <p>از صفحه اصلی یک ابزار AI انتخاب کنید و خرید را انجام دهید.</p>
            <Link href="/#products">مشاهده ابزارها</Link>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-main">
                  <div>
                    <h3>{order.product_name}</h3>
                    <p>{order.plan_name}</p>
                  </div>

                  <div className="order-price">
                    {formatToman(order.price)}
                  </div>
                </div>

                <div className="order-meta-grid">
                  <div>
                    <span>نوع اکانت</span>
                    <b>{getAccountTypeLabel(order.account_type)}</b>
                  </div>

                  <div>
                    <span>وضعیت پرداخت</span>
                    <b>{getPaymentStatusLabel(order.status)}</b>
                  </div>

                  <div>
                    <span>وضعیت تحویل</span>
                    <b>{getFulfillmentLabel(order.fulfillment_status)}</b>
                  </div>

                  <div>
                    <span>تاریخ سفارش</span>
                    <b>
                      {new Date(order.created_at).toLocaleDateString("fa-IR")}
                    </b>
                  </div>
                </div>
                {order.delivery_message && (
                <div className="order-delivery-box">
                  <strong>اطلاعات تحویل اکانت</strong>
                  <p>{order.delivery_message}</p>
                </div>
              )}
                <div className="order-footer">
                  <span>شماره سفارش</span>
                  <code>{order.id}</code>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}