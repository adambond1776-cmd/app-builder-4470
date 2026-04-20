import { motion } from "framer-motion";

const TRACKS = [
  { id: "School Track", emoji: "🎓", title: "School Track", description: "High school, college, grad school — navigating academics and what's next" },
  { id: "Work Track", emoji: "💼", title: "Work Track", description: "Building a career, making money, getting real experience" },
  { id: "Trade Track", emoji: "🔧", title: "Trade Track", description: "Skilled trades, apprenticeships, and building real wealth" },
  { id: "Figuring It Out Track", emoji: "🔍", title: "Figuring It Out Track", description: "No clear path yet — and that's completely okay" },
];

export default function TrackScreen({ onSelectTrack, onBack }) {
  return (
    <div className="flex flex-col min-h-full px-5 py-8 overflow-y-auto relative" data-testid="track-screen">
      {onBack && (
        <button onClick={onBack} data-testid="track-back-btn" className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h2 className="text-3xl font-black tracking-tight" style={{ color: "hsl(210,20%,95%)" }}>Find Your Road</h2>
        <p className="mt-2 text-sm" style={{ color: "hsl(220,15%,55%)" }}>Where are you headed right now? Pick the track that fits.</p>
      </motion.div>

      <div className="flex flex-col gap-4 flex-1">
        {TRACKS.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectTrack(t.id)}
            data-testid={`track-option-${t.id.replace(/\s+/g, "-").toLowerCase()}`}
            className="flex items-center gap-4 p-5 rounded-2xl text-left group relative overflow-hidden"
            style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,18%)" }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "hsl(220,30%,16%)", border: "1px solid hsl(220,30%,22%)" }}>{t.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base" style={{ color: "hsl(210,20%,95%)" }}>{t.title}</div>
              <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "hsl(220,15%,52%)" }}>{t.description}</div>
            </div>
            <svg className="w-5 h-5 flex-shrink-0" style={{ color: "hsl(213,100%,60%)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        ))}
      </div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-xs mt-6" style={{ color: "hsl(220,15%,35%)" }}>
        You can always change your track later
      </motion.p>
    </div>
  );
}
