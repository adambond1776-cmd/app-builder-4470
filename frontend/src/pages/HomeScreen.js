import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

const BURNERS = [
  { label: "Work / School", color: "hsl(213,100%,60%)" },
  { label: "Relationships", color: "hsl(25,100%,60%)" },
  { label: "Health", color: "hsl(142,71%,45%)" },
  { label: "Self", color: "hsl(270,80%,65%)" },
];

export default function HomeScreen({ user, onContinueChat, onOpenMemory, onOpenBurners, onPickTrack, onApplyFounding, onOpenMaxPitch, onOpenKidAcceptInvite, onLogout }) {
  const [f20, setF20] = useState(null);

  useEffect(() => {
    apiJSON("/founding20/status").then(setF20).catch(() => {});
  }, []);

  const firstName = (user.name || "").split(" ")[0] || "there";

  return (
    <div className="flex flex-col min-h-full overflow-y-auto px-5 py-6" data-testid="home-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {user.picture ? <img src={user.picture} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,85%)" }}>{firstName[0]?.toUpperCase()}</div>}
          <div>
            <div className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>Welcome back</div>
            <div className="font-black text-base" style={{ color: "hsl(210,20%,95%)" }}>{firstName}</div>
          </div>
        </div>
        <button onClick={onLogout} data-testid="home-logout-btn" className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "hsl(220,15%,55%)", background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)" }}>Sign out</button>
      </div>

      {/* Memory preview */}
      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onOpenMemory} data-testid="home-memory-card" className="text-left mb-5 p-4 rounded-2xl relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsla(213,100%,60%,0.08), hsla(270,80%,65%,0.04))", border: "1px solid hsla(213,100%,60%,0.2)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,65%)" }}>Max's memory of you</div>
        {user.memory_card ? (
          <p className="text-sm leading-relaxed line-clamp-4" style={{ color: "hsl(210,20%,88%)" }}>{user.memory_card}</p>
        ) : (
          <p className="text-sm italic" style={{ color: "hsl(220,15%,55%)" }}>Nothing yet — start chatting and Max will remember what matters.</p>
        )}
        <div className="text-xs mt-2 font-semibold" style={{ color: "hsl(213,100%,65%)" }}>Tap to view or edit →</div>
      </motion.button>

      {/* Burner indicator strip */}
      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onClick={onOpenBurners} data-testid="home-burners-card" className="text-left mb-5 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(210,20%,80%)" }}>Your Four Burners</div>
          <div className="text-xs" style={{ color: "hsl(213,100%,60%)" }}>Learn →</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BURNERS.map((b) => (
            <div key={b.label} className="text-center">
              <div className="w-full h-1.5 rounded-full mb-2" style={{ background: b.color, opacity: 0.75, boxShadow: `0 0 8px ${b.color}` }} />
              <div className="text-[10px] leading-tight" style={{ color: "hsl(220,15%,60%)" }}>{b.label}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] mt-3" style={{ color: "hsl(220,15%,40%)" }}>Weekly check-ins coming in Phase 2</div>
      </motion.button>

      {/* Continue chatting */}
      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onClick={onContinueChat} data-testid="home-continue-btn" className="mb-3 py-4 rounded-2xl font-bold text-base" style={{ background: "linear-gradient(135deg, hsl(213,100%,58%) 0%, hsl(213,100%,48%) 100%)", color: "white", boxShadow: "0 0 24px hsla(213,100%,60%,0.3)" }}>
        {user.current_track ? `Continue with Max · ${user.current_track}` : "Start with Max"}
      </motion.button>

      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} onClick={onPickTrack} data-testid="home-change-track-btn" className="mb-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "hsl(220,30%,14%)", color: "hsl(210,15%,80%)", border: "1px solid hsl(220,30%,22%)" }}>
        {user.current_track ? "Change track" : "Pick your track"}
      </motion.button>

      {/* Founding 20 CTA */}
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onClick={onApplyFounding} data-testid="home-founding-cta" className="text-left p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.12), hsla(25,100%,45%,0.05))", border: "1px solid hsla(25,100%,55%,0.3)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(25,100%,70%)" }}>🏆 Founding 20</span>
          {f20?.applied && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(142,71%,45%,0.15)", color: "hsl(142,60%,70%)", border: "1px solid hsla(142,71%,45%,0.3)" }}>Application submitted</span>}
        </div>
        <div className="text-sm font-bold mb-1" style={{ color: "hsl(210,20%,92%)" }}>
          {f20?.applied ? "We'll be in touch" : "Apply to be one of 20"}
        </div>
        <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
          {f20?.applied
            ? "Your application is under review. Adam personally reviews each one."
            : "Weekly 1-on-1 coaching with Adam Bond Devereau for 90 days. 3 spots free. This is an application — not everyone gets in."}
        </div>
      </motion.button>


      {/* Max Pitch CTA */}
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} onClick={onOpenMaxPitch} data-testid="home-maxpitch-cta" className="text-left mt-3 p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(213,100%,60%,0.08), hsla(270,80%,65%,0.04))", border: "1px solid hsla(213,100%,60%,0.25)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(213,100%,65%)" }}>🎤 Max Pitch</div>
        <div className="text-sm font-bold mb-1" style={{ color: "hsl(210,20%,92%)" }}>Pitch yourself for free executive coaching</div>
        <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
          Submit a pitch, rally upvotes, get matched with a senior exec for a 90-day coaching sprint.
        </div>
      </motion.button>

      {/* Parent invite entry */}
      {onOpenKidAcceptInvite && (
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} onClick={onOpenKidAcceptInvite} data-testid="home-link-parent-cta" className="text-left mt-3 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px dashed hsl(220,30%,22%)" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(25,100%,65%)" }}>👨‍👩‍👧 Got a parent invite code?</div>
          <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
            Link your parent so they can support your progress — you pick what they see.
          </div>
        </motion.button>
      )}

      <div className="text-center text-[10px] mt-8 mb-4" style={{ color: "hsl(220,15%,35%)" }}>
        Phase 1A · Beta · Part of Hidden Genius Labs LLC
      </div>
    </div>
  );
}
