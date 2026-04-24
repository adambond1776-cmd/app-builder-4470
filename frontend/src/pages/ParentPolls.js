import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function ParentPolls({ onBack }) {
  const [poll, setPoll] = useState(null);
  const [picks, setPicks] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiJSON("/family/polls").then((p) => {
      setPoll(p);
      setPicks(new Set(p.my_vote || []));
    }).catch(() => {});
  }, []);

  const toggle = (id) => {
    const s = new Set(picks);
    s.has(id) ? s.delete(id) : s.add(id);
    setPicks(s);
    setSaved(false);
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await apiJSON("/family/polls/vote", { method: "POST", body: JSON.stringify({ option_ids: Array.from(picks) }) });
      const p = await apiJSON("/family/polls");
      setPoll(p);
      setSaved(true);
    } catch {}
    setSaving(false);
  };

  const maxVotes = poll ? Math.max(1, ...poll.options.map(o => o.votes)) : 1;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="parent-polls-screen">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="polls-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>{poll?.title || "Roadmap vote"}</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>{poll?.subtitle}</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        {poll?.options.map((opt) => {
          const picked = picks.has(opt.id);
          const pct = (opt.votes / maxVotes) * 100;
          return (
            <motion.button key={opt.id} onClick={() => toggle(opt.id)} data-testid={`poll-option-${opt.id}`} className="w-full text-left p-4 rounded-2xl relative overflow-hidden" style={{ background: "hsl(220,35%,11%)", border: `1px solid ${picked ? "hsla(270,80%,65%,0.5)" : "hsl(220,30%,19%)"}` }}>
              <div className="absolute inset-0 origin-left" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsla(270,80%,65%,0.08), transparent)", transition: "width 0.5s" }} />
              <div className="relative flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: picked ? "hsl(270,80%,65%)" : "transparent", border: "2px solid " + (picked ? "hsl(270,80%,65%)" : "hsl(220,30%,30%)") }}>
                  {picked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: "hsl(210,20%,92%)" }}>{opt.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(220,15%,55%)" }}>{opt.votes} {opt.votes === 1 ? "vote" : "votes"}</div>
                </div>
              </div>
            </motion.button>
          );
        })}
        <button onClick={save} disabled={saving} data-testid="polls-save-btn" className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50 mt-2" style={{ background: "linear-gradient(135deg, hsl(270,80%,60%), hsl(270,80%,50%))", color: "white" }}>
          {saving ? "Saving…" : saved ? "✓ Vote saved" : "Save my vote"}
        </button>
      </div>
    </div>
  );
}
