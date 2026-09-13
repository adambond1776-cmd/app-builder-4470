import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

const OPENING = "Let's find your road. No wrong answers here — I just want to know where you actually are right now, not where you think you should be. So: when you picture the next year, what's the first thing that comes to mind — school, a job, learning a trade, or honestly not sure yet?";

export default function RoadFinder({ user, onBack, onCommitted }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: OPENING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [roads, setRoads] = useState([]);
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    apiJSON("/workbook/overview").then((d) => setRoads(d.roads || [])).catch(() => {});
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true); setErr(null);
    try {
      const res = await apiJSON("/workbook/road-finder/chat", {
        method: "POST",
        body: JSON.stringify({ messages: next }),
      });
      setMessages((m) => [...m, { role: "assistant", content: res.message }]);
    } catch (e) { setErr(e.message); }
    setSending(false);
  };

  const commit = async (label) => {
    setCommitting(true); setErr(null);
    try {
      const res = await apiJSON("/workbook/road-finder/commit", {
        method: "POST",
        body: JSON.stringify({ track: label }),
      });
      onCommitted?.(res.current_track);
    } catch (e) { setErr(e.message); setCommitting(false); }
  };

  return (
    <div className="flex flex-col h-full" data-testid="road-finder">
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="roadfinder-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="text-base font-black" style={{ color: "hsl(210,20%,95%)" }}>Find Your Road</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>Track Declaration · with Max</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed" style={m.role === "user"
              ? { background: "hsl(213,100%,55%)", color: "white" }
              : { background: "hsl(220,35%,12%)", color: "hsl(210,20%,90%)", border: "1px solid hsl(220,30%,20%)" }}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {sending && <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>Max is thinking…</div>}
      </div>

      {err && <div className="px-4 text-xs pb-1" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

      {/* Commit chips — always available */}
      <div className="px-4 pt-2 flex-shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "hsl(220,15%,50%)" }}>Lock in your road</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {roads.map((r) => (
            <button key={r.id} onClick={() => commit(r.label)} disabled={committing} data-testid={`roadfinder-commit-${r.id}`} className="text-left px-3 py-2 rounded-xl disabled:opacity-50" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,20%)" }}>
              <span className="mr-1.5">{r.emoji}</span>
              <span className="text-xs font-bold" style={{ color: "hsl(210,20%,90%)" }}>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "hsl(220,30%,18%)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Tell Max where you're at…"
          data-testid="roadfinder-input"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
        />
        <button onClick={send} disabled={sending || !input.trim()} data-testid="roadfinder-send-btn" className="px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-40" style={{ background: "hsl(213,100%,55%)", color: "white" }}>Send</button>
      </div>
    </div>
  );
}
