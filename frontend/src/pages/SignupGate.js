import { useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function SignupGate({ user, onComplete, onBlocked }) {
  const [ageOk, setAgeOk] = useState(null);
  const [betaConsent, setBetaConsent] = useState(false);
  const [docInterest, setDocInterest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  if (ageOk === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center" data-testid="blocked-screen">
        <div className="text-5xl mb-4">🛑</div>
        <h2 className="text-2xl font-black mb-3" style={{ color: "hsl(210,20%,95%)" }}>Come back when you're 16+</h2>
        <p className="text-sm max-w-xs" style={{ color: "hsl(220,15%,60%)" }}>
          Max is built for young people 16 and older. No shade — we'll be here when you're ready.
        </p>
        <button onClick={onBlocked} className="mt-6 text-xs underline" style={{ color: "hsl(213,100%,60%)" }}>Sign out</button>
      </div>
    );
  }

  const canSubmit = ageOk === true && betaConsent && docInterest !== null;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true); setErr(null);
    try {
      await apiJSON("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          age_confirmed: true,
          beta_consent: true,
          documentary_interest: docInterest,
        }),
      });
      onComplete();
    } catch (e) {
      setErr(e.message); setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full px-6 py-8 overflow-y-auto" data-testid="signup-gate">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,65%)" }}>Almost in, {user.name?.split(" ")[0] || "Founder"}</div>
        <h2 className="text-2xl font-black mb-6" style={{ color: "hsl(210,20%,95%)" }}>Three quick things.</h2>
      </motion.div>

      {/* Age */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
        <div className="font-bold text-sm mb-2" style={{ color: "hsl(210,20%,92%)" }}>1 · Are you 16 or older?</div>
        <div className="flex gap-3">
          <button onClick={() => setAgeOk(true)} data-testid="age-yes-btn" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: ageOk === true ? "hsl(213,100%,55%)" : "hsl(220,30%,16%)", color: ageOk === true ? "white" : "hsl(210,15%,80%)", border: "1px solid hsl(220,30%,22%)" }}>Yes, 16+</button>
          <button onClick={() => setAgeOk(false)} data-testid="age-no-btn" className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,15%,80%)", border: "1px solid hsl(220,30%,22%)" }}>Under 16</button>
        </div>
      </motion.div>

      {/* Beta consent */}
      <motion.label initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-5 p-4 rounded-2xl flex items-start gap-3 cursor-pointer" style={{ background: "hsl(220,35%,11%)", border: `1px solid ${betaConsent ? "hsla(213,100%,60%,0.4)" : "hsl(220,30%,19%)"}` }}>
        <input type="checkbox" checked={betaConsent} onChange={(e) => setBetaConsent(e.target.checked)} data-testid="beta-consent-checkbox" className="mt-1" />
        <div>
          <div className="font-bold text-sm mb-1" style={{ color: "hsl(210,20%,92%)" }}>2 · Beta acknowledgment</div>
          <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
            You understand Max is in beta. Your chats help us improve Max (stored anonymously on your behalf). You can view, edit, or wipe your memory anytime. Opt out whenever.
          </div>
        </div>
      </motion.label>

      {/* Documentary interest */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
        <div className="font-bold text-sm mb-1" style={{ color: "hsl(210,20%,92%)" }}>3 · Hidden Genius Labs LLC documentary</div>
        <div className="text-xs mb-3 leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
          Hidden Genius Labs LLC is a real documentary project following young people figuring life out. Want to be open to being considered?
        </div>
        <div className="flex flex-col gap-2">
          {[
            { v: "yes", label: "Yes — I want to be considered", color: "hsl(25,100%,60%)" },
            { v: "maybe", label: "Maybe — tell me more later", color: "hsl(213,100%,60%)" },
            { v: "no", label: "No thanks — I'm just here for Max", color: "hsl(220,15%,55%)" },
          ].map((o) => (
            <button key={o.v} onClick={() => setDocInterest(o.v)} data-testid={`doc-${o.v}-btn`} className="text-left text-sm px-3 py-2.5 rounded-xl" style={{
              background: docInterest === o.v ? "hsla(213,100%,60%,0.12)" : "hsl(220,30%,15%)",
              border: `1px solid ${docInterest === o.v ? o.color : "hsl(220,30%,22%)"}`,
              color: docInterest === o.v ? o.color : "hsl(210,15%,78%)",
              fontWeight: docInterest === o.v ? 700 : 500,
            }}>{o.label}</button>
          ))}
        </div>
      </motion.div>

      {err && <div className="text-xs mb-2" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

      <button
        onClick={submit}
        disabled={!canSubmit || saving}
        data-testid="signup-gate-submit-btn"
        className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, hsl(213,100%,58%) 0%, hsl(213,100%,48%) 100%)",
          color: "white",
          boxShadow: canSubmit ? "0 0 24px hsla(213,100%,60%,0.35)" : "none",
        }}
      >
        {saving ? "Saving…" : "Let's go"}
      </button>
    </div>
  );
}
