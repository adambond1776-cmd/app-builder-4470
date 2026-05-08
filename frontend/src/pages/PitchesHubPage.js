import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

const TRACK_EMOJI = {
  "School Track": "🎓",
  "Work Track": "💼",
  "Trade Track": "🔧",
  "Figuring It Out Track": "🔍",
};

function formatDeadline(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

function PitchCard({ pitch, index }) {
  const emoji = TRACK_EMOJI[pitch.track] || "🎯";
  const excerpt = pitch.pitch_text.length > 220 ? pitch.pitch_text.slice(0, 220) + "…" : pitch.pitch_text;
  const openPublic = () => {
    window.location.href = `/pitch/${pitch.slug}`;
  };
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={openPublic}
      data-testid={`pitches-hub-card-${pitch.slug}`}
      className="text-left w-full p-5 rounded-2xl transition-all hover:scale-[1.01]"
      style={{
        background: "hsl(220,35%,11%)",
        border: "1px solid hsl(220,30%,19%)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-black flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(270,80%,55%))",
              color: "white",
            }}
          >
            {(pitch.name || "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate" style={{ color: "hsl(210,20%,95%)" }}>
              {pitch.name || "Anonymous"}
            </div>
            <div className="text-xs" style={{ color: "hsl(213,100%,65%)" }}>
              {emoji} {pitch.track || "Unspecified"}
            </div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            background: "hsla(25,100%,55%,0.15)",
            color: "hsl(25,100%,70%)",
            border: "1px solid hsla(25,100%,55%,0.3)",
          }}
        >
          <span className="font-black text-sm">↑ {pitch.upvote_count || 0}</span>
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "hsl(210,15%,82%)" }}>
        {excerpt}
      </p>
      <div className="flex items-center gap-3 mt-3">
        {pitch.youtube_url && (
          <div
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{
              background: "hsla(0,80%,55%,0.15)",
              color: "hsl(0,80%,72%)",
              border: "1px solid hsla(0,80%,55%,0.3)",
            }}
          >
            🎥 Video pitch
          </div>
        )}
        <div className="text-xs ml-auto font-semibold" style={{ color: "hsl(213,100%,65%)" }}>
          View & upvote →
        </div>
      </div>
    </motion.button>
  );
}

