import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON, apiFetch } from "../lib/api";

function youTubeEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function PitchPublicPage({ slug }) {
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiJSON(`/pitch/${slug}`).then((p) => { setPitch(p); setLoading(false); }).catch((e) => { setErr(e.message); setLoading(false); });
  }, [slug]);

  const upvote = async () => {
    if (upvoting || justVoted) return;
    setUpvoting(true);
    try {
      const res = await apiFetch(`/pitch/${slug}/upvote`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPitch((p) => ({ ...p, upvote_count: data.upvote_count }));
        setJustVoted(true);
        setAuthed(data.authed);
      } else {
        setErr(data.detail || "Vote failed");
      }
    } catch (e) { setErr(e.message); }
    setUpvoting(false);
  };

  const signIn = () => {
    const redirectUrl = window.location.href;
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (loading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>Loading pitch…</div>;
  if (!pitch) return <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(0,70%,60%)" }}>{err || "Pitch not found"}</div>;

  const embed = youTubeEmbedUrl(pitch.youtube_url);

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="pitch-public-page">
      <div className="sticky top-0 z-10 px-4 py-3 border-b backdrop-blur" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,45%))", color: "white" }}>M</div>
          <div>
            <div className="text-sm font-black" style={{ color: "hsl(210,20%,95%)" }}>Max Pitch</div>
            <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>{pitch.round_name}</div>
          </div>
          <a href="/" className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ color: "hsl(213,100%,60%)", background: "hsla(213,100%,60%,0.1)", border: "1px solid hsla(213,100%,60%,0.25)" }} data-testid="pitch-public-home-link">Home</a>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          {pitch.picture ? <img src={pitch.picture} alt="" className="w-12 h-12 rounded-full" /> : <div className="w-12 h-12 rounded-full flex items-center justify-center font-black" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,85%)" }}>{(pitch.name || "?")[0]?.toUpperCase()}</div>}
          <div>
            <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>{pitch.name}</div>
            {pitch.track && <div className="text-xs" style={{ color: "hsl(213,100%,60%)" }}>🎯 {pitch.track}</div>}
          </div>
        </motion.div>

        {embed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl overflow-hidden aspect-video" data-testid="pitch-youtube-embed" style={{ border: "1px solid hsl(220,30%,19%)" }}>
            <iframe src={embed} className="w-full h-full" title="Pitch video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(210,20%,88%)" }}>{pitch.pitch_text}</p>
        </motion.div>

        <div className="sticky bottom-0 -mx-5 px-5 py-4 border-t backdrop-blur" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
          <button onClick={upvote} disabled={upvoting || justVoted} data-testid="pitch-upvote-btn" className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-60" style={{
            background: justVoted ? "hsl(142,71%,45%)" : "linear-gradient(135deg, hsl(25,100%,55%), hsl(25,100%,45%))",
            color: "white",
            boxShadow: !justVoted ? "0 0 24px hsla(25,100%,55%,0.35)" : "none",
          }}>
            {justVoted ? `✓ Upvoted · ${pitch.upvote_count} total` : upvoting ? "Voting…" : `🔥 Upvote · ${pitch.upvote_count}`}
          </button>
          {justVoted && !authed && (
            <div className="mt-2 text-center text-xs p-2 rounded-lg" style={{ color: "hsl(213,100%,70%)", background: "hsla(213,100%,60%,0.08)" }}>
              <button onClick={signIn} data-testid="pitch-public-signin-btn" className="underline font-semibold">Sign in to track the pitches you upvote</button>
            </div>
          )}
          {err && <div className="text-xs mt-2 text-center" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}
