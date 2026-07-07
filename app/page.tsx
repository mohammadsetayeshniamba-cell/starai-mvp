import Link from "next/link";
import { products } from "@/lib/products";
import Product3DCard from "@/app/components/Product3DCard";
export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link href="/" className="landing-brand">
        <img src="/starai-logo.svg" alt="StarAI" className="landing-logo-img" />
          <div>
            <strong>StarAI</strong>
            <span>AI Accounts & Chat Platform</span>
          </div>
        </Link>

        <nav className="landing-nav">
          <a href="#products">ابزارها</a>
          <Link href="/orders">سفارش‌های من</Link>
          <Link href="/chat">ورود / پنل کاربری</Link>

        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">دسترسی آسان به ابزارهای هوش مصنوعی</div>

          <h1>
            خرید اکانت‌های AI و استفاده از چت هوشمند در یک پلتفرم
          </h1>

          <p>
            در StarAI می‌توانید اکانت ابزارهای هوش مصنوعی محبوب را تهیه کنید،
            وارد پنل شوید، کیف پول داشته باشید و از مدل‌های مختلف AI استفاده کنید.
          </p>

          <div className="hero-actions">
            <Link href="/chat" className="primary-action">
              ورود به پنل چت
            </Link>

            <a href="#products" className="secondary-action">
              مشاهده ابزارها
            </a>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-inner">
            <div className="hero-orb">AI</div>
            <h3>AI Hub</h3>
            <p>ChatGPT · Claude · Gemini · Perplexity · Grok</p>
          </div>
        </div>
      </section>

      <section className="products-section" id="products">
        <div className="section-title">
          <h2>هوش مصنوعی کاربردی</h2>
          <p>روی هر ابزار کلیک کنید تا پلن‌های قابل خرید را ببینید.</p>
        </div>

        <div className="products-grid">
              {products.map((product, index) => (
        <Product3DCard
          key={product.slug}
          product={product}
          index={index}
          isPopular={["chatgpt", "claude"].includes(product.slug)}
        />
      ))}
        </div>
      </section>
      <footer className="site-footer">
  <div className="footer-content">
    <div className="footer-brand">
      <img src="/starai-logo.svg" alt="StarAI" />
      <div>
        <strong>StarAI</strong>
        <p>
          پلتفرم خرید اکانت‌های هوش مصنوعی، کیف پول، سفارش آنلاین و چت با مدل‌های مختلف AI.
        </p>
      </div>
    </div>

    <div className="footer-links">
      <div>
        <h4>StarAI</h4>
        <a href="#products">ابزارهای AI</a>
        <a href="/chat">ورود به پنل</a>
        <a href="/orders">سفارش‌های من</a>
      </div>

      <div>
        <h4>خدمات</h4>
        <a href="/products/chatgpt">خرید ChatGPT</a>
        <a href="/products/claude">خرید Claude</a>
        <a href="/products/gemini">خرید Gemini</a>
      </div>

      <div>
        <h4>شبکه‌های اجتماعی</h4>
        <a href="https://www.linkedin.com/in/mohammad-setayesh-nia/" target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href="https://t.me/" target="_blank" rel="noreferrer">
          Telegram
        </a>
        <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
          Instagram
        </a>
      </div>

      <div>
        <h4>درباره ما</h4>
        <p>
          StarAI برای ساده‌سازی دسترسی کاربران ایرانی به ابزارهای هوش مصنوعی ساخته شده است.
        </p>
      </div>
    </div>
  </div>

  <div className="footer-bottom">
    <span>© {new Date().getFullYear()} StarAI. همه حقوق محفوظ است.</span>
    <span>ساخته شده برای نسل جدید کاربران هوش مصنوعی</span>
  </div>
</footer>
    </main>
  );
}