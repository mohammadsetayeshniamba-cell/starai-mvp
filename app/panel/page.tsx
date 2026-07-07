"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatToman } from "@/lib/products";

type Order = {
  id: string;
  product_name: string;
  plan_name: string;
  account_type: string;
  fulfillment_email?: string;
  price: number;
  status: string;
  fulfillment_status: string;
  delivery_message?: string;
  delivered_at?: string;
  created_at: string;
};

type Transaction = {
  id: string;
  order_id?: string;
  type: string;
  amount: number;
  balance_after: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
};

function getAccountTypeLabel(accountType: string) {
  if (accountType === "customer_email") return "با ایمیل مشتری";
  if (accountType === "stariai_account") return "اکانت آماده StarAI";
  if (accountType === "shared_account") return "اکانت اشتراکی";
  return accountType;
}

function getFulfillmentLabel(status: string) {
  if (status === "pending") return "در انتظار آماده‌سازی";
  if (status === "processing") return "در حال آماده‌سازی";
  if (status === "delivered") return "تحویل داده شده";
  return status;
}

function getTransactionLabel(type: string) {
  if (type === "deposit") return "شارژ کیف پول";
  if (type === "purchase") return "خرید";
  if (type === "refund") return "بازگشت وجه";
  if (type === "adjustment") return "اصلاح موجودی";
  return type;
}

