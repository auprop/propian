"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Inline SVG Icons ─── */

const IcTrend = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
    <polyline points="16,7 22,7 22,13" />
  </svg>
);

const IcClock = ({ s = 11 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);

const IcExternalLink = ({ s = 11 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

/* ─── Placeholder Data ─── */

const NEWS_ITEMS = [
  {
    id: 1,
    title: "Fed holds rates steady, signals potential cut in June",
    source: "Reuters",
    time: "2h ago",
    tag: "Macro",
  },
  {
    id: 2,
    title: "EUR/USD breaks above 1.0900 resistance on weak dollar",
    source: "ForexLive",
    time: "3h ago",
    tag: "Forex",
  },
  {
    id: 3,
    title: "Gold hits new all-time high amid geopolitical tensions",
    source: "Bloomberg",
    time: "5h ago",
    tag: "Commodities",
  },
];

/* ─── Component ─── */

export function ChatRightSidebar() {
  return (
    <div className="pc-sidebar-default">
      {/* Latest News */}
      <div className="pc-sidebar-news">
        <div className="pc-sidebar-section-head">
          <IcTrend s={14} />
          <span>Latest News</span>
        </div>
        <div className="pc-sidebar-news-list">
          {NEWS_ITEMS.map((item) => (
            <div key={item.id} className="pc-news-item">
              <div className="pc-news-tag">{item.tag}</div>
              <div className="pc-news-title">{item.title}</div>
              <div className="pc-news-meta">
                <span className="pc-news-source">{item.source}</span>
                <span className="pc-news-dot">·</span>
                <IcClock s={10} />
                <span>{item.time}</span>
              </div>
            </div>
          ))}
          <a href="/news" className="pc-sidebar-viewall">
            View all news <IcExternalLink s={11} />
          </a>
        </div>
      </div>

      {/* Promotional Ads — Propian Carousel */}
      <div className="pc-sidebar-ads">
        <div className="pc-sidebar-section-head">
          <span>Sponsored</span>
        </div>
        <PropianAdCarousel />
      </div>
    </div>
  );
}

/* ─── Propian Promotional Carousel ─── */

const IcUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IcBookOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const IcChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
    <polyline points="16,7 22,7 22,13" />
  </svg>
);

const SLIDES = [
  {
    id: 1,
    icon: <IcUsers />,
    label: "COMMUNITY",
    headline: "Trade Together",
    body: "Join prop trading communities. Share setups, discuss markets, grow together.",
    cta: "Join Propian",
  },
  {
    id: 2,
    icon: <IcBookOpen />,
    label: "KNOWLEDGE",
    headline: "Pin What Matters",
    body: "Build a searchable library of setups, signals & insights for your team.",
    cta: "Start Pinning",
  },
  {
    id: 3,
    icon: <IcChart />,
    label: "ANALYTICS",
    headline: "Sharpen Your Edge",
    body: "Track performance, follow top traders, and level up with real data.",
    cta: "Get Started Free",
  },
];

function PropianAdCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const slide = SLIDES[active];

  return (
    <div
      className="pc-ad-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pc-ad-slide" key={slide.id}>
        {/* Label */}
        <div className="pc-ad-label">{slide.label}</div>

        {/* Icon + headline row */}
        <div className="pc-ad-head">
          <div className="pc-ad-icon">{slide.icon}</div>
          <div className="pc-ad-headline">{slide.headline}</div>
        </div>

        {/* Body text */}
        <div className="pc-ad-body">{slide.body}</div>

        {/* CTA */}
        <button className="pc-ad-cta" type="button">
          {slide.cta}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* Dots */}
      <div className="pc-ad-nav">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            className={`pc-ad-dot ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
            type="button"
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
