import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON, apiFetch } from "../lib/api";

const BUDGET_TIERS = [
  { id: "under_10k", label: "Under $10K" },
  { id: "10k_50k", label: "$10K – $50K" },
  { id: "50k_plus", label: "$50K+" },
  { id: "unsure", label: "Not sure yet" },
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
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiJSON("/pitch/public-stats").then(setStats).catch(() => {});
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (submitting) return;
    setErr(null);
    const payload = {
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      role: form.role.trim() || null,
      budget_tier: form.budget_tier || null,
      round_interest: form.round_interest.trim() || null,
      message: form.message.trim(),
    };
    if (!payload.name || !payload.company || !payload.email || payload.message.length < 20) {
      setErr("Name, company, email, and a 20+ character message are required.");
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
      id: "custom",
      name: "Enterprise",
      price: "Let's talk",
      oneLiner: "Bespoke partnership.",
      bullets: [
        "Full-season title sponsorship",
        "Custom round theme aligned to your ICP",
        "Featured across all Business of Life surfaces (Max, Maya, Miles Academy)",
        "Executive hiring pipeline + documentary integration",
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
