import { motion, AnimatePresence } from "framer-motion";

const BURNERS = [
  { name: "Work / School", color: "hsl(213,100%,60%)", glow: "hsla(213,100%,60%,0.2)", tagline: "What you produce", description: "Your classes, your grades, your job, your hustle, your craft. This is the burner everyone sees. It's important — but it's not the only one that matters.", questions: ["Are you actually learning, or just surviving?", "Does your work feel like it's going somewhere?"] },
  { name: "Relationships", color: "hsl(25,100%,60%)", glow: "hsla(25,100%,60%,0.2)", tagline: "Who you run with", description: "Family, friends, your crew, whoever you're dating or not dating. The people around you either fuel you or drain you. Running this burner means being intentional about who gets your energy.", questions: ["Who actually has your back?", "Are you showing up for the people who matter?"] },
  { name: "Health", color: "hsl(142,71%,45%)", glow: "hsla(142,71%,45%,0.2)", tagline: "Your body, your mind", description: "Sleep, movement, food, mental health. This one gets sacrificed first when life gets busy — and when it crashes, every other burner crashes with it.", questions: ["When did you last sleep properly?", "What does your energy actually feel like right now?"] },
  { name: "Self", color: "hsl(270,80%,65%)", glow: "hsla(270,80%,65%,0.2)", tagline: "Who you're becoming", description: "Your identity. Your values. What you believe about yourself and what you're capable of. This is the burner most people never tend to — and it's the one that determines everything else.", questions: ["Do you actually know what you want?", "Who are you when nobody's watching?"] },
];

export default function FourBurnersSheet({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden" data-testid="four-burners-sheet" style={{ background: "hsl(220,38%,9%)", border: "1px solid hsl(220,30%,18%)", maxHeight: "90dvh", maxWidth: "448px", margin: "0 auto" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: "hsl(220,30%,25%)" }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h2 className="text-lg font-black" style={{ color: "hsl(210,20%,95%)" }}>The Four Burners</h2>
                <p className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>The framework behind everything Max does</p>
              </div>
              <button onClick={onClose} data-testid="burners-close-btn" className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "hsl(220,30%,16%)", color: "hsl(220,15%,55%)" }}>✕</button>
            </div>
            <div className="px-5 pb-3">
              <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,58%)" }}>
                Most people think success means maxing out one area of life while letting the others slide. Max rejects that entirely. You have <span style={{ color: "hsl(213,100%,65%)" }} className="font-semibold">four burners</span>, and the goal is running all four — at the same time, at full capacity.
              </p>
            </div>
            <div className="overflow-y-auto px-5 pb-6 space-y-3" style={{ maxHeight: "55dvh" }}>
              {BURNERS.map((b, i) => (
                <motion.div key={b.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="rounded-2xl p-4" style={{ background: "hsl(220,35%,12%)", border: "1px solid hsl(220,30%,19%)" }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color, boxShadow: `0 0 8px ${b.glow}` }} />
                    <span className="font-black text-sm" style={{ color: b.color }}>{b.name}</span>
                    <span className="text-xs ml-auto" style={{ color: "hsl(220,15%,45%)" }}>{b.tagline}</span>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "hsl(220,15%,60%)" }}>{b.description}</p>
                  <div className="space-y-1">
                    {b.questions.map((q) => (
                      <div key={q} className="flex items-start gap-1.5">
                        <span className="text-xs mt-0.5" style={{ color: b.color }}>→</span>
                        <span className="text-xs italic" style={{ color: "hsl(220,15%,50%)" }}>{q}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
