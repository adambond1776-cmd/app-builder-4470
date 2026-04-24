import { useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function KidAcceptInvite({ onBack, onAccepted }) {
  const [code, setCode] = useState("");
  const [step, setStep] = useState("code"); // code → privacy → done
  const [shareMemory, setShareMemory] = useState(true);
  const [shareBurners, setShareBurners] = useState(true);
  const [shareActivity, setShareActivity] = useState(true);
  const [parentName, setParentName] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (code.length !== 6) { setErr("Code must be 6 digits"); return; }
    setSaving(true); setErr(null);
    try {
      const d = await apiJSON("/family/accept", { method: "POST", body: JSON.stringify({ code, shares_memory_card: shareMemory, shares_burner_scores: shareBurners, shares_activity: shareActivity }) });
      setParentName(d.parent_name);
      setStep("done");
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="kid-accept-screen">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="kid-accept-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>Link a parent</div>
      </div>

      <div className="px-5 py-6 space-y-5">
        {step === "code" && (
          <>
            <div className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,70%)" }}>
              Got a 6-digit code from your parent? Enter it here. You pick exactly what they can see — nothing more.
            </div>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} data-testid="kid-code-input" placeholder="000000" className="w-full text-center text-4xl font-black tracking-[0.3em] rounded-2xl py-6 outline-none" style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,95%)" }} />
            <button onClick={() => setStep("privacy")} disabled={code.length !== 6} data-testid="kid-code-next-btn" className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40" style={{ background: "hsl(213,100%,55%)", color: "white" }}>Next: Pick what they see</button>
            {err && <div className="text-xs text-center" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}
          </>
        )}

        {step === "privacy" && (
          <>
            <div className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,70%)" }}>
              What do you want your parent to see? Toggle each one. You can change these anytime.
            </div>
            {[
              { k: "mem", label: "Max's memory of you", desc: "Short summary Max keeps about you. No raw chats.", v: shareMemory, set: setShareMemory },
              { k: "bur", label: "Your Four Burners", desc: "How you're doing on Work/School, Relationships, Health, Self.", v: shareBurners, set: setShareBurners },
              { k: "act", label: "How often you use Max", desc: "Just a count — never what you said.", v: shareActivity, set: setShareActivity },
            ].map(opt => (
              <label key={opt.k} className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer" style={{ background: "hsl(220,35%,11%)", border: `1px solid ${opt.v ? "hsla(142,71%,45%,0.4)" : "hsl(220,30%,19%)"}` }}>
                <input type="checkbox" checked={opt.v} onChange={(e) => opt.set(e.target.checked)} data-testid={`kid-privacy-${opt.k}`} className="mt-1" />
                <div>
                  <div className="font-bold text-sm" style={{ color: "hsl(210,20%,92%)" }}>{opt.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(220,15%,60%)" }}>{opt.desc}</div>
                </div>
              </label>
            ))}
            <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "hsla(142,71%,45%,0.08)", border: "1px solid hsla(142,71%,45%,0.25)", color: "hsl(142,50%,70%)" }}>
              <strong>Raw chat content is NEVER shared.</strong> Not to your parent. Not to Adam. That stays yours.
            </div>
            <button onClick={submit} disabled={saving} data-testid="kid-accept-confirm-btn" className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(142,71%,45%), hsl(142,71%,35%))", color: "white" }}>
              {saving ? "Linking…" : "Link to parent"}
            </button>
            <button onClick={() => setStep("code")} className="w-full py-2 text-xs" style={{ color: "hsl(220,15%,55%)" }}>← Back</button>
            {err && <div className="text-xs text-center" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}
          </>
        )}

        {step === "done" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10" data-testid="kid-accept-success">
            <div className="text-5xl mb-3">✓</div>
            <h2 className="text-2xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>Linked to {parentName}</h2>
            <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220,15%,60%)" }}>They can now see what you chose to share. You can change that anytime from your profile.</p>
            <button onClick={onAccepted} data-testid="kid-accept-done-btn" className="mt-6 px-8 py-3 rounded-xl font-semibold text-sm" style={{ background: "hsl(213,100%,55%)", color: "white" }}>Back to Max</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
