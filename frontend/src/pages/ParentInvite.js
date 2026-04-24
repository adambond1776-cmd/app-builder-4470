import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function ParentInvite({ onBack }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const d = await apiJSON("/family/invite/current");
      setCurrent(d.code ? d : null);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setLoading(true); setErr(null);
    try {
      const d = await apiJSON("/family/invite", { method: "POST" });
      setCurrent(d);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="parent-invite-screen">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="invite-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>Invite your kid</div>
      </div>
      <div className="px-5 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,70%)" }}>
          Give your kid this 6-digit code. They enter it on their Max Home screen. They pick what they share. You see what they pick.
        </motion.div>

        {current?.code ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-6 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.15), hsla(213,100%,60%,0.08))", border: "1px solid hsla(25,100%,55%,0.3)" }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(25,100%,70%)" }}>Share this code</div>
            <div data-testid="invite-code-display" className="text-5xl font-black tracking-[0.2em] mb-3" style={{ color: "hsl(210,20%,95%)" }}>{current.code}</div>
            <div className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>Expires in {current.hours_valid} hours</div>
            <button onClick={() => navigator.clipboard?.writeText(current.code)} data-testid="invite-copy-btn" className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "hsl(220,30%,14%)", color: "hsl(213,100%,65%)", border: "1px solid hsl(220,30%,22%)" }}>Copy code</button>
          </motion.div>
        ) : (
          <button onClick={generate} disabled={loading} data-testid="invite-generate-btn" className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(25,100%,55%), hsl(25,100%,45%))", color: "white", boxShadow: "0 0 24px hsla(25,100%,55%,0.3)" }}>
            {loading ? "Generating…" : "Generate invite code"}
          </button>
        )}

        <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ background: "hsla(142,71%,45%,0.08)", border: "1px solid hsla(142,71%,45%,0.25)", color: "hsl(142,50%,70%)" }}>
          <strong>What your kid controls:</strong> Whether you see Max's memory of them, their four-burner progress, and their activity levels. Raw chat content? Never. That stays private forever.
        </div>
        {err && <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}
      </div>
    </div>
  );
}