export default function PanelPage() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [walletBalance, setWalletBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setAuthReady(true);

      if (data.session?.access_token) {
        loadPanel(data.session.access_token);
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
        loadPanel(newSession.access_token);
      } else {
        setWalletBalance(0);
        setOrders([]);
        setTransactions([]);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadPanel = async (token: string) => {
    setLoading(true);
    setMessage("");

    try {
      const [walletResponse, ordersResponse, txResponse, adminResponse] =
        await Promise.all([
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
          fetch("/api/wallet/transactions", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/admin/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      const walletData = await walletResponse.json();
      const ordersData = await ordersResponse.json();
      const txData = await txResponse.json();
      const adminData = await adminResponse.json();

      if (walletResponse.ok) {
        setWalletBalance(walletData.wallet?.balance ?? 0);
      }

      if (ordersResponse.ok) {
        setOrders(ordersData.orders || []);
      }

      if (txResponse.ok) {
        setTransactions(txData.transactions || []);
      }

      if (adminResponse.ok) {
        setIsAdmin(Boolean(adminData.isAdmin));
      }
    } catch (error) {
      console.error("Panel load error:", error);
      setMessage("خطا در دریافت اطلاعات پنل.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
  };

  const deliveredAccounts = orders.filter(
    (order) => order.fulfillment_status === "delivered"
  );

  const pendingOrders = orders.filter(
    (order) => order.fulfillment_status !== "delivered"
  );

  if (!authReady) {
    return (
      <main className="user-panel-page">
        <div className="panel-empty-card">در حال بارگذاری...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="user-panel-page">
        <section className="panel-login-card">
          <div className="panel-login-logo">✦</div>
          <h1>ورود به پنل StarAI</h1>
          <p>
            برای مشاهده کیف پول، سفارش‌ها، اکانت‌های خریداری‌شده و ورود به چت
            ابتدا وارد حساب کاربری شوید.
          </p>

          <Link href="/chat" className="panel-primary-link">
            ورود / ثبت‌نام
          </Link>

          <Link href="/" className="panel-secondary-link">
            بازگشت به صفحه اصلی
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="user-panel-page">
      <header className="user-panel-header">
        <div>
          <span className="panel-kicker">StarAI Dashboard</span>
          <h1>پنل کاربری</h1>
          <p>
            خوش آمدید، <b>{user.email}</b>
          </p>
        </div>

        <div className="user-panel-actions">
          <Link href="/chat" className="panel-chat-btn">
            ورود به پنل چت
          </Link>

          <Link href="/wallet">کیف پول</Link>
          <Link href="/orders">سفارش‌ها</Link>
          <Link href="/">صفحه اصلی</Link>

          {isAdmin && <Link href="/admin">پنل ادمین</Link>}

          <button onClick={handleLogout}>خروج</button>
        </div>
      </header>

      {message && <div className="panel-message">{message}</div>}

      <section className="panel-stat-grid">
        <div className="panel-stat-card main">
          <span>موجودی کیف پول</span>
          <b>{formatToman(walletBalance)}</b>
          <Link href="/wallet">شارژ کیف پول</Link>
        </div>

        <div className="panel-stat-card">
          <span>اکانت‌های تحویل‌شده</span>
          <b>{deliveredAccounts.length}</b>
          <small>اکانت‌هایی که اطلاعات ورود دارند</small>
        </div>

        <div className="panel-stat-card">
          <span>سفارش‌های در جریان</span>
          <b>{pendingOrders.length}</b>
          <small>در انتظار آماده‌سازی یا بررسی</small>
        </div>

        <div className="panel-stat-card">
          <span>تعداد تراکنش‌ها</span>
          <b>{transactions.length}</b>
          <small>آخرین ۲۰ تراکنش کیف پول</small>
        </div>
      </section>

      <section className="panel-main-grid">
        <div className="panel-card panel-accounts-card">
          <div className="panel-section-title">
            <h2>اکانت‌های خریداری‌شده</h2>
            <Link href="/orders">مشاهده همه</Link>
          </div>

          {loading && <p className="panel-muted">در حال دریافت سفارش‌ها...</p>}

          {!loading && deliveredAccounts.length === 0 && (
            <div className="panel-soft-empty">
              هنوز اکانت تحویل‌شده‌ای ندارید.
              <Link href="/">خرید اکانت AI</Link>
            </div>
          )}

          {!loading &&
            deliveredAccounts.slice(0, 5).map((order) => (
              <article className="panel-account-item" key={order.id}>
                <div className="panel-account-top">
                  <div>
                    <h3>
                      {order.product_name} - {order.plan_name}
                    </h3>
                    <p>{getAccountTypeLabel(order.account_type)}</p>
                  </div>

                  <span>{getFulfillmentLabel(order.fulfillment_status)}</span>
                </div>

                {order.fulfillment_email && (
                  <div className="panel-field">
                    <small>ایمیل مقصد</small>
                    <code>{order.fulfillment_email}</code>
                  </div>
                )}

                {order.delivery_message && (
                  <div className="panel-delivery-box">
                    <small>اطلاعات ورود / تحویل</small>
                    <pre>{order.delivery_message}</pre>
                  </div>
                )}
              </article>
            ))}
        </div>

        <div className="panel-card">
          <div className="panel-section-title">
            <h2>تاریخچه تراکنش‌ها</h2>
            <Link href="/wallet">جزئیات کیف پول</Link>
          </div>

          {loading && <p className="panel-muted">در حال دریافت تراکنش‌ها...</p>}

          {!loading && transactions.length === 0 && (
            <div className="panel-soft-empty">
              هنوز تراکنشی ثبت نشده است.
            </div>
          )}

          {!loading &&
            transactions.slice(0, 8).map((tx) => (
              <article className="panel-transaction-item" key={tx.id}>
                <div>
                  <h3>{getTransactionLabel(tx.type)}</h3>
                  <p>{tx.description || "بدون توضیح"}</p>
                </div>

                <div className={tx.amount >= 0 ? "tx-positive" : "tx-negative"}>
                  {tx.amount >= 0 ? "+" : ""}
                  {formatToman(tx.amount)}
                </div>
              </article>
            ))}
        </div>
      </section>

      <section className="panel-card panel-orders-card">
        <div className="panel-section-title">
          <h2>آخرین سفارش‌ها</h2>
          <Link href="/orders">مشاهده همه سفارش‌ها</Link>
        </div>

        {!loading && orders.length === 0 && (
          <div className="panel-soft-empty">
            هنوز سفارشی ثبت نکرده‌اید.
            <Link href="/">مشاهده محصولات</Link>
          </div>
        )}

        {!loading &&
          orders.slice(0, 6).map((order) => (
            <article className="panel-order-row" key={order.id}>
              <div>
                <h3>
                  {order.product_name} - {order.plan_name}
                </h3>
                <p>
                  {getAccountTypeLabel(order.account_type)} ·{" "}
                  {new Date(order.created_at).toLocaleDateString("fa-IR")}
                </p>
              </div>

              <div>
                <b>{formatToman(order.price)}</b>
                <span>{getFulfillmentLabel(order.fulfillment_status)}</span>
              </div>
            </article>
          ))}
      </section>
    </main>
  );
}