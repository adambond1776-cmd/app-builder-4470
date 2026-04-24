import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function FoundingApply({ onBack, onSubmitted }) {
  const [status, setStatus] = useState(null);
  const [goal, setGoal] = useState("");
  const [whyMe, setWhyMe] = useState("");
  const [pay, setPay] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiJSON("/founding20/status").then(setStatus).catch(() => {});
  }, []);

  const canSubmit = goal.trim().length > 20 && whyMe.trim().length > 20 && pay;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setErr(null);
    try {
      await apiJSON("/founding20/apply", { method: "POST", body: JSON.stringify({ goal, why_me: whyMe, payment_preference: pay }) });
      onSubmitted?.();
    } catch (e) { setErr(e.message); setSubmitting(false); }
  };

  if (status?.applied) {
    return (
      <div className="flex flex-col min-h-full" data-testid="founding-applied-state">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
          <button onClick={onBack} data-testid="founding-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>Founding 20 · Applied</div>
        </div>
        <div className="px-6 py-10 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-black mb-3" style={{ color: "hsl(210,20%,95%)" }}>You're in the pool.</h2>
          <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220,15%,60%)" }}>
            Adam personally reviews every application. If selected, you'll hear from him directly — no bot, no form letter. Meanwhile, keep showing up with Max.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="founding-apply-screen">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="founding-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>Founding 20 · Apply</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>90-day beta cohort · Coached by Adam</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.1), hsla(213,100%,60%,0.04))", border: "1px solid hsla(25,100%,55%,0.3)" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,70%)" }}>What you're applying for</div>
          <ul className="text-sm space-y-1.5 leading-relaxed" style={{ color: "hsl(210,20%,85%)" }}>
            <li>· 1-on-1 with Adam Bond Devereau — 30 minutes every week</li>
            <li>· 90 days of direct coaching</li>
            <li>· Featured consideration for the Hidden Genius Labs LLC documentary</li>
            <li>· 3 spots given free. Remaining spots paid (pricing shared if selected).</li>
          </ul>
          <div className="text-xs italic mt-3" style={{ color: "hsl(25,100%,65%)" }}>
            This is an application. Not everyone gets in.
          </div>
        </motion.div>

        <div>
          <label className="text-sm font-bold mb-2 block" style={{ color: "hsl(210,20%,92%)" }}>1. What's the biggest thing you're trying to level up right now?</label>
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} data-testid="founding-goal-input" rows={3} placeholder="Be specific. A vague answer gets a no." className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none" style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }} />
          <div className="text-[10px] mt-1" style={{ color: "hsl(220,15%,40%)" }}>{goal.length}/500</div>
        </div>

        <div>
          <label className="text-sm font-bold mb-2 block" style={{ color: "hsl(210,20%,92%)" }}>2. Why should Adam pick you?</label>
          <textarea value={whyMe} onChange={(e) => setWhyMe(e.target.value)} data-testid="founding-whyme-input" rows={3} placeholder="What will you do with it that someone else won't?" className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none" style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }} />
          <div className="text-[10px] mt-1" style={{ color: "hsl(220,15%,40%)" }}>{whyMe.length}/500</div>
        </div>

        <div>
          <label className="text-sm font-bold mb-2 block" style={{ color: "hsl(210,20%,92%)" }}>3. Paid, free, or either?</label>
          <div className="flex flex-col gap-2">
            {[
              { v: "paid_ok", label: "Paid is fine — I want in" },
              { v: "either", label: "Either way works for me" },
              { v: "free_only", label: "Free-only — I'll need one of the 3 free spots" },
            ].map((o) => (
              <button key={o.v} onClick={() => setPay(o.v)} data-testid={`founding-pay-${o.v}-btn`} className="text-left text-sm px-3 py-2.5 rounded-xl" style={{
                background: pay === o.v ? "hsla(25,100%,55%,0.12)" : "hsl(220,30%,15%)",
                border: `1px solid ${pay === o.v ? "hsla(25,100%,55%,0.5)" : "hsl(220,30%,22%)"}`,
                color: pay === o.v ? "hsl(25,100%,70%)" : "hsl(210,15%,78%)",
                fontWeight: pay === o.v ? 700 : 500,
              }}>{o.label}</button>
            ))}
          </div>
        </div>

        {err && <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

        <button onClick={submit} disabled={!canSubmit || submitting} data-testid="founding-submit-btn" className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40" style={{ background: "linear-gradient(135deg, hsl(25,100%,55%) 0%, hsl(25,100%,45%) 100%)", color: "white", boxShadow: canSubmit ? "0 0 24px hsla(25,100%,55%,0.35)" : "none" }}>
          {submitting ? "Submitting…" : "Submit application"}
        </button>

        <div className="text-[11px] text-center" style={{ color: "hsl(220,15%,40%)" }}>
          {status ? `${status.total_applications} applications so far · ${status.spots_cap} spots` : ""}
        </div>
      </div>
    </div>
  );
}
