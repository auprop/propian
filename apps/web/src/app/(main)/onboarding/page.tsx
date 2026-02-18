"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Toggle } from "@/components/ui/Toggle";
import { RatingStars } from "@/components/ui/RatingStars";
import { Badge } from "@/components/ui/Badge";
import {
  IconCheck,
  IconChart,
  IconTrendUp,
  IconDollar,
  IconTrophy,
  IconShield,
  IconGlobe,
  IconUser,
  IconBell,
} from "@propian/shared/icons";
import { useSession, useCurrentProfile, useFollow } from "@propian/shared/hooks";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatCompact } from "@propian/shared/utils";

/* ------------------------------------------------------------------ */
/*  Static data                                                       */
/* ------------------------------------------------------------------ */

const GOALS = [
  { id: "pass-challenge", label: "Pass a Prop Firm Challenge", icon: <IconTrophy size={20} /> },
  { id: "grow-account", label: "Grow a Funded Account", icon: <IconTrendUp size={20} /> },
  { id: "learn-strategy", label: "Learn New Strategies", icon: <IconChart size={20} /> },
  { id: "connect-traders", label: "Connect with Traders", icon: <IconUser size={20} /> },
  { id: "risk-management", label: "Improve Risk Management", icon: <IconShield size={20} /> },
  { id: "earn-payouts", label: "Earn Consistent Payouts", icon: <IconDollar size={20} /> },
];

const FIRMS = [
  { id: "ftmo", name: "FTMO", logo: "/firms/ftmo.png", rating: 4.6, passRate: "12%", slug: "ftmo" },
  { id: "mff", name: "MyForexFunds", logo: "/firms/mff.png", rating: 4.3, passRate: "18%", slug: "myforexfunds" },
  { id: "tf", name: "True Forex Funds", logo: "/firms/tf.png", rating: 4.4, passRate: "15%", slug: "trueforex" },
  { id: "5ers", name: "The 5%ers", logo: "/firms/5ers.png", rating: 4.5, passRate: "22%", slug: "the5ers" },
  { id: "surge", name: "SurgeTrader", logo: "/firms/surge.png", rating: 4.1, passRate: "10%", slug: "surgetrader" },
  { id: "e8", name: "E8 Funding", logo: "/firms/e8.png", rating: 4.2, passRate: "14%", slug: "e8funding" },
];

const TRADERS = [
  { id: "t1", name: "Marcus Chen", handle: "@marcusfx", avatar: null, bio: "Full-time forex scalper. 3 funded accounts.", followers: 12400, posts: 342 },
  { id: "t2", name: "Sarah Kim", handle: "@sarahswing", avatar: null, bio: "Swing trader focused on gold & indices.", followers: 8900, posts: 198 },
  { id: "t3", name: "Alex Rivera", handle: "@alexrisk", avatar: null, bio: "Risk management coach. Ex-hedge fund.", followers: 24300, posts: 521 },
  { id: "t4", name: "Jordan Patel", handle: "@jpatel_fx", avatar: null, bio: "Day trader sharing daily setups & analysis.", followers: 6700, posts: 445 },
  { id: "t5", name: "Nina Volkov", handle: "@ninavtrading", avatar: null, bio: "Institutional order flow & smart money.", followers: 15200, posts: 289 },
  { id: "t6", name: "David Okafor", handle: "@david_funded", avatar: null, bio: "Passed 5 challenges. Sharing the journey.", followers: 3800, posts: 156 },
];

const ALERTS = [
  { id: "nfp", label: "Non-Farm Payrolls (NFP)", desc: "US employment data - monthly" },
  { id: "cpi", label: "CPI / Inflation Data", desc: "Consumer Price Index releases" },
  { id: "fomc", label: "FOMC Rate Decision", desc: "Federal Reserve rate announcements" },
  { id: "gdp", label: "GDP Reports", desc: "Gross Domestic Product releases" },
  { id: "pmi", label: "PMI Manufacturing", desc: "Purchasing Managers Index" },
  { id: "ecb", label: "ECB Rate Decision", desc: "European Central Bank announcements" },
];

