export const products = [
    {
      slug: "chatgpt",
      name: "ChatGPT",
      brand: "OpenAI",
      logoText: "ChatGPT",
      subtitle: "دسترسی به نسخه‌های Plus، Pro و API",
      theme: "theme-chatgpt",
      plans: [
        {
          id: "chatgpt-free",
          name: "ChatGPT بدون طرح فعال",
          duration: "اکانت آماده",
          price: 471900,
          description: "اکانت پایه برای شروع استفاده",
        },
        {
          id: "chatgpt-plus",
          name: "ChatGPT Plus",
          duration: "یک ماهه",
          price: 4123300,
          description: "مناسب استفاده روزانه و حرفه‌ای",
        },
        {
          id: "chatgpt-pro",
          name: "ChatGPT Pro",
          duration: "یک ماهه",
          price: 38835000,
          description: "برای کاربران سنگین و حرفه‌ای",
        },
        {
          id: "openai-api",
          name: "API OpenAI",
          duration: "اعتباری",
          price: 1299500,
          description: "مناسب توسعه‌دهندگان و کسب‌وکارها",
        },
      ],
    },
    {
      slug: "claude",
      name: "Claude",
      brand: "Anthropic",
      logoText: "Claude",
      subtitle: "اکانت Claude برای نوشتار، تحلیل و تحقیق",
      theme: "theme-claude",
      plans: [
        {
          id: "claude-pro",
          name: "Claude Pro",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب تحلیل متن و کارهای پژوهشی",
        },
      ],
    },
    {
      slug: "gemini",
      name: "Google AI Pro",
      brand: "Google",
      logoText: "Gemini",
      subtitle: "دسترسی به Gemini و ابزارهای Google AI",
      theme: "theme-gemini",
      plans: [
        {
          id: "gemini-pro",
          name: "Google AI Pro",
          duration: "یک ماهه",
          price: 6736900,
          description: "مناسب کاربران اکوسیستم گوگل",
        },
      ],
    },
    {
      slug: "perplexity",
      name: "Perplexity",
      brand: "Perplexity AI",
      logoText: "perplexity",
      subtitle: "مناسب سرچ، تحقیق و پاسخ با منبع",
      theme: "theme-perplexity",
      plans: [
        {
          id: "perplexity-pro",
          name: "Perplexity Pro",
          duration: "یک ماهه",
          price: 300000,
          description: "برای تحقیق و جستجوی پیشرفته",
        },
      ],
    },
    {
      slug: "grok",
      name: "Grok AI",
      brand: "xAI",
      logoText: "Grok",
      subtitle: "اکانت Grok برای دسترسی به مدل‌های xAI",
      theme: "theme-grok",
      plans: [
        {
          id: "grok-pro",
          name: "Grok Pro",
          duration: "یک ماهه",
          price: 315600,
          description: "مناسب استفاده عمومی و تحلیلی",
        },
      ],
    },
    {
      slug: "copilot",
      name: "Microsoft Copilot",
      brand: "Microsoft",
      logoText: "Copilot",
      subtitle: "اکانت Copilot برای بهره‌وری و آفیس",
      theme: "theme-copilot",
      plans: [
        {
          id: "copilot-pro",
          name: "Copilot Pro",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب استفاده کاری و آفیس",
        },
      ],
    },
    {
      slug: "deepseek",
      name: "Deepseek",
      brand: "DeepSeek",
      logoText: "deepseek",
      subtitle: "مدل‌های reasoning و کدنویسی",
      theme: "theme-deepseek",
      plans: [
        {
          id: "deepseek-pro",
          name: "Deepseek",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب کدنویسی و تحلیل",
        },
      ],
    },
    {
      slug: "qwen",
      name: "Qwen AI",
      brand: "Alibaba Cloud",
      logoText: "QWEN",
      subtitle: "مدل‌های Qwen برای متن و کدنویسی",
      theme: "theme-qwen",
      plans: [
        {
          id: "qwen-pro",
          name: "Qwen AI",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب استفاده عمومی",
        },
      ],
    },
    {
      slug: "poe",
      name: "POE",
      brand: "Quora",
      logoText: "Poe",
      subtitle: "دسترسی به چندین مدل هوش مصنوعی",
      theme: "theme-poe",
      plans: [
        {
          id: "poe-pro",
          name: "POE",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب دسترسی چندمدلی",
        },
      ],
    },
    {
      slug: "you",
      name: "You.com",
      brand: "You.com",
      logoText: "you.com",
      subtitle: "جستجو و پاسخ هوشمند",
      theme: "theme-you",
      plans: [
        {
          id: "you-pro",
          name: "You.com",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب سرچ و تحقیق",
        },
      ],
    },
    {
      slug: "monica",
      name: "Monica",
      brand: "Monica AI",
      logoText: "Monica",
      subtitle: "دستیار AI برای مرورگر و تولید محتوا",
      theme: "theme-monica",
      plans: [
        {
          id: "monica-pro",
          name: "Monica",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب تولید محتوا و کار روزانه",
        },
      ],
    },
    {
      slug: "genspark",
      name: "Genspark",
      brand: "Genspark",
      logoText: "Genspark",
      subtitle: "جستجو و تحقیق با AI",
      theme: "theme-genspark",
      plans: [
        {
          id: "genspark-pro",
          name: "Genspark",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب تحقیق و جستجو",
        },
      ],
    },
    {
      slug: "manus",
      name: "Manus",
      brand: "Manus AI",
      logoText: "manus",
      subtitle: "عامل هوشمند برای انجام کارها",
      theme: "theme-manus",
      plans: [
        {
          id: "manus-pro",
          name: "Manus",
          duration: "یک ماهه",
          price: 300000,
          description: "مناسب کارهای agentic",
        },
      ],
    },
    {
      slug: "jasper",
      name: "Jasper",
      brand: "Jasper AI",
      logoText: "jasper",
      subtitle: "تولید محتوای مارکتینگ و تبلیغات",
      theme: "theme-jasper",
      plans: [
        {
          id: "jasper-pro",
          name: "Jasper",
          duration: "یک ماهه",
          price: 18169700,
          description: "مناسب تیم‌های محتوا",
        },
      ],
    },
    {
      slug: "notebooklm",
      name: "NotebookLM",
      brand: "Google",
      logoText: "NotebookLM",
      subtitle: "تحلیل اسناد، یادداشت و منابع",
      theme: "theme-notebooklm",
      plans: [
        {
          id: "notebooklm-pro",
          name: "NotebookLM",
          duration: "یک ماهه",
          price: 5337900,
          description: "مناسب تحلیل اسناد",
        },
      ],
    },
  ];
  
  export function getProductBySlug(slug) {
    return products.find((product) => product.slug === slug);
  }
  
  export function formatToman(value) {
    return new Intl.NumberFormat("fa-IR").format(value) + " تومان";
  }