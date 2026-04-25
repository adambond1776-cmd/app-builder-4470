import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

const TOOL_ACCENTS = {
  notebooklm: "hsl(213,100%,60%)",
  obsidian: "hsl(270,70%,65%)",
  gemini: "hsl(35,100%,60%)",
};

export default function GeniusStackPage({ onBack }) {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    apiJSON("/miles/config").then(setCfg).catch(() => {});
  }, []);

  const stack = cfg?.genius_stack;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="genius-stack-page">
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)", backdropFilter: "blur(8px)" }}
      >
        <button
          onClick={onBack}
          data-testid="genius-stack-back-btn"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(160,70%,65%)" }}>
            ⚡ The Genius Stack
          </div>
          <div className="font-black text-base truncate" style={{ color: "hsl(210,20%,95%)" }}>
            How to automate the Accelerator
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, hsla(160,70%,45%,0.12), hsla(35,100%,60%,0.05))",
            border: "1px solid hsla(160,70%,50%,0.35)",
          }}
        >
          <div className="text-xs leading-relaxed" style={{ color: "hsl(210,20%,85%)" }}>
            Adam Bond Devereau spent 30 years quietly running a methodology he stumbled into as a consultant —{" "}
            <strong style={{ color: "hsl(160,70%,72%)" }}>chunk massive volumes of information, extract the
            high-signal pieces, build rapid mental models, look like an expert in weeks.</strong> Cognitive science
            calls this chunked learning. Adam called it survival.
            <br />
            <br />
            The <strong style={{ color: "hsl(160,70%,72%)" }}>Accelerator</strong> is the methodology. The{" "}
            <strong style={{ color: "hsl(160,70%,72%)" }}>Genius Stack</strong> is the 3-tool AI system that runs the
            methodology for you — a kid in 2026 doesn't have to learn it the way Adam did. They just plug in the
            stack and start compounding.
          </div>
        </motion.div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(220,15%,55%)" }}>
            The 3 layers
          </div>
          <div className="space-y-3">
            {(stack?.tools || []).map((t, i) => {
              const accent = TOOL_ACCENTS[t.id] || "hsl(160,70%,55%)";
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="p-4 rounded-2xl"
                  data-testid={`genius-stack-tool-${t.id}`}
                  style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${accent.replace(",60%)", ",45%)").replace(",65%)", ",50%)")})`,
                        color: "white",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-base" style={{ color: "hsl(210,20%,95%)" }}>
                        {t.name}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider font-bold" style={{ color: accent }}>
                        {t.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "hsl(220,15%,72%)" }}>
                    {t.what}
                  </p>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`genius-stack-link-${t.id}`}
                    className="inline-block text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{
                      background: `${accent.replace(")", ",0.15)").replace("hsl", "hsla")}`,
                      color: accent,
                      border: `1px solid ${accent.replace(")", ",0.35)").replace("hsl", "hsla")}`,
                    }}
                  >
                    Open {t.name} ↗
                  </a>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl"
          style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
        >
          <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(35,100%,68%)" }}>
            Your first 30 minutes
          </div>
          <ol className="text-xs leading-relaxed space-y-2" style={{ color: "hsl(220,15%,72%)" }}>
            <li>
              <strong style={{ color: "hsl(210,20%,92%)" }}>1.</strong> Pick ONE topic you keep meaning to learn
              (your major, an industry, a board exam, a side hustle space). Don't go big — go specific.
            </li>
            <li>
              <strong style={{ color: "hsl(210,20%,92%)" }}>2.</strong> Open NotebookLM. Drop in 5 sources — a
              YouTube video, two articles, one PDF, one podcast episode.
            </li>
            <li>
              <strong style={{ color: "hsl(210,20%,92%)" }}>3.</strong> Ask NotebookLM: "What's repeated across
              these? What's unique to one source? What are the 3 biggest gaps in coverage?"
            </li>
            <li>
              <strong style={{ color: "hsl(210,20%,92%)" }}>4.</strong> Export the consolidated notes to Obsidian.
              That's your vault entry. It compounds.
            </li>
            <li>
              <strong style={{ color: "hsl(210,20%,92%)" }}>5.</strong> Hand your Obsidian notes to Gemini and ask:
              "Build me a 1-page mental model I can teach a 12-year-old." Now you actually understand it.
            </li>
          </ol>
        </motion.div>

        <div
          className="text-center text-[11px] leading-relaxed px-4 py-4"
          style={{ color: "hsl(220,15%,55%)" }}
        >
          The Accelerator is Adam's method. The Genius Stack is the 2026 implementation. Inside Miles Academy, Ivy /
          Vance / Drake will run both for you whenever you say{" "}
          <strong style={{ color: "hsl(35,100%,72%)" }}>"Run the Accelerator."</strong>
        </div>
      </div>
    </div>
  );
}
