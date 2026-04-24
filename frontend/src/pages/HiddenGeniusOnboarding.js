import { motion } from "framer-motion";

export default function HiddenGeniusOnboarding({ onContinue }) {
  const handleContinue = () => {
    try { localStorage.setItem("hg_onboarded", "true"); } catch {}
    onContinue();
  };

  const items = [
    { icon: "⚡", title: "You're building this", body: "Your real conversations will directly shape how Max evolves. What works for you gets built in for everyone." },
    { icon: "🎬", title: "This might be filmed", body: "Hidden Genius Labs LLC is a documentary project following real young people navigating real life. Your journey — if you choose — could be part of it." },
    { icon: "🔒", title: "Your choice, your pace", body: "Nothing is required. You can use Max privately and never be on camera. Being in the beta is valuable on its own." },
  ];

  return (
    <div className="flex flex-col min-h-full px-6 py-10 relative overflow-y-auto" data-testid="onboarding-screen">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, hsl(25,100%,55%), transparent)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, hsl(213,100%,60%), transparent)" }} />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="self-start mb-8">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ color: "hsl(25,100%,65%)", background: "hsla(25,100%,55%,0.12)", border: "1px solid hsla(25,100%,55%,0.25)" }}>Beta Access</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="flex-1">
          <h1 className="text-4xl font-black leading-tight mb-4" style={{ color: "hsl(210,20%,95%)" }}>
            You're not just<br />a user.{" "}
            <span style={{ background: "linear-gradient(135deg, hsl(25,100%,60%), hsl(25,100%,45%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>You're the story.</span>
          </h1>
          <p className="text-base leading-relaxed mb-6" style={{ color: "hsl(220,15%,60%)" }}>
            You're one of fewer than 20 people chosen to help shape Max — an AI life coach built for young people (16–23) who refuse to settle for less than all four burners running at full capacity.
          </p>

          <div className="space-y-4 mb-8">
            {items.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex gap-3 p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,18%)" }}>
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="font-bold text-sm mb-0.5" style={{ color: "hsl(210,20%,92%)" }}>{item.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,55%)" }}>{item.body}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="text-xs leading-relaxed mb-8" style={{ color: "hsl(220,15%,42%)" }}>
            Part of the <span style={{ color: "hsl(25,100%,60%)" }} className="font-semibold">Hidden Genius Labs LLC</span> project by Adam Bond Devereau — finding the unrefined brilliance in every young person who's been underestimated.
          </motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <button onClick={handleContinue} data-testid="onboarding-continue-btn" className="w-full py-4 rounded-2xl font-bold text-base tracking-wide" style={{ background: "linear-gradient(135deg, hsl(213,100%,58%) 0%, hsl(213,100%,48%) 100%)", color: "#fff", boxShadow: "0 0 28px hsla(213,100%,60%,0.35), 0 4px 16px rgba(0,0,0,0.4)" }}>
            I'm in — let's go
          </button>
          <p className="text-center text-xs mt-3" style={{ color: "hsl(220,15%,35%)" }}>By continuing you acknowledge this is a beta experience</p>
        </motion.div>
      </div>
    </div>
  );
}
