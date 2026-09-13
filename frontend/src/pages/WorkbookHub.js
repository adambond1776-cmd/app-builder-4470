import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

const CADENCE_LABEL = {
  once: "One-time",
  weekly: "Weekly",
  quarterly: "Every 90 days",
  on_demand: "Anytime",
};

function StatusPill({ tool }) {
  const s = tool.state || {};
  if (tool.status === "coming_soon") {
    return <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "hsl(220,30%,16%)", color: "hsl(220,15%,55%)" }}>Coming soon</span>;
  }
  if (tool.status === "import") {
    return <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "hsla(160,70%,45%,0.14)", color: "hsl(160,70%,72%)" }}>From Campus Quest</span>;
  }
  if (tool.status === "ai") {
    return <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "hsla(270,80%,65%,0.16)", color: "hsl(270,80%,78%)" }}>Guided</span>;
  }
  if (s.due) {
    return <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: "hsla(25,100%,55%,0.16)", color: "hsl(25,100%,72%)" }}>Due this week</span>;
  }
  if (s.done_this_period) {
    return <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "hsla(142,71%,45%,0.16)", color: "hsl(142,60%,70%)" }}>✓ Done</span>;
  }
  return <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,80%)" }}>Open</span>;
}

export default function WorkbookHub({ user, onBack, onOpenTool, onOpenRoadFinder, onOpenGenius }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => apiJSON("/workbook/overview").then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const track = data?.current_track;
  const streak = data?.war_streak || 0;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="workbook-hub">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)", backdropFilter: "blur(8px)" }}>
        <button onClick={onBack} data-testid="workbook-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="text-base font-black" style={{ color: "hsl(210,20%,95%)" }}>My Workbook</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>The Business of Life — one page at a time</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {err && <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

        {/* Road status / Find Your Road */}
        {track ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl flex items-center justify-between" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(213,100%,65%)" }}>Your road</div>
              <div className="font-black text-lg" style={{ color: "hsl(210,20%,95%)" }}>{track}</div>
            </div>
            <div className="text-right">
              <div className="font-black text-2xl" style={{ color: "hsl(25,100%,65%)" }}>{streak}</div>
              <div className="text-[10px]" style={{ color: "hsl(220,15%,55%)" }}>week streak</div>
            </div>
          </motion.div>
        ) : (
          <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onOpenRoadFinder} data-testid="workbook-find-road-cta" className="w-full text-left p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%) 0%, hsl(270,75%,55%) 100%)", color: "white" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80">Start here</div>
            <div className="font-black text-xl mb-1">Find your road →</div>
            <div className="text-sm opacity-85">College, work, trade, or figuring it out. Max helps you choose the lane you're actually in.</div>
          </motion.button>
        )}

        {/* Pending Genius Profile from Campus Quest — offer to merge */}
        {data?.genius_pending_merge && (
          <button onClick={onOpenGenius} data-testid="workbook-merge-prompt" className="w-full text-left p-4 rounded-2xl" style={{ background: "hsla(160,70%,45%,0.1)", border: "1px solid hsla(160,70%,50%,0.35)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(160,70%,72%)" }}>Genius Mining · ready to merge</div>
            <div className="font-black text-base" style={{ color: "hsl(210,20%,95%)" }}>Your Genius Profile is waiting →</div>
            <div className="text-[11px] mt-0.5" style={{ color: "hsl(220,15%,62%)" }}>
              {data.suggested_track ? `Campus Quest suggests ${data.suggested_track}. Merge to bring it in.` : "Merge it into MaxCoach to personalize your coaching."}
            </div>
          </button>
        )}

        {/* Due this week */}
        {data?.due_this_week?.length > 0 && (
          <div className="p-4 rounded-2xl" style={{ background: "hsla(25,100%,55%,0.08)", border: "1px solid hsla(25,100%,55%,0.28)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,72%)" }}>Due this week</div>
            <div className="space-y-2">
              {data.due_this_week.map((d) => (
                <button key={d.tool_id} onClick={() => onOpenTool(d.tool_id)} data-testid={`workbook-due-${d.tool_id}`} className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
                  <span className="text-sm font-semibold" style={{ color: "hsl(210,20%,92%)" }}>{d.title}</span>
                  <span className="text-xs" style={{ color: "hsl(25,100%,68%)" }}>Fill it →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Genius profile (merged) */}
        {data?.genius_profile && data?.genius_merged && (
          <button onClick={onOpenGenius} data-testid="workbook-genius-card" className="w-full text-left p-4 rounded-2xl" style={{ background: "hsla(160,70%,45%,0.08)", border: "1px solid hsla(160,70%,50%,0.28)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(160,70%,72%)" }}>Genius Profile</div>
            <div className="font-bold text-sm leading-snug" style={{ color: "hsl(210,20%,95%)" }}>{data.genius_profile.refining_sentence || "Profile synced"}</div>
            <div className="text-[11px] mt-1" style={{ color: "hsl(220,15%,60%)" }}>Working word: {data.genius_profile.working_word}</div>
          </button>
        )}

        {/* The toolkit */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "hsl(220,15%,55%)" }}>The Toolkit · 8 tools</div>
          <div className="space-y-2">
            {(data?.tools || []).map((t, i) => {
              const clickable = t.status === "live" || t.status === "ai" || t.status === "import";
              const onClick = t.status === "ai" ? onOpenRoadFinder : (t.status === "live" ? () => onOpenTool(t.id) : (t.status === "import" ? onOpenGenius : undefined));
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  disabled={!clickable}
                  onClick={onClick}
                  data-testid={`workbook-tool-${t.id}`}
                  className="w-full text-left p-4 rounded-2xl flex items-start gap-3 disabled:opacity-70"
                  style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,18%)" }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: "hsl(220,30%,16%)", color: "hsl(213,100%,68%)" }}>{t.tool_no}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-bold text-sm" style={{ color: "hsl(210,20%,95%)" }}>{t.title}</span>
                      <StatusPill tool={t} />
                    </div>
                    <div className="text-[11px] leading-relaxed mb-1" style={{ color: "hsl(220,15%,58%)" }}>{t.subtitle}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: "hsl(220,15%,45%)" }}>{CADENCE_LABEL[t.cadence] || t.cadence}</span>
                      {t.state?.entry_count > 0 && (
                        <span className="text-[10px]" style={{ color: "hsl(142,60%,60%)" }}>· {t.state.entry_count} {t.state.entry_count === 1 ? "page" : "pages"}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Recent pages */}
        {data?.recent_entries?.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "hsl(220,15%,55%)" }}>Recent pages</div>
            <div className="space-y-1.5">
              {data.recent_entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "hsl(220,35%,10%)", border: "1px solid hsl(220,30%,16%)" }}>
                  <span className="text-xs" style={{ color: "hsl(210,20%,82%)" }}>{e.tool_title}</span>
                  <span className="text-[10px]" style={{ color: "hsl(220,15%,45%)" }}>{e.period_key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-[10px] pt-2 pb-4" style={{ color: "hsl(220,15%,38%)" }}>
          Your pages are saved to your account and kept for the long haul.
        </div>
      </div>
    </div>
  );
}
