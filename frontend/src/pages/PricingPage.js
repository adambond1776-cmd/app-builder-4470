import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";
import { startCheckout } from "../lib/stripe";

const TIERS = [
  {
    id: "family",
    product_id: "founding_family_lock",
    name: "Founding Family Plan",
    badge: "Best for parents",
    price: 14.5,
    cadence: "/mo",
    launchPrice: 29,
    accent: "hsl(25,100%,60%)",
    headline: "One subscription. The whole family.",
    bullets: [
      { strong: "Maya for you", rest: " — unlimited parent coaching sessions" },
      { strong: "Free Max for your kid", rest: " — full life-coaching access included" },
      { strong: "Family OS dashboard", rest: " — privacy-first kid linking + family ideas + polls" },
      { strong: "Founding rate locked 1 year", rest: " — launches at $29/mo" },
    ],
    auth_required: true,
    role_recommended: "parent",
  },
  {
    id: "miles",
    product_id: "founding_miles_lock",
    name: "Founding Miles Academy",
    badge: "Best for academic edge",
    price: 9.5,
    cadence: "/mo",
    launchPrice: 19,
    accent: "hsl(160,70%,55%)",
    headline: "Three personas. All subjects. Adam's chunking method, AI-automated.",
    bullets: [
      { strong: "Pick your coach", rest: " — Ivy (warm), Vance (motivating), or Drake (rigorous)" },
      { strong: "All 9 subjects", rest: " — math, writing, SAT/AP, college apps, and more" },
      { strong: "Run the Accelerator", rest: " — one-click chunking method on any homework" },
      { strong: "Genius Stack walkthrough", rest: " — 30-min setup of NotebookLM + Obsidian + Gemini" },
      { strong: "Founding rate locked 1 year", rest: " — launches at $19/mo" },
    ],
    auth_required: true,
    role_recommended: "any",
  },
  {
    id: "booster",
    product_id: null, // boosters are situational — show the 3 variants below
    name: "Booster Packs",
    badge: "Pay-as-you-go",
    price: 2.99,
    cadence: " each",
    launchPrice: null,
    accent: "hsl(213,100%,60%)",
    headline: "Run out of daily messages? Top up instantly.",
    bullets: [
      { strong: "+200 messages", rest: " on Max, Maya, or Miles — your pick" },
      { strong: "No subscription", rest: " — buy only when you need it" },
      { strong: "Instant unlock", rest: " — appears on your account in seconds" },
    ],
    auth_required: true,
    role_recommended: "any",
  },
];

const SPONSOR_TEASE = {
  name: "Become a Sponsor",
  blurb:
    "Powering Max Pitch rounds, custom curriculum cohorts inside Miles Academy, or a full reality-documentary integration. Spotlight $5K. Anchor $15K. Lead Partner — design with us.",
  href: "/sponsor",
};

