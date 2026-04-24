import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function ParentDashboard({ user, onLogout, onOpenPolls, onOpenIdeas, onOpenFounding, onOpenInvite }) {
  const [dashboard, setDashboard] = useState(null);
  const [founding, setFounding] = useState(null);

  useEffect(() => {
    apiJSON("/family/dashboard").then(setDashboard).catch(() => {});
    apiJSON("/family/founding-status").then(setFounding).catch(() => {});
  }, []);

  const firstName = (user.name || "").split(" ")[0] || "Parent";

  return (
    <div className="flex flex-col min-h-full overflow-y-auto px-5 py-6" data-testid="parent-dashboard">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {user.picture ? <img src={user.picture} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,85%)" }}>{firstName[0]?.toUpperCase()}</div>}
          <div>
            <div className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>Parent Mode</div>
            <div className="font-black text-base" style={{ color: "hsl(210,20%,95%)" }}>{firstName}</div>
          </div>
        </div>
        <button onClick={onLogout} data-testid="parent-logout-btn" className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "hsl(220,15%,55%)", background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)" }}>Sign out</button>
      </div>

      {/* Invite card or kid cards */}
      {!dashboard?.kids?.length ? (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onOpenInvite} data-testid="parent-invite-cta" className="text-left mb-5 p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.12), hsla(213,100%,60%,0.04))", border: "1px solid hsla(25,100%,55%,0.3)" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,70%)" }}>Start here</div>
          <div className="font-black text-lg mb-1" style={{ color: "hsl(210,20%,95%)" }}>Invite your kid →</div>
          <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>
            Generate a 6-digit code, share it with them verbally or by text. They enter it on their Max Home screen. You'll see what they choose to share.
          </div>
        </motion.button>
      ) : (
        <div className="space-y-3 mb-5">
          {dashboard.kids.map((kid, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} data-testid={`parent-kid-card-${i}`} className="p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
              <div className="flex items-center gap-3 mb-3">
                {kid.picture ? <img src={kid.picture} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: "hsl(220,30%,16%)", color: "hsl(210,20%,85%)" }}>{(kid.name || "?")[0]?.toUpperCase()}</div>}
                <div>
                  <div className="font-bold" style={{ color: "hsl(210,20%,92%)" }}>{kid.name}</div>
                  {kid.track && <div className="text-xs" style={{ color: "hsl(213,100%,60%)" }}>🎯 {kid.track}</div>}
                </div>
              </div>
              {kid.privacy?.shares_memory_card && kid.memory_card && (
                <div className="mb-3 p-3 rounded-xl" style={{ background: "hsl(220,30%,13%)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(213,100%,65%)" }}>What Max learned about them</div>
                  <div className="text-xs leading-relaxed" style={{ color: "hsl(210,20%,85%)" }}>{kid.memory_card}</div>
                </div>
              )}
              {kid.privacy?.shares_activity && (
                <div className="flex gap-4 text-xs" style={{ color: "hsl(220,15%,60%)" }}>
                  <span>Today: <strong style={{ color: "hsl(210,20%,90%)" }}>{kid.messages_today || 0}</strong> chats</span>
                  <span>Last 7 days: <strong style={{ color: "hsl(210,20%,90%)" }}>{kid.messages_last_7_days || 0}</strong></span>
                </div>
              )}
              <div className="text-[10px] italic mt-3" style={{ color: "hsl(220,15%,45%)" }}>
                You're not spying — your kid chose what to share. Respect it.
              </div>
            </motion.div>
          ))}
          <button onClick={onOpenInvite} data-testid="parent-invite-more-btn" className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: "hsl(220,30%,14%)", color: "hsl(213,100%,65%)", border: "1px dashed hsla(213,100%,60%,0.3)" }}>+ Invite another kid</button>
        </div>
      )}

      {/* Guide the roadmap */}
      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} onClick={onOpenPolls} data-testid="parent-polls-cta" className="text-left mb-3 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(270,80%,70%)" }}>🗳️ Guide the roadmap</div>
        <div className="font-bold text-sm" style={{ color: "hsl(210,20%,92%)" }}>Vote on what we build next</div>
        <div className="text-xs mt-1" style={{ color: "hsl(220,15%,58%)" }}>Your picks directly steer our priorities. Real-time results.</div>
      </motion.button>

      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onClick={onOpenIdeas} data-testid="parent-ideas-cta" className="text-left mb-5 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(142,71%,55%)" }}>💡 Share an idea</div>
        <div className="font-bold text-sm" style={{ color: "hsl(210,20%,92%)" }}>Tell us what would help your family</div>
        <div className="text-xs mt-1" style={{ color: "hsl(220,15%,58%)" }}>Adam personally reads every idea. Good ones become features.</div>
      </motion.button>

      {/* Founding Parent card */}
      {founding && (
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} onClick={onOpenFounding} data-testid="parent-founding-cta" className="text-left p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.1), hsla(25,100%,45%,0.04))", border: "1px solid hsla(25,100%,55%,0.35)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(25,100%,70%)" }}>🔒 Founding Parent</span>
            {founding.signed_up && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(142,71%,45%,0.15)", color: "hsl(142,60%,70%)" }}>Slot #{founding.signup?.slot_number} locked</span>}
          </div>
          <div className="text-sm font-bold mb-1" style={{ color: "hsl(210,20%,92%)" }}>
            {founding.signed_up
              ? `You're in. $${founding.founding_price}/mo locked.`
              : `Lock in $${founding.founding_price}/mo for a year`}
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,58%)" }}>
            {founding.signed_up
              ? "When Family Plan launches, your founding rate applies automatically."
              : `Family Plan launches at $${founding.launch_price}/mo. First ${founding.cap} parents lock in at half price. ${founding.spots_left} spots left.`}
          </div>
        </motion.button>
      )}

      <div className="text-center text-[10px] mt-8 mb-4" style={{ color: "hsl(220,15%,35%)" }}>
        Family OS Lite v0 · Beta · Part of Hidden Genius Labs LLC
      </div>
    </div>
  );
}
