import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QUOTES } from "./FourBurnersPage";

export default function WelcomeScreen({ onStart, onBack, onOpenBurners }) {
  const [qIdx, setQIdx] = useState(0);
  const teaserQuotes = [QUOTES[0], QUOTES[2], QUOTES[4], QUOTES[6]]; // Elon, Bezos, Huberman, Naval
  useEffect(() => {
    const t = setInterval(() => setQIdx((i) => (i + 1) % teaserQuotes.length), 6000);
    return () => clearInterval(t);
  }, []);
  const tq = teaserQuotes[qIdx];

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center relative overflow-hidden" data-testid="welcome-screen">
      {onBack && (
        <button onClick={onBack} data-testid="welcome-back-btn" className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, hsl(213,100%,60%), transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, hsl(25,100%,55%), transparent)" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 flex flex-col items-center gap-6">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%) 0%, hsl(213,100%,45%) 100%)", boxShadow: "0 0 40px hsla(213,100%,60%,0.35), 0 8px 32px rgba(0,0,0,0.5)" }}>M</motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <h1 className="text-6xl font-black tracking-tight" style={{ color: "hsl(210,20%,95%)" }}>Max</h1>
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "hsl(213,100%,60%)" }}>The Business of Life Coach</p>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-lg max-w-xs leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
          A life coach. <span style={{ color: "hsl(25,100%,60%)" }} className="font-semibold">All four burners.</span><br />
          <span style={{ color: "hsl(213,100%,68%)" }} className="font-semibold">Figure it out. Level up.</span> No tradeoffs.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="flex gap-3 text-xs font-medium flex-wrap justify-center" style={{ color: "hsl(220,15%,50%)" }}>
          {["Work/School", "Relationships", "Health", "Self"].map((b, i) => (
            <span key={b} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: i % 2 === 0 ? "hsl(213,100%,60%)" : "hsl(25,100%,55%)", boxShadow: `0 0 6px ${i % 2 === 0 ? "hsl(213,100%,60%)" : "hsl(25,100%,55%)"}` }} />
              {b}
            </span>
          ))}
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} onClick={onOpenBurners} data-testid="welcome-burners-link" className="text-xs underline underline-offset-2" style={{ color: "hsl(213,100%,60%)" }}>
          What are the Four Burners?
        </motion.button>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="max-w-xs w-full h-16 flex items-center justify-center px-2" data-testid="welcome-quote-teaser">
          <AnimatePresence mode="wait">
            <motion.div key={qIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.8 }} className="text-center">
              <p className="text-xs italic leading-relaxed" style={{ color: "hsl(220,15%,55%)" }}>"{tq.text.length > 110 ? tq.text.slice(0, 110) + "…" : tq.text}"</p>
              <p className="text-[10px] font-semibold mt-1" style={{ color: tq.color }}>— {tq.author} · 🔥 {tq.burner}</p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }} whileTap={{ scale: 0.97 }} onClick={onStart} data-testid="welcome-start-btn" className="mt-4 px-10 py-4 rounded-2xl text-base font-bold tracking-wide flex items-center gap-3" style={{ background: "linear-gradient(135deg, hsl(213,100%,58%) 0%, hsl(213,100%,48%) 100%)", boxShadow: "0 0 24px hsla(213,100%,60%,0.4), 0 4px 16px rgba(0,0,0,0.4)", color: "#fff" }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#fff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#fff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" opacity=".9"/><path fill="#fff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" opacity=".7"/><path fill="#fff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" opacity=".95"/></svg>
          Sign in with Google
        </motion.button>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="text-xs" style={{ color: "hsl(220,15%,40%)" }}>
          Companion to The Business of Life: Student Edition
        </motion.p>
      </motion.div>
    </div>
  );
}