export default function PricingPage({ onBack }) {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [busy, setBusy] = useState(null); // tier id while opening checkout
  const [err, setErr] = useState(null);
  const [flags, setFlags] = useState({ enable_stripe_checkout: true, enable_paypal_checkout: false });

  useEffect(() => {
    apiJSON("/auth/me")
      .then((u) => setUser(u))
      .catch(() => setUser(false))
      .finally(() => setAuthChecked(true));
    apiJSON("/public-config")
      .then((f) => setFlags(f || {}))
      .catch(() => {});
  }, []);

  // Show the live Stripe buy button only when Stripe is on. PayPal buttons
  // will render in their own conditional block once that integration ships.
  const stripeLive = !!flags.enable_stripe_checkout;

  const buy = async (productId, tierId) => {
    if (!user) {
      // Send them to sign in — they'll come back here
      const redirectUrl = window.location.origin + "/pricing";
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }
    if (busy) return;
    setBusy(tierId);
    setErr(null);
    try {
      await startCheckout(productId);
    } catch (e) {
      setErr(e.message || "Couldn't open checkout.");
      setBusy(null);
    }
  };

  return (
    <div
      className="flex flex-col min-h-full overflow-y-auto"
      style={{ background: "hsl(220,40%,8%)", color: "hsl(210,20%,92%)" }}
      data-testid="pricing-page"
    >
      {onBack && (
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,40%,8%,0.92)", backdropFilter: "blur(8px)" }}
        >
          <button
            onClick={onBack}
            data-testid="pricing-back-btn"
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>
            Pricing & Plans
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="px-5 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-bold uppercase tracking-widest mb-2"
          style={{ color: "hsl(213,100%,65%)" }}
        >
          🚀 Founding Beta · Locked rates for 1 year
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-black leading-tight mb-3"
          style={{ color: "hsl(210,20%,97%)", fontSize: "2.2rem" }}
        >
          Pick the plan. Lock your rate. Start running the Business of Life.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm leading-relaxed"
          style={{ color: "hsl(220,15%,68%)" }}
        >
          We're in our founding beta. Lock your rate now and it stays locked for a full year — even when public
          launch raises prices. Cancel any time before launch. No hidden fees.
        </motion.p>
      </div>

      {/* Tiers */}
      <div className="px-5 pb-6 space-y-4">
        {TIERS.map((t, i) => {
          const isHero = t.id === "family";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              data-testid={`pricing-tier-${t.id}`}
              className="p-5 rounded-3xl relative"
              style={{
                background: isHero
                  ? `linear-gradient(135deg, ${t.accent.replace(")", ",0.14)").replace("hsl", "hsla")}, hsla(220,35%,11%,1))`
                  : "hsl(220,35%,11%)",
                border: `1px solid ${isHero ? t.accent : "hsl(220,30%,19%)"}`,
                boxShadow: isHero
                  ? `0 0 40px ${t.accent.replace(")", ",0.18)").replace("hsl", "hsla")}`
                  : "none",
              }}
            >
              {isHero && (
                <div
                  className="absolute -top-3 left-5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{ background: t.accent, color: "white" }}
                >
                  ⭐ Most popular
                </div>
              )}
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: t.accent }}>
                {t.badge}
              </div>
              <div className="font-black text-2xl mb-1" style={{ color: "hsl(210,20%,97%)" }}>
                {t.name}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="font-black text-3xl" style={{ color: "hsl(210,20%,97%)" }}>
                  ${t.price}
                </div>
                <div className="text-sm" style={{ color: "hsl(220,15%,65%)" }}>
                  {t.cadence}
                </div>
                {t.launchPrice && (
                  <div className="text-xs line-through ml-1" style={{ color: "hsl(220,15%,45%)" }}>
                    ${t.launchPrice} at launch
                  </div>
                )}
              </div>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "hsl(220,15%,75%)" }}>
                {t.headline}
              </p>
              <ul className="space-y-2 mb-5">
                {t.bullets.map((b, j) => (
                  <li key={j} className="text-xs leading-relaxed flex gap-2" style={{ color: "hsl(210,15%,82%)" }}>
                    <span style={{ color: t.accent, fontWeight: 700 }}>✓</span>
                    <span>
                      <strong style={{ color: "hsl(210,20%,95%)" }}>{b.strong}</strong>
                      {b.rest}
                    </span>
                  </li>
                ))}
              </ul>
              {!stripeLive ? (
                <div
                  data-testid={`pricing-coming-soon-${t.id}`}
                  className="w-full py-3.5 rounded-2xl text-center text-sm font-bold"
                  style={{
                    background: "hsla(220,30%,18%,0.5)",
                    color: "hsl(220,15%,70%)",
                    border: "1px dashed hsl(220,30%,28%)",
                  }}
                >
                  💳 Checkout opens this week — PayPal launching
                </div>
              ) : t.product_id ? (
                <button
                  onClick={() => buy(t.product_id, t.id)}
                  disabled={busy === t.id || !authChecked}
                  data-testid={`pricing-buy-${t.id}`}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${t.accent}, ${t.accent.replace(",60%)", ",45%)").replace(",55%)", ",42%)")})`,
                    color: "white",
                  }}
                >
                  {busy === t.id
                    ? "Opening Stripe…"
                    : !user && authChecked
                    ? `Sign in & lock $${t.price}/mo →`
                    : `Lock $${t.price}/mo →`}
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "max", label: "Max", pid: "booster_max_30" },
                    { id: "maya", label: "Maya", pid: "booster_maya_30" },
                    { id: "miles", label: "Miles", pid: "booster_miles_30" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => buy(b.pid, `booster-${b.id}`)}
                      disabled={busy === `booster-${b.id}` || !authChecked}
                      data-testid={`pricing-buy-booster-${b.id}`}
                      className="py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{
                        background: "hsla(213,100%,55%,0.18)",
                        color: "hsl(213,100%,75%)",
                        border: "1px solid hsla(213,100%,55%,0.35)",
                      }}
                    >
                      {busy === `booster-${b.id}` ? "…" : `+200 ${b.label}`}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {err && (
          <div
            className="p-3 rounded-xl text-xs"
            data-testid="pricing-error"
            style={{
              background: "hsla(0,75%,55%,0.1)",
              border: "1px solid hsla(0,75%,55%,0.3)",
              color: "hsl(0,75%,80%)",
            }}
          >
            {err}
          </div>
        )}
      </div>

      {/* Sponsor tease */}
      <div className="px-5 pb-8">
        <a
          href={SPONSOR_TEASE.href}
          data-testid="pricing-sponsor-cta"
          className="block p-5 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, hsla(270,80%,65%,0.1), hsla(25,100%,60%,0.05))",
            border: "1px solid hsla(270,80%,65%,0.35)",
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(270,80%,75%)" }}>
            For Brands & Partners
          </div>
          <div className="font-black text-lg mb-1" style={{ color: "hsl(210,20%,97%)" }}>
            {SPONSOR_TEASE.name} →
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,68%)" }}>
            {SPONSOR_TEASE.blurb}
          </div>
        </a>
      </div>

      {/* FAQ-ish trust strip */}
      <div className="px-5 pb-10 text-[11px] leading-relaxed" style={{ color: "hsl(220,15%,55%)" }}>
        Secure checkout via Stripe. We never see your card. Cancel anytime before launch with a single email — no
        questions asked. Built by Hidden Genius Labs LLC. Companion to <em>The Business of Life: Student Edition</em>{" "}
        by Adam Bond Devereau.
      </div>
    </div>
  );
}
