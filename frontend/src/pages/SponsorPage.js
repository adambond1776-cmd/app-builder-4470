import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiJSON, apiFetch } from "../lib/api";
import { startCheckout } from "../lib/stripe";
import PayPalCheckoutButton from "../components/PayPalCheckoutButton";

const BUDGET_TIERS = [
  { id: "under_10k", label: "Under $10K" },
  { id: "10k_50k", label: "$10K – $50K" },
  { id: "50k_plus", label: "$50K+" },
  { id: "lead_partner", label: "6-figure / Lead Partner" },
  { id: "unsure", label: "Not sure yet" },
];

const PARTNERSHIP_PILLARS = [
  { id: "talent_pipeline", label: "Talent pipeline", desc: "First-look at every Max Pitch finalist + raw application CSV" },
  { id: "brand_architecture", label: "Brand architecture", desc: "Title sponsor placement across rounds + co-produced reality series" },
  { id: "curriculum_arm", label: "Curriculum arm", desc: "Branded subject pathway inside Miles Academy (your ICP, your domain)" },
  { id: "impact_narrative", label: "Impact narrative", desc: "Co-branded annual impact report — meaningful for ESG/CSR reporting" },
  { id: "custom_cohort", label: "Custom cohort", desc: "Curate your own 20-kid cohort sourced from your ICP themes" },
  { id: "exec_access", label: "Executive access", desc: "Place your C-suite as Max Pitch judges — talent acquisition built-in" },
];

const DESIRED_RANGES = [
  { id: "50k_100k", label: "$50K – $100K" },
  { id: "100k_250k", label: "$100K – $250K" },
  { id: "250k_500k", label: "$250K – $500K" },
  { id: "500k_plus", label: "$500K+" },
  { id: "design_together", label: "Let's design together" },
];

