import Link from "next/link";
import { products } from "@/lib/products";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link href="/" className="landing-brand">
          <div className="landing-logo">★</div>
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
          {products.map((product) => (
            <Link
              href={`/products/${product.slug}`}
              className="ai-product-card"
              key={product.slug}
            >
              <div className={`product-visual ${product.theme}`}>
                <span>{product.logoText}</span>
              </div>

              <div className="product-info">
                <h3>{product.name}</h3>
                <p>{product.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}