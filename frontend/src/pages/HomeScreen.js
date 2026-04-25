import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiJSON } from "../lib/api";

const BURNERS = [
  { label: "Work / School", color: "hsl(213,100%,60%)" },
  { label: "Relationships", color: "hsl(25,100%,60%)" },
  { label: "Health", color: "hsl(142,71%,45%)" },
  { label: "Self", color: "hsl(270,80%,65%)" },
];

export default function HomeScreen({
  user, onContinueChat, onOpenMemory, onOpenBurners, onPickTrack, onApplyFounding,
  onOpenMaxPitch, onOpenKidAcceptInvite, onOpenMiles, onOpenGeniusStack, onLogout,
}) {
  const [f20, setF20] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    apiJSON("/founding20/status").then(setF20).catch(() => {});
  }, []);

  const firstName = (user.name || "").split(" ")[0] || "there";
  const hasTrack = !!user.current_track;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto px-5 py-5" data-testid="home-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {user.picture ? (
            <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-black"
              style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,85%)" }}
            >
              {firstName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>Welcome back</div>
            <div className="font-black text-base" style={{ color: "hsl(210,20%,95%)" }}>{firstName}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href="/pricing"
            data-testid="home-pricing-link"
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ color: "hsl(25,100%,72%)", background: "hsla(25,100%,55%,0.12)", border: "1px solid hsla(25,100%,55%,0.3)" }}
          >
            Pricing
          </a>
          <button
            onClick={onLogout}
            data-testid="home-logout-btn"
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ color: "hsl(220,15%,55%)", background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Hero — Talk to Max */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={hasTrack ? onContinueChat : onPickTrack}
        data-testid="home-hero-max-cta"
        className="text-left mb-4 p-5 rounded-3xl relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(213,100%,55%) 0%, hsl(270,75%,55%) 100%)",
          color: "white",
          boxShadow: "0 0 40px hsla(213,100%,55%,0.2)",
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">
          {hasTrack ? `Track: ${user.current_track}` : "Get started"}
        </div>
        <div className="font-black text-2xl leading-tight mb-1">
          {hasTrack ? "Talk to Max →" : "Pick your track & meet Max →"}
        </div>
        <div className="text-sm opacity-85 leading-relaxed">
          {hasTrack
            ? "Pick up where you left off. Max remembers what matters."
            : "Choose how you're moving through life right now — Max coaches accordingly."}
        </div>
      </motion.button>

      {/* Compact secondary row — Miles · Pitch · Genius Stack */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {onOpenMiles && (
          <button
            onClick={onOpenMiles}
            data-testid="home-miles-cta"
            className="p-3 rounded-2xl text-left"
            style={{
              background: "hsla(160,70%,45%,0.12)",
              border: "1px solid hsla(160,70%,50%,0.3)",
            }}
          >
            <div className="text-base mb-1">📚</div>
            <div className="text-xs font-black" style={{ color: "hsl(160,70%,75%)" }}>Miles Academy</div>
            <div className="text-[10px] mt-0.5" style={{ color: "hsl(220,15%,60%)" }}>
              {user.miles_persona ? `Coach: ${user.miles_persona[0].toUpperCase()}${user.miles_persona.slice(1)}` : "Pick a coach"}
            </div>
          </button>
        )}
        <button
          onClick={onOpenMaxPitch}
          data-testid="home-maxpitch-cta"
          className="p-3 rounded-2xl text-left"
          style={{
            background: "hsla(213,100%,60%,0.1)",
            border: "1px solid hsla(213,100%,60%,0.25)",
          }}
        >
          <div className="text-base mb-1">🎤</div>
          <div className="text-xs font-black" style={{ color: "hsl(213,100%,72%)" }}>Max Pitch</div>
          <div className="text-[10px] mt-0.5" style={{ color: "hsl(220,15%,60%)" }}>Pitch for coaching</div>
        </button>
        {onOpenGeniusStack && (
          <button
            onClick={onOpenGeniusStack}
            data-testid="home-genius-stack-cta"
            className="p-3 rounded-2xl text-left"
            style={{
              background: "hsla(35,100%,55%,0.12)",
              border: "1px solid hsla(35,100%,55%,0.3)",
            }}
          >
            <div className="text-base mb-1">⚡</div>
            <div className="text-xs font-black" style={{ color: "hsl(35,100%,72%)" }}>Accelerator</div>
            <div className="text-[10px] mt-0.5" style={{ color: "hsl(220,15%,60%)" }}>Learn 10× faster</div>
          </button>
        )}
      </div>

      {/* Memory card — compact */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={onOpenMemory}
        data-testid="home-memory-card"
        className="text-left mb-4 p-4 rounded-2xl"
        style={{
          background: "hsl(220,35%,11%)",
          border: "1px solid hsl(220,30%,19%)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(213,100%,65%)" }}>
            Max's memory
          </div>
          <div className="text-[10px]" style={{ color: "hsl(213,100%,65%)" }}>Edit →</div>
        </div>
        {user.memory_card ? (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "hsl(210,20%,82%)" }}>{user.memory_card}</p>
        ) : (
          <p className="text-xs italic" style={{ color: "hsl(220,15%,55%)" }}>Nothing yet — start chatting and Max remembers what matters.</p>
        )}
      </motion.button>

      {/* More — expandable section */}
      <button
        onClick={() => setMoreOpen((v) => !v)}
        data-testid="home-more-toggle"
        className="text-left mb-2 px-3 py-2 rounded-xl flex items-center justify-between"
        style={{ color: "hsl(220,15%,60%)" }}
      >
        <span className="text-xs font-bold uppercase tracking-widest">More</span>
        <span className="text-xs">{moreOpen ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2 mb-4"
          >
            <button
              onClick={onOpenBurners}
              data-testid="home-burners-card"
              className="w-full text-left p-3 rounded-xl"
              style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                {BURNERS.map((b) => (
                  <div key={b.label} className="w-4 h-4 rounded-full" style={{ background: b.color, opacity: 0.6 }} />
                ))}
                <span className="text-xs font-bold ml-1" style={{ color: "hsl(210,20%,90%)" }}>The Four Burners</span>
              </div>
              <p className="text-[11px]" style={{ color: "hsl(220,15%,60%)" }}>The framework Max coaches by — read the full story.</p>
            </button>

            {onOpenKidAcceptInvite && (
              <button
                onClick={onOpenKidAcceptInvite}
                data-testid="home-accept-invite-card"
                className="w-full text-left p-3 rounded-xl"
                style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: "hsl(210,20%,92%)" }}>👨‍👩‍👧 Accept a parent invite</div>
                <p className="text-[11px]" style={{ color: "hsl(220,15%,60%)" }}>If your parent set up Family OS, enter their 6-digit code.</p>
              </button>
            )}

            {!user.founding_20_applied && f20 && f20.spots_left > 0 && (
              <button
                onClick={onApplyFounding}
                data-testid="home-founding-card"
                className="w-full text-left p-3 rounded-xl"
                style={{ background: "hsla(25,100%,55%,0.1)", border: "1px solid hsla(25,100%,55%,0.3)" }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: "hsl(25,100%,72%)" }}>
                  ⭐ Apply: Founding 20 Beta · {f20.spots_left} spots
                </div>
                <p className="text-[11px]" style={{ color: "hsl(220,15%,60%)" }}>20 kids picked to shape Max with Adam directly.</p>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />
      <div className="text-center text-[10px] mt-4 mb-2" style={{ color: "hsl(220,15%,40%)" }}>
        Part of Hidden Genius Labs LLC
      </div>
    </div>
  );
}