function formatDeadline(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

export default function SponsorPage() {
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    role: "",
    budget_tier: "",
    round_interest: "",
    message: "",
    partnership_pillars: [],
    desired_range: "",
    hero_outcome: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState(null);
  const [showFormError, setShowFormError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // tier id while loading
  const [flags, setFlags] = useState(null);
  const [boughtTier, setBoughtTier] = useState(null);

  useEffect(() => {
    apiJSON("/pitch/public-stats").then(setStats).catch(() => {});
    apiJSON("/public-config")
      .then((f) => setFlags(f || {}))
      .catch(() => setFlags({ enable_stripe_checkout: false, enable_paypal_checkout: false }));
  }, []);

  const stripeLive = !!flags?.enable_stripe_checkout;
  const paypalLive = !!flags?.enable_paypal_checkout;

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const togglePillar = (id) => {
    const cur = form.partnership_pillars || [];
    setForm({
      ...form,
      partnership_pillars: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };

  const buyTier = async (productId, tierId) => {
    if (checkoutLoading) return;
    // Soft pre-flight: capture the prospect's email + company by routing them through the form first
    // if they haven't filled it in. This way we have a follow-up trail if checkout is abandoned.
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      setCheckoutLoading(null);
      const msg = `Quick step before checkout — fill in your name, company, and email below. We'll open the ${
        tierId === "spotlight" ? "Spotlight" : "Anchor"
      } checkout right after.`;
      setErr(msg);
      setShowFormError(true);
      const formEl = document.querySelector('[data-testid="sponsor-form"]');
      if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      // Auto-clear the prompt after 8s so the form looks clean once they engage
      setTimeout(() => setShowFormError(false), 8000);
      return;
    }
    setCheckoutLoading(tierId);
    setErr(null);
    setShowFormError(false);
    try {
      // First persist a lite inquiry so we have a paper trail even if checkout is abandoned
      let inquiryId = null;
      try {
        const inq = await apiFetch("/sponsor/inquire", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.trim(),
            company: form.company.trim(),
            email: form.email.trim(),
            role: form.role.trim() || null,
            budget_tier: tierId === "anchor" ? "50k_plus" : "10k_50k",
            round_interest: form.round_interest.trim() || null,
            message: `[${tierId.toUpperCase()} CHECKOUT INITIATED] ${form.message.trim() || "Direct tier purchase from /sponsor page."}`,
          }),
        });
        const inqData = await inq.json().catch(() => ({}));
        inquiryId = inqData?.inquiry_id || null;
      } catch {
        // non-blocking — hosted checkout can still succeed
      }
      await startCheckout(productId, {
        sponsor_email: form.email.trim(),
        sponsor_name: form.name.trim(),
        sponsor_inquiry_id: inquiryId || undefined,
      });
    } catch (e) {
      setErr(e.message || "Couldn't start checkout");
      setCheckoutLoading(null);
    }
  };

  const prepareSponsorPayPalExtras = async (tierId) => {
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      const msg = `Quick step before checkout — fill in your name, company, and email below. We'll open the ${
        tierId === "spotlight" ? "Spotlight" : "Anchor"
      } checkout right after.`;
      setErr(msg);
      setShowFormError(true);
      const formEl = document.querySelector('[data-testid="sponsor-form"]');
      if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setShowFormError(false), 8000);
      throw new Error(msg);
    }

    setErr(null);
    setShowFormError(false);
    let inquiryId = null;
    try {
      const inq = await apiFetch("/sponsor/inquire", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          role: form.role.trim() || null,
          budget_tier: tierId === "anchor" ? "50k_plus" : "10k_50k",
          round_interest: form.round_interest.trim() || null,
          message: `[${tierId.toUpperCase()} PAYPAL CHECKOUT INITIATED] ${form.message.trim() || "Direct tier purchase from /sponsor page."}`,
        }),
      });
      const inqData = await inq.json().catch(() => ({}));
      inquiryId = inqData?.inquiry_id || null;
    } catch {
      // Non-blocking: PayPal can still create the order with the prospect email/name.
    }

    return {
      sponsor_email: form.email.trim(),
      sponsor_name: form.name.trim(),
      sponsor_inquiry_id: inquiryId || undefined,
    };
  };

  const submit = async () => {
    if (submitting) return;
    setErr(null);
    const isLeadPartner = form.budget_tier === "lead_partner";
    const payload = {
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      role: form.role.trim() || null,
      budget_tier: form.budget_tier || null,
      round_interest: form.round_interest.trim() || null,
      message: form.message.trim(),
      partnership_pillars: isLeadPartner && form.partnership_pillars?.length ? form.partnership_pillars : null,
      desired_range: isLeadPartner ? form.desired_range || null : null,
      hero_outcome: isLeadPartner ? form.hero_outcome.trim() || null : null,
    };
    if (!payload.name || !payload.company || !payload.email || payload.message.length < 20) {
      setErr("Name, company, email, and a 20+ character message are required.");
      return;
    }
    if (isLeadPartner && (!payload.partnership_pillars || payload.partnership_pillars.length === 0)) {
      setErr("Pick at least one partnership pillar so we can prep a meaningful first call.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/sponsor/inquire", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.detail || "Something went wrong. Try again?");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setErr(e.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const deadline = formatDeadline(stats?.round_deadline);

  const TIERS = [
    {
      id: "spotlight",
      product_id: "sponsor_spotlight",
      name: "Spotlight",
      price: "$5,000",
      oneLiner: "Your brand on one round.",
      bullets: [
        "Round powered-by placement (home, sponsor line, every pitch page)",
        "Logo on all 20 finalist social assets",
        "Follow-up story for post-season press",
        "Co-selected 1 finalist to champion",
      ],
      accent: "hsl(213,100%,60%)",
    },
    {
      id: "anchor",
      product_id: "sponsor_anchor",
      name: "Anchor",
      price: "$15,000",
      oneLiner: "Year-long flywheel.",
      featured: true,
      bullets: [
        "Powered-by across 3 consecutive rounds",
        "Dedicated corporate mentor slot (1 exec/round you nominate)",
        "Branded microsite: sponsor.yourcompany.com/maxpitch",
        "Priority doc-footage access + reality-show source credit",
        "Raw application CSV for your own talent pipeline",
      ],
      accent: "hsl(25,100%,60%)",
    },
    {
      id: "lead_partner",
      product_id: null,  // no fixed price — strategic conversation
      name: "Lead Partner",
      price: "Build with us",
      oneLiner: "For 6-figure partners who want their name on the platform — not on a logo wall.",
      bullets: [
        "Co-produced reality series integration (you're in the credits, not in the ad break)",
        "Title sponsorship: every Max Pitch finalist + Miles Academy curriculum cohort framed as 'Presented by you'",
        "Custom cohort: design a 20-kid track around your company's ICP, your domain, your brand voice",
        "Executive judging seats — your C-suite gets first-look at every finalist for hire pipeline",
        "Annual co-branded impact report — meaningful in your CSR/ESG narrative",
      ],
      accent: "hsl(270,80%,65%)",
    },
  ];

  return (
    <div
      className="flex flex-col min-h-full overflow-y-auto"
      style={{ background: "hsl(220,40%,8%)", color: "hsl(210,20%,92%)" }}
      data-testid="sponsor-page"
    >
      {/* Hero */}
      <div
        className="px-5 pt-8 pb-10"
        style={{
          background:
            "radial-gradient(circle at 30% 0%, hsla(25,100%,55%,0.15), transparent 60%), radial-gradient(circle at 80% 30%, hsla(213,100%,60%,0.1), transparent 55%)",
          borderBottom: "1px solid hsl(220,30%,16%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-bold uppercase tracking-widest mb-3"
          style={{ color: "hsl(25,100%,70%)" }}
        >
          💼 For Corporate Sponsors
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-black leading-tight mb-4"
          style={{ color: "hsl(210,20%,97%)", fontSize: "2.4rem" }}
        >
          Back the next generation — before they're already expensive.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-base leading-relaxed mb-6"
          style={{ color: "hsl(220,15%,72%)" }}
        >
          Max Pitch matches senior executives with 16–23 year olds ready to level up. Real pitches. Real 90-day
          coaching sprints. Real stories worth telling. Sponsor a round and anchor your brand to the moment a kid's
          trajectory actually changes.
        </motion.p>

        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3"
          >
            <div
              className="p-3 rounded-xl"
              style={{ background: "hsla(220,30%,13%,0.6)", border: "1px solid hsl(220,30%,18%)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "hsl(220,15%,55%)" }}>
                Current round
              </div>
              <div className="text-sm font-black mt-0.5" style={{ color: "hsl(213,100%,72%)" }}>
                {stats.round_name}
              </div>
            </div>
            <div
              className="p-3 rounded-xl"
              style={{ background: "hsla(220,30%,13%,0.6)", border: "1px solid hsl(220,30%,18%)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "hsl(220,15%,55%)" }}>
                Pitches live
              </div>
              <div className="text-2xl font-black mt-0.5" style={{ color: "hsl(25,100%,70%)" }}>
                {stats.total_pitches}
              </div>
            </div>
            <div
              className="p-3 rounded-xl"
              style={{ background: "hsla(220,30%,13%,0.6)", border: "1px solid hsl(220,30%,18%)", backdropFilter: "blur(6px)" }}
            >
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "hsl(220,15%,55%)" }}>
                Deadline
              </div>
              <div className="text-sm font-black mt-0.5" style={{ color: "hsl(210,20%,92%)" }}>
                {deadline || "TBD"}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Why sponsor */}
      <div className="px-5 py-8">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(213,100%,65%)" }}>
          Why sponsors keep coming back
        </div>
        <div className="space-y-3 mb-8">
          {[
            {
              icon: "🎬",
              title: "Documentary-worthy moments",
              body: "Max Pitch rounds are filmed as part of The Business of Life reality series. Your brand is associated with the story of a kid's life changing — not a static logo on a sidebar.",
            },
            {
              icon: "🎯",
              title: "High-signal talent pipeline",
              body: "Every applicant surfaces a motivated young person with a clear hustle. Anchor-tier sponsors get the raw application CSV. Recruiting teams use it to backchannel candidates before their first full-time search.",
            },
            {
              icon: "📈",
              title: "Compound brand equity",
              body: "Unlike a one-off campaign, sponsoring rounds compounds. By Round 3, your company is synonymous with the series in the minds of every family in the ecosystem — kids, parents, teachers on Miles Academy, and the documentary audience.",
            },
          ].map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-4 p-4 rounded-2xl"
              style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
            >
              <div className="text-2xl flex-shrink-0">{row.icon}</div>
              <div>
                <div className="font-bold text-sm mb-1" style={{ color: "hsl(210,20%,95%)" }}>
                  {row.title}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
                  {row.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tiers */}
        <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(25,100%,70%)" }}>
          Sponsorship tiers
        </div>
        <div className="space-y-3 mb-8">
          {TIERS.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              data-testid={`sponsor-tier-${t.id}`}
              className="p-5 rounded-2xl relative"
              style={{
                background: t.featured
                  ? `linear-gradient(135deg, ${t.accent.replace(")", ",0.12)").replace("hsl", "hsla")}, hsla(220,35%,11%,1))`
                  : "hsl(220,35%,11%)",
                border: `1px solid ${t.featured ? t.accent : "hsl(220,30%,19%)"}`,
                boxShadow: t.featured ? `0 0 32px ${t.accent.replace(")", ",0.12)").replace("hsl", "hsla")}` : "none",
              }}
            >
              {t.featured && (
                <div
                  className="absolute -top-3 left-5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{ background: t.accent, color: "white" }}
                >
                  Most popular
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <div className="font-black text-xl" style={{ color: "hsl(210,20%,95%)" }}>
                  {t.name}
                </div>
                <div className="font-black text-lg" style={{ color: t.accent }}>
                  {t.price}
                </div>
              </div>
              <div className="text-sm mb-3" style={{ color: "hsl(220,15%,70%)" }}>
                {t.oneLiner}
              </div>
              <ul className="space-y-1.5">
                {t.bullets.map((b, i) => (
                  <li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: "hsl(210,15%,82%)" }}>
                    <span style={{ color: t.accent }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {t.product_id ? (
                paypalLive ? (
                  boughtTier === t.id ? (
                    <div
                      data-testid={`sponsor-tier-bought-${t.id}`}
                      className="w-full mt-4 py-3 rounded-xl text-center text-sm font-bold"
                      style={{
                        background: "hsla(142,71%,45%,0.15)",
                        color: "hsl(142,71%,75%)",
                        border: "1px solid hsla(142,71%,45%,0.4)",
                      }}
                    >
                      ✓ Sponsor checkout complete — we'll follow up by email
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <div className="text-[11px]" style={{ color: "hsl(220,15%,62%)" }}>
                        Sponsor for {t.price} with PayPal
                      </div>
                      <PayPalCheckoutButton
                        productId={t.product_id}
                        testIdSuffix={`sponsor-${t.id}`}
                        getExtras={() => prepareSponsorPayPalExtras(t.id)}
                        onApproved={() => {
                          setBoughtTier(t.id);
                          setErr(null);
                        }}
                        onError={(msg) => setErr(msg)}
                      />
                    </div>
                  )
                ) : flags === null ? (
                  <div
                    data-testid={`sponsor-tier-checkout-loading-${t.id}`}
                    className="w-full mt-4 py-3 rounded-xl text-center text-xs"
                    style={{
                      background: "hsla(220,30%,18%,0.4)",
                      color: "hsl(220,15%,60%)",
                      border: "1px dashed hsl(220,30%,28%)",
                    }}
                  >
                    Loading checkout…
                  </div>
                ) : !stripeLive ? (
                  <div
                    data-testid={`sponsor-tier-checkout-unavailable-${t.id}`}
                    className="w-full mt-4 py-3 rounded-xl text-center text-xs font-bold"
                    style={{
                      background: "hsla(220,30%,18%,0.5)",
                      color: "hsl(220,15%,70%)",
                      border: "1px dashed hsl(220,30%,28%)",
                    }}
                  >
                    Checkout is temporarily unavailable — send the form below.
                  </div>
                ) : (
                  <button
                    onClick={() => buyTier(t.product_id, t.id)}
                    disabled={checkoutLoading === t.id}
                    data-testid={`sponsor-tier-buy-${t.id}`}
                    className="w-full mt-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${t.accent}, ${t.accent.replace(",60%)", ",48%)").replace(",55%)", ",43%)")})`,
                      color: "white",
                    }}
                  >
                    {checkoutLoading === t.id ? "Opening checkout…" : `Sponsor for ${t.price} →`}
                  </button>
                )
              ) : (
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, budget_tier: "lead_partner" }));
                    const formEl = document.querySelector('[data-testid="sponsor-form"]');
                    if (formEl) formEl.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  data-testid={`sponsor-tier-buy-${t.id}`}
                  className="w-full mt-4 py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: "transparent",
                    color: t.accent,
                    border: `1.5px solid ${t.accent}`,
                  }}
                >
                  Start the conversation →
                </button>
              )}
            </motion.div>
          ))}
        </div>

        {/* Inquiry form */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, hsla(25,100%,55%,0.08), hsla(213,100%,60%,0.04))",
            border: "1px solid hsla(25,100%,55%,0.3)",
          }}
          data-testid="sponsor-form"
        >
          <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,72%)" }}>
            Let's talk
          </div>
          <div className="font-black text-lg mb-1" style={{ color: "hsl(210,20%,97%)" }}>
            Start a sponsor conversation
          </div>
          <div className="text-xs mb-5 leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
            Adam personally replies within 2 business days. Tell us a bit about your company and which round you're
            eyeing.
          </div>

          <AnimatePresence>
            {showFormError && err && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="overflow-hidden mb-4"
                data-testid="sponsor-form-validation-banner"
              >
                <div
                  className="flex items-start gap-2 p-3 rounded-xl"
                  style={{
                    background: "hsla(0,80%,55%,0.12)",
                    border: "1px solid hsla(0,80%,55%,0.4)",
                    color: "hsl(0,80%,80%)",
                  }}
                >
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <span className="text-xs leading-relaxed">{err}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
              data-testid="sponsor-form-success"
            >
              <div className="text-4xl mb-2">✅</div>
              <div className="font-black text-lg mb-1" style={{ color: "hsl(210,20%,97%)" }}>
                Thank you — message received.
              </div>
              <div className="text-xs" style={{ color: "hsl(220,15%,60%)" }}>
                Adam will follow up within 2 business days with a call link and sample placement deck.
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.name}
                  onChange={update("name")}
                  data-testid="sponsor-form-name"
                  placeholder="Your name *"
                  className="col-span-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
                />
                <input
                  value={form.company}
                  onChange={update("company")}
                  data-testid="sponsor-form-company"
                  placeholder="Company *"
                  className="col-span-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
                />
              </div>
              <input
                value={form.email}
                onChange={update("email")}
                data-testid="sponsor-form-email"
                placeholder="Work email *"
                type="email"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
              />
              <input
                value={form.role}
                onChange={update("role")}
                data-testid="sponsor-form-role"
                placeholder="Your role (e.g. Head of Brand, CMO)"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
              />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "hsl(220,15%,55%)" }}>
                  Budget tier (optional)
                </div>
                <div className="flex gap-2 flex-wrap">
                  {BUDGET_TIERS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setForm({ ...form, budget_tier: form.budget_tier === b.id ? "" : b.id })}
                      data-testid={`sponsor-form-budget-${b.id}`}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold"
                      style={{
                        background: form.budget_tier === b.id ? "hsla(25,100%,55%,0.18)" : "hsl(220,30%,14%)",
                        color: form.budget_tier === b.id ? "hsl(25,100%,72%)" : "hsl(220,15%,65%)",
                        border: `1px solid ${form.budget_tier === b.id ? "hsla(25,100%,55%,0.35)" : "hsl(220,30%,22%)"}`,
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {form.budget_tier === "lead_partner" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    data-testid="sponsor-form-lead-partner"
                    className="overflow-hidden"
                  >
                    <div
                      className="p-4 rounded-2xl mt-2 space-y-4"
                      style={{
                        background: "linear-gradient(135deg, hsla(270,80%,65%,0.08), hsla(213,100%,60%,0.04))",
                        border: "1px solid hsla(270,80%,65%,0.35)",
                      }}
                    >
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(270,80%,75%)" }}>
                          Lead Partner — strategic intake
                        </div>
                        <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,68%)" }}>
                          You're not buying ad placement. You're co-architecting a platform. Tell us which levers
                          actually matter to you.
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold mb-2" style={{ color: "hsl(210,20%,90%)" }}>
                          Which pillars do you want to anchor? (pick any)
                        </div>
                        <div className="space-y-2">
                          {PARTNERSHIP_PILLARS.map((p) => {
                            const active = (form.partnership_pillars || []).includes(p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => togglePillar(p.id)}
                                data-testid={`sponsor-pillar-${p.id}`}
                                className="w-full text-left p-3 rounded-xl transition-all"
                                style={{
                                  background: active ? "hsla(270,80%,65%,0.18)" : "hsl(220,30%,12%)",
                                  border: `1px solid ${active ? "hsla(270,80%,65%,0.45)" : "hsl(220,30%,20%)"}`,
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    className="w-4 h-4 rounded mt-0.5 flex items-center justify-center text-[10px] flex-shrink-0"
                                    style={{
                                      background: active ? "hsl(270,80%,65%)" : "hsl(220,30%,18%)",
                                      color: "white",
                                    }}
                                  >
                                    {active ? "✓" : ""}
                                  </div>
                                  <div className="min-w-0">
                                    <div
                                      className="text-xs font-bold"
                                      style={{ color: active ? "hsl(270,80%,80%)" : "hsl(210,20%,90%)" }}
                                    >
                                      {p.label}
                                    </div>
                                    <div className="text-[11px] mt-0.5" style={{ color: "hsl(220,15%,60%)" }}>
                                      {p.desc}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold mb-2" style={{ color: "hsl(210,20%,90%)" }}>
                          Working budget range (optional)
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {DESIRED_RANGES.map((r) => (
                            <button
                              key={r.id}
                              onClick={() =>
                                setForm({ ...form, desired_range: form.desired_range === r.id ? "" : r.id })
                              }
                              data-testid={`sponsor-range-${r.id}`}
                              className="text-xs px-3 py-1.5 rounded-full font-semibold"
                              style={{
                                background:
                                  form.desired_range === r.id ? "hsla(270,80%,65%,0.2)" : "hsl(220,30%,14%)",
                                color: form.desired_range === r.id ? "hsl(270,80%,80%)" : "hsl(220,15%,65%)",
                                border: `1px solid ${
                                  form.desired_range === r.id ? "hsla(270,80%,65%,0.4)" : "hsl(220,30%,22%)"
                                }`,
                              }}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold mb-1" style={{ color: "hsl(210,20%,90%)" }}>
                          What's the ONE outcome a successful partnership would give you that no other media buy
                          can?
                        </div>
                        <textarea
                          value={form.hero_outcome}
                          onChange={update("hero_outcome")}
                          data-testid="sponsor-form-hero-outcome"
                          rows={3}
                          placeholder="The honest answer is the most useful one."
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                          style={{
                            background: "hsl(220,30%,12%)",
                            border: "1px solid hsl(220,30%,22%)",
                            color: "hsl(210,20%,90%)",
                          }}
                        />
                        <div className="text-[10px] mt-1" style={{ color: "hsl(220,15%,40%)" }}>
                          {form.hero_outcome.length}/1000
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                value={form.round_interest}
                onChange={update("round_interest")}
                data-testid="sponsor-form-round"
                placeholder="Which round are you eyeing? (optional)"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
              />
              <textarea
                value={form.message}
                onChange={update("message")}
                data-testid="sponsor-form-message"
                rows={5}
                placeholder="What are you hoping to get out of this? * (min 20 chars)"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
              />
              <div className="text-[10px]" style={{ color: "hsl(220,15%,45%)" }}>
                {form.message.length}/2000 · min 20 chars
              </div>

              {err && (
                <div className="text-xs" style={{ color: "hsl(0,80%,72%)" }}>
                  {err}
                </div>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                data-testid="sponsor-form-submit"
                className="w-full py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, hsl(25,100%,55%), hsl(25,100%,45%))",
                  color: "white",
                  boxShadow: "0 0 24px hsla(25,100%,55%,0.25)",
                }}
              >
                {submitting ? "Sending…" : "Send message to Adam →"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center text-[11px] px-5 py-6 mt-6"
        style={{ color: "hsl(220,15%,45%)", borderTop: "1px solid hsl(220,30%,14%)" }}
      >
        Max Pitch · Part of Hidden Genius Labs LLC ·{" "}
        <a href="/pitches" style={{ color: "hsl(213,100%,70%)", fontWeight: 700 }}>
          See live pitches →
        </a>
      </div>
    </div>
  );
}
