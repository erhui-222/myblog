export const siteConfig = {
  name: "MyBlog",
  tagline: "记录技术与生活的地方",
  description: "一个关于技术、产品与生活的个人博客，持续写，慢慢攒。",
  since: 2026,
  icp: "",
  nav: [
    { key: "home", label: "首页", href: "/" },
    { key: "about", label: "关于我", href: "/about" },
  ],
  social: [
    { label: "GitHub", href: "https://github.com" },
    { label: "邮箱", href: "mailto:hello@example.com" },
  ],
};

export const aboutConfig = {
  avatar: "",
  name: "博主",
  title: "独立开发者 · 长期主义者",
  bio: [
    "你好，我是这个博客的主人。白天写代码，晚上写点东西。",
    "这里主要记录我在工程实践、产品思考和日常阅读中的所得。不追热点，只写自己真正想清楚了的事。",
  ],
  skills: [
    { name: "工程", items: ["TypeScript", "React", "Node.js", "PostgreSQL"] },
    { name: "方向", items: ["Web 应用", "产品设计", "内容系统"] },
    { name: "兴趣", items: ["写作", "摄影", "长跑"] },
  ],
  timeline: [
    { date: "2026", title: "开始写这个博客", description: "把散落在各处的笔记收拢到一个自己的地方。" },
    { date: "2023", title: "转向全栈开发", description: "从前端走向完整的应用开发。" },
    { date: "2019", title: "第一份工作", description: "进入互联网行业，开始写真正被人使用的代码。" },
  ],
  contacts: [
    { type: "email", label: "hello@example.com", href: "mailto:hello@example.com" },
    { type: "github", label: "github.com", href: "https://github.com" },
    { type: "rss", label: "订阅更新", href: "/sitemap.xml" },
  ],
};

export type SiteConfig = typeof siteConfig;
export type AboutConfig = typeof aboutConfig;
