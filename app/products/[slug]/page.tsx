"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getProductBySlug, formatToman } from "@/lib/products";
import { supabaseBrowser } from "@/lib/supabaseClient";

type AccountType =
  | "customer_email"
  | "stariai_account"
  | "shared_account";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();

  const slug = String(params.slug || "");

  const product = useMemo(() => getProductBySlug(slug), [slug]);

  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [accountType, setAccountType] =
    useState<AccountType>("customer_email");

  const [message, setMessage] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user || null);

      if (data.session?.access_token) {
        loadWallet(data.session.access_token);
        checkAdmin(data.session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.access_token) {
        loadWallet(newSession.access_token);
      } else {
        setWalletBalance(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (product?.plans?.length && !selectedPlanId) {
      setSelectedPlanId(product.plans[0].id);
    }
  }, [product, selectedPlanId]);
  const checkAdmin = async (token: string) => {
    const response = await fetch("/api/admin/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    const data = await response.json();
  
    setIsAdmin(Boolean(data.isAdmin));
  };
  const loadWallet = async (token: string) => {
    const response = await fetch("/api/wallet", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Wallet load error:", data);
      return;
    }

    setWalletBalance(data.wallet?.balance ?? 0);
  };

  if (!product) {
    return (
      <main className="product-page">
        <div className="not-found-card">
          <h1>محصول پیدا نشد</h1>
          <Link href="/">بازگشت به صفحه اصلی</Link>
        </div>
      </main>
    );
  }

  const selectedPlan = product.plans.find((plan) => plan.id === selectedPlanId);

  const finalPrice = selectedPlan
    ? accountType === "shared_account"
      ? Math.ceil(selectedPlan.price / 4)
      : selectedPlan.price
    : 0;

  const accountTypeLabel =
    accountType === "customer_email"
      ? "خرید با ایمیل مشتری"
      : accountType === "stariai_account"
      ? "اکانت آماده StarAI"
      : "اکانت اشتراکی";

  const hasEnoughBalance =
    walletBalance !== null && walletBalance >= finalPrice;

  const handleBuy = async () => {
    setMessage("");

    if (!session?.access_token || !user) {
      router.push("/chat");
      return;
    }

    if (!selectedPlan) {
      setMessage("لطفاً یک پلن انتخاب کنید.");
      return;
    }

    setBuyLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productSlug: product.slug,
          planId: selectedPlan.id,
          accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402 || data.error === "INSUFFICIENT_BALANCE") {
          setMessage("موجودی کیف پول کافی نیست. ابتدا کیف پول را شارژ کنید.");
          return;
        }

        console.error("Create order error:", data);
        setMessage("ثبت سفارش با خطا مواجه شد.");
        return;
      }

      setWalletBalance(data.newBalance);

      setMessage(
        `سفارش با موفقیت ثبت شد. شماره سفارش: ${data.orderId}`
      );
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <main className="product-page">
      <header className="product-topbar">
        <Link href="/" className="back-link">
          ← بازگشت به ابزارها
        </Link>
        <Link href="/orders" className="panel-link">
        سفارش‌های من
        </Link>
        {isAdmin && (
        <Link href="/admin" className="panel-link">
          پنل ادمین
        </Link>
      )}
        <Link href="/panel" className="panel-link">
          پنل کاربری
        </Link>

      </header>

      <section className="product-layout">
        <div className="product-plans-panel">
          <div className="product-title-block">
            <h1>خرید اکانت {product.name}</h1>
            <p>{product.subtitle}</p>
          </div>

          {user && (
            <div className="wallet-product-card">
              <span>موجودی کیف پول</span>
              <b>{formatToman(walletBalance ?? 0)}</b>
            </div>
          )}

          <div className="plans-list">
            {product.plans.map((plan) => (
              <button
                key={plan.id}
                className={
                  selectedPlanId === plan.id
                    ? "plan-option active"
                    : "plan-option"
                }
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setMessage("");
                }}
              >
                <div>
                  <strong>{plan.name}</strong>
                  <span>{plan.duration}</span>
                </div>

                <b>{formatToman(plan.price)}</b>
              </button>
            ))}
          </div>

          <div className="account-type-section">
            <div className="account-type-header">
              <h3>نوع اکانت</h3>
              <p>روش تحویل اکانت را انتخاب کنید.</p>
            </div>

            <div className="account-type-grid">
              <button
                className={
                  accountType === "customer_email"
                    ? "account-type-card active"
                    : "account-type-card"
                }
                onClick={() => {
                  setAccountType("customer_email");
                  setMessage("");
                }}
              >
                <strong>اکانت با ایمیل شما</strong>
                <span>
                  شما ایمیل خودتان را می‌دهید و سرویس روی همان ایمیل فعال می‌شود.
                </span>
              </button>

              <button
                className={
                  accountType === "stariai_account"
                    ? "account-type-card active"
                    : "account-type-card"
                }
                onClick={() => {
                  setAccountType("stariai_account");
                  setMessage("");
                }}
              >
                <strong>اکانت آماده StarAI</strong>
                <span>
                  ما با ایمیل خودمان اکانت را می‌سازیم و اطلاعات ورود را تحویل می‌دهیم.
                </span>
              </button>

              <button
                className={
                  accountType === "shared_account"
                    ? "account-type-card active shared"
                    : "account-type-card shared"
                }
                onClick={() => {
                  setAccountType("shared_account");
                  setMessage("");
                }}
              >
                <strong>اکانت اشتراکی</strong>
                <span>
                  اکانت توسط StarAI ساخته می‌شود و بین ۴ کاربر مشترک است. قیمت یک‌چهارم می‌شود.
                </span>
              </button>
            </div>
          </div>

          {selectedPlan && (
            <div className="purchase-summary">
              <h3>خلاصه سفارش</h3>

              <div>
                <span>محصول</span>
                <b>{product.name}</b>
              </div>

              <div>
                <span>پلن</span>
                <b>{selectedPlan.name}</b>
              </div>

              <div>
                <span>نوع اکانت</span>
                <b>{accountTypeLabel}</b>
              </div>

              {accountType === "shared_account" && (
                <div>
                  <span>تخفیف اشتراکی</span>
                  <b>قیمت یک‌چهارم</b>
                </div>
              )}

              <div>
                <span>مبلغ نهایی</span>
                <b>{formatToman(finalPrice)}</b>
              </div>

              {user && (
                <div>
                  <span>موجودی بعد از خرید</span>
                  <b>
                    {hasEnoughBalance
                      ? formatToman((walletBalance ?? 0) - finalPrice)
                      : "ناموجود"}
                  </b>
                </div>
              )}

              {!user && (
                <p className="login-warning">
                  برای خرید باید وارد حساب کاربری شوید.
                </p>
              )}

              {user && !hasEnoughBalance && (
                <p className="login-warning">
                  موجودی کیف پول کافی نیست. ابتدا کیف پول را شارژ کنید.
                </p>
              )}

              {message && <p className="purchase-message">{message}</p>}

              <button
                className="buy-button"
                onClick={handleBuy}
                disabled={buyLoading}
              >
                {!user
                  ? "ورود برای خرید"
                  : buyLoading
                  ? "در حال ثبت سفارش..."
                  : "خرید از کیف پول"}
              </button>
            </div>
          )}
        </div>

        <div className={`product-hero-panel ${product.theme}`}>
          <div className="product-hero-logo">{product.logoText}</div>
          <h2>{product.name}</h2>
          <p>{product.brand}</p>
        </div>
      </section>
    </main>
  );
}