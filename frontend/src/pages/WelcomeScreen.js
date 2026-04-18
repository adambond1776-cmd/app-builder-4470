import { useState } from "react";
import { motion } from "framer-motion";
import FourBurnersSheet from "../components/FourBurnersSheet";

export default function WelcomeScreen({ onStart, onBack }) {
  const [showBurners, setShowBurners] = useState(false);

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
          Your AI Life Coach. <span style={{ color: "hsl(25,100%,60%)" }} className="font-semibold">All Four Burners.</span> No Tradeoffs.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="flex gap-3 text-xs font-medium flex-wrap justify-center" style={{ color: "hsl(220,15%,50%)" }}>
          {["Work/School", "Relationships", "Health", "Self"].map((b, i) => (
            <span key={b} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: i % 2 === 0 ? "hsl(213,100%,60%)" : "hsl(25,100%,55%)", boxShadow: `0 0 6px ${i % 2 === 0 ? "hsl(213,100%,60%)" : "hsl(25,100%,55%)"}` }} />
              {b}
            </span>
          ))}
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} onClick={() => setShowBurners(true)} data-testid="welcome-burners-link" className="text-xs underline underline-offset-2" style={{ color: "hsl(213,100%,60%)" }}>
          What are the Four Burners?
        </motion.button>

        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 }} whileTap={{ scale: 0.97 }} onClick={onStart} data-testid="welcome-start-btn" className="mt-4 px-10 py-4 rounded-2xl text-base font-bold tracking-wide" style={{ background: "linear-gradient(135deg, hsl(213,100%,58%) 0%, hsl(213,100%,48%) 100%)", boxShadow: "0 0 24px hsla(213,100%,60%,0.4), 0 4px 16px rgba(0,0,0,0.4)", color: "#fff" }}>
          Let's Go
        </motion.button>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="text-xs" style={{ color: "hsl(220,15%,40%)" }}>
          Companion to The Business of Life: Student Edition
        </motion.p>
      </motion.div>

      <FourBurnersSheet open={showBurners} onClose={() => setShowBurners(false)} />
    </div>
  );
}
