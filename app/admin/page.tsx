"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { formatToman } from "@/lib/products";

type Order = {
  id: string;
  user_id: string;
  buyer_email?: string;
  product_slug: string;
  product_name: string;
  plan_id: string;
  plan_name: string;
  account_type: string;
  price: number;
  currency: string;
  status: string;
  fulfillment_status: string;
  customer_note?: string;
  admin_note?: string;
  delivery_message?: string;
  delivered_at?: string;
  created_at: string;
  updated_at?: string;
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

export default function AdminPage() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);
      setAuthReady(true);

      if (data.session?.access_token) {
        loadOrders(data.session.access_token);
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
        loadOrders(newSession.access_token);
      } else {
        setOrders([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadOrders = async (token: string) => {
    setLoading(true);
    setMessage("");
    setAccessDenied(false);

    try {
      const response = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Admin orders error:", data);

        if (response.status === 403) {
          setAccessDenied(true);
        } else {
          setMessage("خطا در دریافت سفارش‌ها.");
        }

        setOrders([]);
        return;
      }

      setOrders(data.orders || []);

      const initialEdits: Record<string, any> = {};

      for (const order of data.orders || []) {
        initialEdits[order.id] = {
          fulfillmentStatus: order.fulfillment_status,
          adminNote: order.admin_note || "",
          deliveryMessage: order.delivery_message || "",
        };
      }

      setEdits(initialEdits);
    } finally {
      setLoading(false);
    }
  };

  const updateEdit = (orderId: string, key: string, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [key]: value,
      },
    }));
  };

  const saveOrder = async (order: Order) => {
    if (!session?.access_token) return;

    setSavingId(order.id);
    setMessage("");

    const edit = edits[order.id] || {};

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          fulfillmentStatus: edit.fulfillmentStatus,
          adminNote: edit.adminNote,
          deliveryMessage: edit.deliveryMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Save order error:", data);
        setMessage("ذخیره سفارش با خطا مواجه شد.");
        return;
      }

      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? data.order : item))
      );

      setMessage("سفارش با موفقیت ذخیره شد.");
    } finally {
      setSavingId("");
    }
  };

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
  };

  if (!authReady) {
    return (
      <main className="admin-page">
        <div className="admin-empty-card">در حال بارگذاری...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-page">
        <div className="admin-empty-card">
          <h1>ورود ادمین</h1>
          <p>برای ورود به پنل ادمین ابتدا وارد حساب کاربری شوید.</p>
          <Link href="/chat">ورود / ثبت‌نام</Link>
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="admin-page">
        <div className="admin-empty-card">
          <h1>دسترسی غیرمجاز</h1>
          <p>این حساب کاربری ادمین نیست.</p>
          <Link href="/">بازگشت به صفحه اصلی</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>پنل ادمین سفارش‌ها</h1>
          <p>مدیریت سفارش‌ها، وضعیت تحویل و اطلاعات اکانت</p>
        </div>

        <div className="admin-header-actions">
          <Link href="/">صفحه اصلی</Link>
          <Link href="/orders">سفارش‌های من</Link>
          <Link href="/chat">پنل چت</Link>
          <button onClick={handleLogout}>خروج</button>
        </div>
      </header>

      <section className="admin-stats-grid">
        <div>
          <span>کل سفارش‌ها</span>
          <b>{orders.length}</b>
        </div>

        <div>
          <span>در انتظار بررسی</span>
          <b>
            {
              orders.filter(
                (order) => order.fulfillment_status === "pending"
              ).length
            }
          </b>
        </div>

        <div>
          <span>در حال آماده‌سازی</span>
          <b>
            {
              orders.filter(
                (order) => order.fulfillment_status === "processing"
              ).length
            }
          </b>
        </div>

        <div>
          <span>تحویل‌شده</span>
          <b>
            {
              orders.filter(
                (order) => order.fulfillment_status === "delivered"
              ).length
            }
          </b>
        </div>
      </section>

      {message && <div className="admin-message">{message}</div>}

      {loading && (
        <div className="admin-empty-card">در حال دریافت سفارش‌ها...</div>
      )}

      {!loading && orders.length === 0 && (
        <div className="admin-empty-card">
          <h3>هنوز سفارشی ثبت نشده است</h3>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <section className="admin-orders-list">
          {orders.map((order) => {
            const edit = edits[order.id] || {};

            return (
              <article className="admin-order-card" key={order.id}>
                <div className="admin-order-top">
                  <div>
                    <h3>
                      {order.product_name} - {order.plan_name}
                    </h3>

                    <p>
                      خریدار:{" "}
                      <b>{order.buyer_email || order.user_id}</b>
                    </p>
                  </div>

                  <div className="admin-order-price">
                    {formatToman(order.price)}
                  </div>
                </div>

                <div className="admin-order-info">
                  <div>
                    <span>نوع اکانت</span>
                    <b>{getAccountTypeLabel(order.account_type)}</b>
                  </div>

                  <div>
                    <span>وضعیت فعلی</span>
                    <b>{getFulfillmentLabel(order.fulfillment_status)}</b>
                  </div>

                  <div>
                    <span>تاریخ سفارش</span>
                    <b>
                      {new Date(order.created_at).toLocaleDateString("fa-IR")}
                    </b>
                  </div>

                  <div>
                    <span>شماره سفارش</span>
                    <code>{order.id}</code>
                  </div>
                </div>

                <div className="admin-edit-grid">
                  <label>
                    وضعیت تحویل
                    <select
                      value={edit.fulfillmentStatus || "pending"}
                      onChange={(e) =>
                        updateEdit(
                          order.id,
                          "fulfillmentStatus",
                          e.target.value
                        )
                      }
                    >
                      <option value="pending">در انتظار بررسی</option>
                      <option value="processing">در حال آماده‌سازی</option>
                      <option value="delivered">تحویل داده شده</option>
                    </select>
                  </label>

                  <label>
                    یادداشت داخلی ادمین
                    <textarea
                      value={edit.adminNote || ""}
                      onChange={(e) =>
                        updateEdit(order.id, "adminNote", e.target.value)
                      }
                      placeholder="این متن فقط برای ادمین است..."
                    />
                  </label>

                  <label>
                    پیام تحویل برای کاربر
                    <textarea
                      value={edit.deliveryMessage || ""}
                      onChange={(e) =>
                        updateEdit(
                          order.id,
                          "deliveryMessage",
                          e.target.value
                        )
                      }
                      placeholder="مثلاً ایمیل، پسورد، لینک ورود یا توضیحات تحویل..."
                    />
                  </label>
                </div>

                <button
                  className="admin-save-btn"
                  onClick={() => saveOrder(order)}
                  disabled={savingId === order.id}
                >
                  {savingId === order.id ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}