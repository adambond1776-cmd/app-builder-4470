import { useEffect, useState } from "react";
import { apiJSON } from "../lib/api";

export default function MilesPolls({ onBack }) {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => apiJSON("/miles/polls").then(setData).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const toggle = async (optId) => {
    if (!data || saving) return;
    const current = new Set(data.my_vote || []);
    if (current.has(optId)) current.delete(optId);
    else current.add(optId);
    const picks = Array.from(current);
    setSaving(true);
    try {
      await apiJSON("/miles/polls/vote", { method: "POST", body: JSON.stringify({ option_ids: picks }) });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!data)
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>
        Loading…
      </div>
    );

  const totalVotes = data.options.reduce((s, o) => s + o.votes, 0) || 1;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="miles-polls-screen">
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}
      >
        <button
          onClick={onBack}
          data-testid="miles-polls-back-btn"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>
          Shape the roadmap
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        <div>
          <h2 className="text-lg font-black mb-1" style={{ color: "hsl(210,20%,95%)" }}>
            {data.title}
          </h2>
          <p className="text-sm" style={{ color: "hsl(220,15%,65%)" }}>
            {data.subtitle}
          </p>
        </div>

        <div className="space-y-2">
          {data.options.map((opt) => {
            const pct = Math.round((opt.votes / totalVotes) * 100);
            const voted = (data.my_vote || []).includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                data-testid={`miles-polls-opt-${opt.id}`}
                className="w-full text-left p-4 rounded-2xl relative overflow-hidden"
                style={{
                  background: voted
                    ? "linear-gradient(135deg, hsla(160,70%,45%,0.18), hsla(160,70%,35%,0.08))"
                    : "hsl(220,35%,11%)",
                  border: voted ? "1px solid hsla(160,70%,55%,0.4)" : "1px solid hsl(220,30%,19%)",
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 opacity-20"
                  style={{
                    width: `${pct}%`,
                    background: voted ? "hsl(160,70%,45%)" : "hsl(220,30%,20%)",
                  }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div
                    className="text-sm font-semibold leading-snug"
                    style={{ color: "hsl(210,20%,92%)" }}
                  >
                    {opt.label}
                  </div>
                  <div
                    className="text-xs flex items-center gap-2 flex-shrink-0"
                    style={{ color: "hsl(220,15%,60%)" }}
                  >
                    <span>{opt.votes}</span>
                    {voted && (
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                        style={{ background: "hsl(160,70%,45%)", color: "white" }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-center" style={{ color: "hsl(220,15%,40%)" }}>
          Vote for as many as you want. Tap again to remove.
        </div>
      </div>
    </div>
  );
}
