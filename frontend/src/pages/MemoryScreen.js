import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function MemoryScreen({ onBack, onSaved }) {
  const [card, setCard] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiJSON("/memory").then((d) => setCard(d.memory_card || "")).catch((e) => setErr(e.message));
  }, []);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      await apiJSON("/memory", { method: "PUT", body: JSON.stringify({ memory_card: card }) });
      setEditing(false);
      onSaved?.(card);
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const reset = async () => {
    if (!window.confirm("Wipe everything Max remembers about you? This cannot be undone.")) return;
    setSaving(true); setErr(null);
    try {
      await apiJSON("/memory", { method: "DELETE" });
      setCard("");
      onSaved?.("");
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="memory-screen">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)", backdropFilter: "blur(8px)" }}>
        <button onClick={onBack} data-testid="memory-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="text-base font-black" style={{ color: "hsl(210,20%,95%)" }}>Max's Memory of You</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>Auto-updated every 6 exchanges</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
          <div className="text-xs mb-3 leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
            This is the context Max loads before every conversation. You own it — view it, edit it, or wipe it anytime.
          </div>
          {editing ? (
            <textarea
              value={card}
              onChange={(e) => setCard(e.target.value)}
              data-testid="memory-textarea"
              rows={10}
              className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none"
              style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
            />
          ) : card ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(210,20%,88%)" }}>{card}</p>
          ) : (
            <p className="text-sm italic" style={{ color: "hsl(220,15%,55%)" }}>Nothing yet. Start chatting with Max and a memory note will build itself here.</p>
          )}
        </motion.div>

        {err && <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={save} disabled={saving} data-testid="memory-save-btn" className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,45%))", color: "white" }}>{saving ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditing(false)} className="px-4 py-3 rounded-xl text-sm" style={{ background: "hsl(220,30%,14%)", color: "hsl(210,15%,80%)", border: "1px solid hsl(220,30%,22%)" }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} data-testid="memory-edit-btn" className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: "hsl(220,30%,14%)", color: "hsl(213,100%,65%)", border: "1px solid hsla(213,100%,60%,0.3)" }}>Edit memory</button>
              <button onClick={reset} disabled={!card || saving} data-testid="memory-reset-btn" className="px-4 py-3 rounded-xl text-sm disabled:opacity-40" style={{ background: "hsl(220,30%,14%)", color: "hsl(0,70%,60%)", border: "1px solid hsla(0,70%,50%,0.3)" }}>Reset</button>
            </>
          )}
        </div>

        <div className="text-[11px] leading-relaxed p-3 rounded-lg" style={{ background: "hsla(142,71%,45%,0.06)", border: "1px solid hsla(142,71%,45%,0.2)", color: "hsl(142,50%,70%)" }}>
          <strong>Your data, your rules.</strong> Max's memory is stored in your account only. We never share or sell this. Resetting it is permanent.
        </div>
      </div>
    </div>
  );
}