const STEP_LABELS = ["Experience", "Firms", "Traders", "Alerts", "Done"];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const { data: session } = useSession(supabase);
  const { data: profile } = useCurrentProfile(supabase, session?.user?.id);

  /* step state */
  const [obStep, setObStep] = useState(0);
  const [obLevel, setObLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [obGoals, setObGoals] = useState<string[]>([]);
  const [obFirms, setObFirms] = useState<string[]>([]);
  const [obTraders, setObTraders] = useState<string[]>([]);
  const [obAlerts, setObAlerts] = useState<string[]>([]);

  /* helpers */
  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const canAdvance = () => {
    if (obStep === 0) return obLevel !== null;
    return true;
  };

  const next = () => {
    if (obStep < 4) setObStep(obStep + 1);
  };
  const prev = () => {
    if (obStep > 0) setObStep(obStep - 1);
  };
  const finish = () => {
    router.push("/feed");
  };

  /* ---------------------------------------------------------------- */
  /*  Progress bar                                                     */
  /* ---------------------------------------------------------------- */

  const renderProgress = () => (
    <div className="pt-ob-progress">
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {/* Dot */}
            <div
              className={`pt-ob-step-dot ${i < obStep ? "done" : ""} ${i === obStep ? "active" : ""}`}
            >
              {i < obStep ? <IconCheck size={14} /> : i + 1}
            </div>
            {/* Line between dots */}
            {i < STEP_LABELS.length - 1 && (
              <div className={`pt-ob-step-line ${i < obStep ? "done" : ""}`} />
            )}
          </div>
        ))}
      </div>
      <div className="pt-ob-step-labels">
        {STEP_LABELS.map((label, i) => (
          <span
            key={i}
            className={`pt-ob-step-label ${i === obStep ? "active" : ""} ${i < obStep ? "done" : ""}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Step 0 - Experience & Goals                                      */
  /* ---------------------------------------------------------------- */

  const renderStep0 = () => (
    <div className="pt-ob-card">
      <div className="pt-ob-icon">
        <IconChart size={28} />
      </div>
      <h2 className="pt-ob-title">Welcome to Propian</h2>
      <p className="pt-ob-sub">Tell us about your trading experience so we can personalise your feed.</p>

      {/* Experience level */}
      <div style={{ marginTop: 24 }}>
        <label className="pt-ob-sub" style={{ fontWeight: 600, marginBottom: 12, display: "block" }}>
          Experience Level
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          {(["beginner", "intermediate", "advanced"] as const).map((level) => (
            <button
              key={level}
              className={`pt-ob-option ${obLevel === level ? "selected" : ""}`}
              onClick={() => setObLevel(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Goals grid */}
      <div style={{ marginTop: 28 }}>
        <label className="pt-ob-sub" style={{ fontWeight: 600, marginBottom: 12, display: "block" }}>
          What are your goals?
        </label>
        <div className="pt-ob-grid">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              className={`pt-ob-option ${obGoals.includes(goal.id) ? "selected" : ""}`}
              onClick={() => toggleItem(obGoals, setObGoals, goal.id)}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span style={{ opacity: 0.7 }}>{goal.icon}</span>
              {goal.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Step 1 - Firms                                                   */
  /* ---------------------------------------------------------------- */

  const renderStep1 = () => (
    <div className="pt-ob-card">
      <div className="pt-ob-icon">
        <IconGlobe size={28} />
      </div>
      <h2 className="pt-ob-title">Pick Firms You Trade With</h2>
      <p className="pt-ob-sub">Select prop firms you use or are interested in to get relevant reviews and updates.</p>

      <div className="pt-ob-grid" style={{ marginTop: 24 }}>
        {FIRMS.map((firm) => (
          <button
            key={firm.id}
            className={`pt-ob-option ${obFirms.includes(firm.id) ? "selected" : ""}`}
            onClick={() => toggleItem(obFirms, setObFirms, firm.id)}
            style={{ flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "var(--surface2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {firm.name.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{firm.name}</div>
                <RatingStars rating={firm.rating} size={12} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Badge variant="lime">{firm.rating} / 5</Badge>
              <Badge>{firm.passRate} pass rate</Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Step 2 - Traders                                                 */
  /* ---------------------------------------------------------------- */

  const renderStep2 = () => (
    <div className="pt-ob-card">
      <div className="pt-ob-icon">
        <IconUser size={28} />
      </div>
      <h2 className="pt-ob-title">Follow Top Traders</h2>
      <p className="pt-ob-sub">Follow traders to fill your feed with quality insights and setups.</p>

      <div className="pt-ob-grid" style={{ marginTop: 24 }}>
        {TRADERS.map((trader) => (
          <button
            key={trader.id}
            className={`pt-ob-option ${obTraders.includes(trader.id) ? "selected" : ""}`}
            onClick={() => toggleItem(obTraders, setObTraders, trader.id)}
            style={{ flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
              <Avatar src={trader.avatar} name={trader.name} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{trader.name}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{trader.handle}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.4 }}>
              {trader.bio}
            </p>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              <span><strong style={{ color: "var(--text)" }}>{formatCompact(trader.followers)}</strong> followers</span>
              <span><strong style={{ color: "var(--text)" }}>{formatCompact(trader.posts)}</strong> posts</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Step 3 - Alerts                                                  */
  /* ---------------------------------------------------------------- */

  const renderStep3 = () => (
    <div className="pt-ob-card">
      <div className="pt-ob-icon">
        <IconBell size={28} />
      </div>
      <h2 className="pt-ob-title">Set Up Economic Alerts</h2>
      <p className="pt-ob-sub">Get notified before high-impact events so you can manage risk.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        {ALERTS.map((alert) => (
          <div
            key={alert.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderRadius: 10,
              background: obAlerts.includes(alert.id) ? "var(--surface2)" : "var(--surface1)",
              border: "1px solid var(--border)",
              transition: "background 0.15s",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{alert.label}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{alert.desc}</div>
            </div>
            <Toggle
              checked={obAlerts.includes(alert.id)}
              onChange={() => toggleItem(obAlerts, setObAlerts, alert.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Step 4 - Complete                                                */
  /* ---------------------------------------------------------------- */

  const renderStep4 = () => (
    <div className="pt-ob-complete">
      <div className="pt-ob-confetti" />
      <h2 className="pt-ob-complete-title">You're All Set!</h2>
      <p className="pt-ob-complete-sub">
        Your Propian experience is personalised and ready to go.
      </p>

      {/* Summary */}
      <div className="pt-ob-summary">
        <div className="pt-ob-summary-item">
          <span className="pt-ob-summary-val">{obLevel ?? "---"}</span>
          <span className="pt-ob-summary-label">Experience</span>
        </div>
        <div className="pt-ob-summary-item">
          <span className="pt-ob-summary-val">{obGoals.length}</span>
          <span className="pt-ob-summary-label">Goals</span>
        </div>
        <div className="pt-ob-summary-item">
          <span className="pt-ob-summary-val">{obFirms.length}</span>
          <span className="pt-ob-summary-label">Firms</span>
        </div>
        <div className="pt-ob-summary-item">
          <span className="pt-ob-summary-val">{obTraders.length}</span>
          <span className="pt-ob-summary-label">Traders</span>
        </div>
        <div className="pt-ob-summary-item">
          <span className="pt-ob-summary-val">{obAlerts.length}</span>
          <span className="pt-ob-summary-label">Alerts</span>
        </div>
      </div>

      {/* Recommended next steps */}
      <div style={{ marginTop: 32, textAlign: "left" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recommended Next Steps</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--surface1)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onClick={() => router.push("/feed")}
          >
            <IconChart size={20} style={{ color: "var(--lime)", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Explore Your Feed</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>See posts from traders you follow</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--surface1)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onClick={() => router.push("/firms")}
          >
            <IconGlobe size={20} style={{ color: "var(--lime)", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Compare Prop Firms</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Read reviews and find the best fit</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--surface1)",
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
            onClick={() => router.push("/leaderboard")}
          >
            <IconTrophy size={20} style={{ color: "var(--lime)", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>View Leaderboard</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>See top-performing funded traders</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <section className="pt-section">
      <div className="pt-ob-wrap">
        {renderProgress()}

        {steps[obStep]()}

        {/* Footer navigation */}
        <div className="pt-ob-footer">
          {obStep > 0 && obStep < 4 && (
            <Button variant="ghost" onClick={prev}>
              Back
            </Button>
          )}

          {obStep < 4 && (
            <button className="pt-ob-skip" onClick={next}>
              Skip
            </button>
          )}

          {obStep < 3 && (
            <Button variant="primary" onClick={next} disabled={!canAdvance()}>
              Continue
            </Button>
          )}

          {obStep === 3 && (
            <Button variant="primary" onClick={next}>
              Finish Setup
            </Button>
          )}

          {obStep === 4 && (
            <Button variant="lime" onClick={finish}>
              Go to Feed
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
