import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

// Tone + palette: Miles Academy — teal/emerald identity (distinct from Max-blue & Maya-purple)
const PERSONA_ACCENT = {
  ivy: "hsl(160,70%,55%)",      // soft teal-green
  vance: "hsl(35,100%,60%)",     // amber motivation
  drake: "hsl(210,80%,62%)",     // steel blue
};

export default function MilesIntro({ cfg, onPicked, onBack }) {
  const [chosen, setChosen] = useState(null);
  const [docInterest, setDocInterest] = useState("maybe");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!chosen || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiJSON("/miles/persona", {
        method: "POST",
        body: JSON.stringify({ persona: chosen, documentary_interest: docInterest }),
      });
      onPicked?.(chosen);
    } catch (e) {
      setError(e.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto px-5 py-6" data-testid="miles-intro-screen">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          data-testid="miles-intro-back-btn"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "hsl(220,30%,16%)",
            border: "1px solid hsl(220,30%,22%)",
            color: "hsl(210,20%,85%)",
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(160,70%,65%)" }}>
          {cfg?.brand_name || "Miles Academy"} · Founding beta
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-black text-3xl leading-tight mb-3" style={{ color: "hsl(210,20%,97%)" }}>
          Go further than school took you.
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
          {cfg?.brand_name || "Miles Academy"} is the academic-edge side of the Business of Life —
          built for homeschool, tutoring, and the subjects school never taught well enough. Pick the coach whose
          voice you want and start leveling up today.
        </p>
      </motion.div>

      <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(220,15%,55%)" }}>
        Pick your coach
      </div>

      <div className="space-y-3 mb-6">
        {(cfg?.personas || []).map((p, i) => {
          const active = chosen === p.id;
          const accent = PERSONA_ACCENT[p.id] || "hsl(160,70%,55%)";
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => setChosen(p.id)}
              data-testid={`miles-persona-card-${p.id}`}
              className="text-left w-full p-4 rounded-2xl transition-all"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${accent.replace(")", ",0.18)").replace("hsl", "hsla")}, hsla(220,30%,13%,1))`
                  : "hsl(220,35%,11%)",
                border: active ? `1px solid ${accent}` : "1px solid hsl(220,30%,19%)",
                boxShadow: active ? `0 0 0 3px ${accent.replace(")", ",0.15)").replace("hsl", "hsla")}` : "none",
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent.replace(",55%)", ",42%)").replace(",60%)", ",48%)").replace(",62%)", ",50%)")})`,
                    color: "white",
                  }}
                >
                  {p.display_name[0]}
                </div>
                <div>
                  <div className="font-black text-lg" style={{ color: "hsl(210,20%,95%)" }}>
                    {p.display_name}
                  </div>
                  <div className="text-[11px]" style={{ color: accent }}>
                    {p.tagline}
                  </div>
                </div>
              </div>
              <div
                className="text-xs italic leading-relaxed p-3 rounded-xl"
                style={{ background: "hsla(220,30%,8%,0.5)", color: "hsl(210,20%,78%)" }}
              >
                "{p.sample_line}"
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Documentary opt-in */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6 p-4 rounded-2xl"
        style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
      >
        <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(340,80%,70%)" }}>
          🎬 Reality documentary (totally optional)
        </div>
        <div className="text-xs mb-3 leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
          {cfg?.brand_short || "Miles"} is being built in front of you — some of this may appear in Adam's upcoming{" "}
          <em>The Business of Life</em> reality documentary. You're not committing to anything today; this just tells us
          who's open to a conversation if we need real stories.
        </div>
        <div className="flex gap-2">
          {[
            { id: "yes", label: "I'm in" },
            { id: "maybe", label: "Maybe, ask me" },
            { id: "no", label: "Count me out" },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setDocInterest(o.id)}
              data-testid={`miles-doc-${o.id}`}
              className="flex-1 text-xs px-3 py-2 rounded-lg font-semibold transition-all"
              style={{
                background: docInterest === o.id ? "hsla(340,80%,55%,0.2)" : "hsl(220,30%,14%)",
                color: docInterest === o.id ? "hsl(340,80%,75%)" : "hsl(220,15%,60%)",
                border: `1px solid ${docInterest === o.id ? "hsla(340,80%,55%,0.4)" : "hsl(220,30%,22%)"}`,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Founding framing */}
      <div className="text-[11px] leading-relaxed mb-5" style={{ color: "hsl(220,15%,50%)" }}>
        You're one of the first <strong>{cfg?.founding_cap || 50}</strong> families. What you tell us becomes what
        we build next — curriculum planners, standards alignment, live tutor sessions, college-app studios. Founding{" "}
        {cfg?.brand_short || "Miles"} locks in <strong>${cfg?.founding_price || 9.5}/mo for a year</strong> before we
        launch at <strong>${cfg?.launch_price || 19}/mo</strong>.
      </div>

      {error && (
        <div className="text-xs mb-3" style={{ color: "hsl(0,80%,70%)" }}>
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!chosen || submitting}
        data-testid="miles-intro-continue-btn"
        className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40"
        style={{
          background: chosen
            ? `linear-gradient(135deg, ${PERSONA_ACCENT[chosen] || "hsl(160,70%,55%)"}, hsl(220,40%,22%))`
            : "hsl(220,30%,16%)",
          color: "white",
          border: "1px solid hsl(220,30%,22%)",
        }}
      >
        {submitting ? "Setting up..." : chosen ? `Continue with ${chosen.charAt(0).toUpperCase() + chosen.slice(1)} →` : "Pick a coach to continue"}
      </button>
    </div>
  );
}