export default function PitchesHubPage() {
  const [stats, setStats] = useState(null);
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("top");
  const [trackFilter, setTrackFilter] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      apiJSON("/pitch/public-stats").catch(() => null),
      apiJSON("/pitch/feed").catch(() => ({ pitches: [] })),
    ]).then(([s, f]) => {
      setStats(s);
      setPitches(f?.pitches || []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let out = [...pitches];
    if (trackFilter) out = out.filter((p) => p.track === trackFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.pitch_text || "").toLowerCase().includes(q) ||
          (p.track || "").toLowerCase().includes(q),
      );
    }
    if (sort === "newest")
      out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    else out.sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0));
    return out;
  }, [pitches, sort, trackFilter, query]);

  const trackCounts = stats?.tracks || [];
  const deadline = formatDeadline(stats?.round_deadline);

  return (
    <div
      className="flex flex-col min-h-full overflow-y-auto"
      style={{ background: "hsl(220,40%,8%)", color: "hsl(210,20%,92%)" }}
      data-testid="pitches-hub-page"
    >
      {/* Hero */}
      <div
        className="px-5 pt-8 pb-6"
        style={{
          background:
            "linear-gradient(180deg, hsla(213,100%,60%,0.08) 0%, transparent 100%)",
          borderBottom: "1px solid hsl(220,30%,16%)",
        }}
      >
        <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,65%)" }}>
          🎤 Max Pitch · Public Hub
        </div>
        <h1 className="font-black text-3xl leading-tight mb-2" style={{ color: "hsl(210,20%,97%)" }}>
          Young people pitching for their next mentor.
        </h1>
        <p className="text-sm leading-relaxed mb-5" style={{ color: "hsl(220,15%,65%)" }}>
          Real kids (16–23) pitching senior operators for 90 days of 1-on-1 coaching. Community upvotes signal. Judges
          match on fit. Part of <strong>The Business of Life</strong> by Adam Bond Devereau.
        </p>
        {stats && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)" }}
            >
              <span style={{ color: "hsl(220,15%,55%)" }}>Round: </span>
              <span style={{ color: "hsl(210,20%,92%)" }}>{stats.round_name}</span>
            </div>
            {deadline && (
              <div
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)" }}
              >
                <span style={{ color: "hsl(220,15%,55%)" }}>Deadline: </span>
                <span style={{ color: "hsl(25,100%,72%)" }}>{deadline}</span>
              </div>
            )}
            {stats.sponsor_name && (
              <a
                href={stats.sponsor_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: "hsla(25,100%,55%,0.15)",
                  color: "hsl(25,100%,72%)",
                  border: "1px solid hsla(25,100%,55%,0.3)",
                }}
              >
                Powered by {stats.sponsor_name} ↗
              </a>
            )}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl" style={{ background: "hsl(220,30%,12%)", border: "1px solid hsl(220,30%,18%)" }}>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "hsl(220,15%,55%)" }}>
              Pitches
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: "hsl(213,100%,70%)" }}>
              {stats?.total_pitches ?? "—"}
            </div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "hsl(220,30%,12%)", border: "1px solid hsl(220,30%,18%)" }}>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "hsl(220,15%,55%)" }}>
              Upvotes
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: "hsl(25,100%,70%)" }}>
              {stats?.total_upvotes ?? "—"}
            </div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "hsl(220,30%,12%)", border: "1px solid hsl(220,30%,18%)" }}>
            <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "hsl(220,15%,55%)" }}>
              Videos
            </div>
            <div className="text-2xl font-black mt-0.5" style={{ color: "hsl(142,60%,65%)" }}>
              {stats?.total_videos ?? "—"}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/"
            data-testid="pitches-hub-submit-cta"
            className="flex-1 text-center min-w-[160px] px-4 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,45%))",
              color: "white",
            }}
          >
            Pitch yourself →
          </a>
          <a
            href="/sponsor"
            data-testid="pitches-hub-sponsor-cta"
            className="flex-1 text-center min-w-[160px] px-4 py-3 rounded-xl font-bold text-sm"
            style={{
              background: "hsl(220,30%,14%)",
              color: "hsl(25,100%,70%)",
              border: "1px solid hsla(25,100%,55%,0.35)",
            }}
          >
            Sponsor a round →
          </a>
        </div>
      </div>

      {/* Teacher Hub bridge — links over to the toolkit-builder vote.
          Additive only — the original /pitches surface above is untouched. */}
      <a
        href="/teachers"
        data-testid="pitches-hub-teacher-hub-link"
        className="block mx-5 mb-5 p-4 sm:p-5 rounded-2xl no-underline transition-all hover:scale-[1.005]"
        style={{
          background:
            "linear-gradient(135deg, hsla(280,80%,55%,0.14), hsla(40,90%,55%,0.08))",
          border: "1px solid hsla(280,80%,55%,0.3)",
          color: "inherit",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(280,80%,55%), hsl(40,90%,55%))",
            }}
          >
            🔨
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: "hsl(280,80%,80%)" }}
            >
              Toolkit Builder Vote · Live
            </div>
            <div
              className="font-black text-sm sm:text-base leading-tight"
              style={{ color: "hsl(210,20%,95%)" }}
            >
              Meet our teachers & vote for the toolkit builder →
            </div>
            <div
              className="text-[11px] sm:text-xs mt-1 leading-relaxed"
              style={{ color: "hsl(220,15%,72%)" }}
            >
              Help pick the teacher who'll shape the toolkit that amplifies what
              you learn through the Coach App. One vote per teacher.
            </div>
          </div>
          <div
            className="text-xs font-bold whitespace-nowrap hidden sm:block"
            style={{ color: "hsl(40,90%,72%)" }}
          >
            Open hub →
          </div>
        </div>
      </a>

      {/* Controls */}
      <div
        className="sticky top-0 z-10 px-5 py-3 flex flex-col gap-2"
        style={{
          background: "hsla(220,40%,8%,0.92)",
          borderBottom: "1px solid hsl(220,30%,16%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pitches by name, track, or idea..."
          data-testid="pitches-hub-search"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "hsl(220,30%,13%)",
            border: "1px solid hsl(220,30%,22%)",
            color: "hsl(210,20%,90%)",
          }}
        />
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSort("top")}
            data-testid="pitches-hub-sort-top"
            className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
            style={{
              background: sort === "top" ? "hsla(25,100%,55%,0.18)" : "hsl(220,30%,14%)",
              color: sort === "top" ? "hsl(25,100%,72%)" : "hsl(220,15%,65%)",
              border: `1px solid ${sort === "top" ? "hsla(25,100%,55%,0.3)" : "hsl(220,30%,22%)"}`,
            }}
          >
            🔥 Top
          </button>
          <button
            onClick={() => setSort("newest")}
            data-testid="pitches-hub-sort-newest"
            className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
            style={{
              background: sort === "newest" ? "hsla(213,100%,60%,0.18)" : "hsl(220,30%,14%)",
              color: sort === "newest" ? "hsl(213,100%,72%)" : "hsl(220,15%,65%)",
              border: `1px solid ${sort === "newest" ? "hsla(213,100%,60%,0.3)" : "hsl(220,30%,22%)"}`,
            }}
          >
            🆕 Newest
          </button>
          <div className="w-px flex-shrink-0" style={{ background: "hsl(220,30%,20%)" }} />
          <button
            onClick={() => setTrackFilter(null)}
            data-testid="pitches-hub-track-all"
            className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
            style={{
              background: !trackFilter ? "hsla(213,100%,60%,0.15)" : "hsl(220,30%,14%)",
              color: !trackFilter ? "hsl(213,100%,72%)" : "hsl(220,15%,65%)",
              border: "1px solid " + (!trackFilter ? "hsla(213,100%,60%,0.3)" : "hsl(220,30%,22%)"),
            }}
          >
            All tracks
          </button>
          {trackCounts.map((t) => (
            <button
              key={t.track}
              onClick={() => setTrackFilter(trackFilter === t.track ? null : t.track)}
              data-testid={`pitches-hub-track-${t.track.replace(/ /g, "-").toLowerCase()}`}
              className="text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0"
              style={{
                background: trackFilter === t.track ? "hsla(213,100%,60%,0.18)" : "hsl(220,30%,14%)",
                color: trackFilter === t.track ? "hsl(213,100%,72%)" : "hsl(220,15%,65%)",
                border: "1px solid " + (trackFilter === t.track ? "hsla(213,100%,60%,0.35)" : "hsl(220,30%,22%)"),
              }}
            >
              {TRACK_EMOJI[t.track] || "🎯"} {t.track.replace(" Track", "")} · {t.count}
            </button>
          ))}
        </div>
      </div>

      {/* Pitch list */}
      <div className="px-5 py-5 space-y-3 flex-1">
        {loading ? (
          <div className="text-sm py-10 text-center" style={{ color: "hsl(220,15%,55%)" }}>
            Loading pitches…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" data-testid="pitches-hub-empty">
            <div className="text-5xl mb-3">🎤</div>
            <div className="font-black text-lg mb-1" style={{ color: "hsl(210,20%,95%)" }}>
              {pitches.length === 0 ? "Round is open — be first." : "No pitches match your filter."}
            </div>
            <div className="text-sm" style={{ color: "hsl(220,15%,60%)" }}>
              {pitches.length === 0
                ? "Submit your pitch and rally upvotes before the deadline."
                : "Try a different track, or clear the search."}
            </div>
          </div>
        ) : (
          filtered.map((p, i) => <PitchCard key={p.slug} pitch={p} index={i} />)
        )}
      </div>

      {/* Footer */}
      <div
        className="text-center text-[11px] px-5 py-6 mt-6"
        style={{
          color: "hsl(220,15%,45%)",
          borderTop: "1px solid hsl(220,30%,14%)",
        }}
      >
        Max Pitch · Part of Hidden Genius Labs LLC · Want to back a round?{" "}
        <a href="/sponsor" style={{ color: "hsl(25,100%,68%)", fontWeight: 700 }}>
          See sponsor options →
        </a>
      </div>
    </div>
  );
}
