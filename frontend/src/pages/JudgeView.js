import { useEffect, useState } from "react";
import { apiJSON, apiFetch } from "../lib/api";

export default function JudgeView({ token }) {
  const [judge, setJudge] = useState(null);
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [savingSlug, setSavingSlug] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiJSON(`/pitch/judge/pitches?token=${encodeURIComponent(token)}`);
        if (cancelled) return;
        setJudge({ name: data.judge_name });
        setPitches(data.pitches);
        setLoading(false);
      } catch (e) { if (!cancelled) { setErr(e.message); setLoading(false); } }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const flag = async (slug, interested, note = "") => {
    setSavingSlug(slug);
    try {
      const res = await apiFetch(`/pitch/judge/flag/${slug}?token=${encodeURIComponent(token)}`, {
        method: "POST", body: JSON.stringify({ interested, note }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Flag failed");
      setPitches((prev) => prev.map((p) => p.slug === slug ? { ...p, judge_flag: { interested, note } } : p));
    } catch (e) { setErr(e.message); }
    setSavingSlug(null);
  };

  if (loading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>Loading pitches…</div>;
  if (err && !pitches.length) return <div className="flex items-center justify-center h-full text-sm text-center px-6" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="judge-view">
      <div className="sticky top-0 z-10 px-4 py-3 border-b backdrop-blur" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(25,100%,70%)" }}>Judge view</div>
        <div className="text-base font-black" style={{ color: "hsl(210,20%,95%)" }}>Welcome, {judge?.name}</div>
        <div className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>{pitches.length} pitches · mark anyone you'd coach</div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {pitches.map((p) => {
          const isOpen = expanded === p.slug;
          const flagged = p.judge_flag;
          return (
            <div key={p.slug} data-testid={`judge-pitch-card-${p.slug}`} className="rounded-2xl overflow-hidden" style={{ background: "hsl(220,35%,11%)", border: `1px solid ${flagged?.interested ? "hsla(142,71%,45%,0.5)" : "hsl(220,30%,19%)"}` }}>
              <button onClick={() => setExpanded(isOpen ? null : p.slug)} className="w-full text-left p-4">
                <div className="flex items-center gap-3">
                  {p.picture ? <img src={p.picture} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,85%)" }}>{(p.name || "?")[0]?.toUpperCase()}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: "hsl(210,20%,92%)" }}>{p.name}</div>
                    <div className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>{p.track || "No track yet"} · 🔥 {p.upvote_count}</div>
                  </div>
                  {flagged?.interested && <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "hsla(142,71%,45%,0.15)", color: "hsl(142,60%,70%)" }}>★ Matched</span>}
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: "hsl(220,30%,19%)" }}>
                  {p.youtube_url && <a href={p.youtube_url} target="_blank" rel="noopener noreferrer" className="block text-xs mt-3" style={{ color: "hsl(213,100%,65%)" }}>🎥 Watch their video →</a>}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap mt-3" style={{ color: "hsl(210,20%,85%)" }}>{p.pitch_text}</p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => flag(p.slug, true, flagged?.note || "")} disabled={savingSlug === p.slug} data-testid={`judge-flag-yes-${p.slug}`} className="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: flagged?.interested ? "hsl(142,71%,45%)" : "hsla(142,71%,45%,0.15)", color: flagged?.interested ? "white" : "hsl(142,60%,70%)", border: "1px solid hsla(142,71%,45%,0.35)" }}>
                      {flagged?.interested ? "✓ I'd coach them" : "I'd coach them"}
                    </button>
                    <button onClick={() => flag(p.slug, false, flagged?.note || "")} disabled={savingSlug === p.slug} data-testid={`judge-flag-no-${p.slug}`} className="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: flagged && !flagged.interested ? "hsla(0,70%,55%,0.2)" : "hsl(220,30%,14%)", color: "hsl(210,15%,75%)", border: "1px solid hsl(220,30%,22%)" }}>
                      Pass
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!pitches.length && <div className="text-center text-sm py-12" style={{ color: "hsl(220,15%,50%)" }}>No pitches yet.</div>}
      </div>
    </div>
  );
}
