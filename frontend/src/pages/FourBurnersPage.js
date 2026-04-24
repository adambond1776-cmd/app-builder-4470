import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BURNERS = [
  { name: "Work / School", color: "hsl(213,100%,60%)", tagline: "What you produce", description: "Your classes, your grades, your job, your hustle, your craft. The burner everyone sees — but not the only one that counts." },
  { name: "Relationships", color: "hsl(25,100%,60%)", tagline: "Who you run with", description: "Family, friends, your crew, partners. The people around you either fuel you or drain you. Be intentional about who gets your energy." },
  { name: "Health", color: "hsl(142,71%,45%)", tagline: "Your body, your mind", description: "Sleep, movement, food, mental health. Sacrificed first when life gets busy — and when it crashes, every other burner crashes with it." },
  { name: "Self", color: "hsl(270,80%,65%)", tagline: "Who you're becoming", description: "Your identity, values, and what you believe you're capable of. The burner most people never tend to — and the one that decides everything else." },
];

export const QUOTES = [
  { author: "Elon Musk", burner: "Work / School", color: "hsl(213,100%,60%)", text: "If somebody else is working 50 hours a week and you're working 100, you'll get twice as much done in the course of a year.", source: "Public remarks & USC commencement" },
  { author: "Sam Altman", burner: "Work / School", color: "hsl(213,100%,60%)", text: "It is much more important to work on the right thing than it is to work many hours. Most people waste most of their time on stuff that doesn't matter.", source: "blog.samaltman.com — Productivity" },
  { author: "Jeff Bezos", burner: "All Four · Balance", color: "hsl(50,100%,60%)", text: "I like to use the phrase work-life harmony rather than balance. Balance implies a strict trade — but when I'm happy at work I come home more energized, and when I'm happy at home I come back a better colleague.", source: "Code Conference, 2016" },
  { author: "Alex Hormozi", burner: "Self", color: "hsl(270,80%,65%)", text: "A focused fool can accomplish more than a distracted genius.", source: "Public talks / social" },
  { author: "Andrew Huberman", burner: "Health", color: "hsl(142,71%,45%)", text: "Get your physiology right, and the rest will start falling into place. The mental health crisis starts with light, sleep, daytime behavior, hydration, nutrition, exercise.", source: "Shawn Ryan Show #147" },
  { author: "David Goggins", burner: "Self", color: "hsl(270,80%,65%)", text: "It takes relentless self-discipline to schedule suffering into your day, every day.", source: "Can't Hurt Me" },
  { author: "Naval Ravikant", burner: "Relationships · Health", color: "hsl(25,100%,60%)", text: "A calm mind, a fit body, a house full of love. These things cannot be bought — they must be earned.", source: "nav.al — Finally, Wealthy" },
  { author: "Kobe Bryant", burner: "Work / School", color: "hsl(213,100%,60%)", text: "Those times when you don't feel like working, you're too tired, you don't want to push yourself — but you do it anyway. That is actually the dream. It's not the destination, it's the journey.", source: "The Mamba Mentality" },
  { author: "MrBeast (Jimmy Donaldson)", burner: "Relationships", color: "hsl(25,100%,60%)", text: "There's a reason no one makes videos like me — because no one wants to live the life I live.", source: "Diary of a CEO, Feb 2025" },
];

function QuoteCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 7000);
    return () => clearInterval(t);
  }, [paused]);
  const q = QUOTES[idx];
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" data-testid="burners-quote-carousel" onClick={() => setPaused((p) => !p)} style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)", minHeight: 220 }}>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: q.color, boxShadow: `0 0 8px ${q.color}` }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: q.color }}>🔥 {q.burner} Burner</span>
          </div>
          <p className="text-base leading-relaxed italic mb-3" style={{ color: "hsl(210,20%,92%)" }}>"{q.text}"</p>
          <div className="text-sm font-bold" style={{ color: "hsl(210,20%,85%)" }}>— {q.author}</div>
          <div className="text-xs mt-0.5" style={{ color: "hsl(220,15%,45%)" }}>{q.source}</div>
        </motion.div>
      </AnimatePresence>
      <div className="flex justify-center gap-1.5 mt-4">
        {QUOTES.map((_, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === idx ? q.color : "hsl(220,30%,25%)", width: i === idx ? 16 : 6 }} />
        ))}
      </div>
      <div className="text-[10px] text-center mt-2" style={{ color: "hsl(220,15%,35%)" }}>{paused ? "Paused — tap to resume" : "Tap to pause"}</div>
    </div>
  );
}

export default function FourBurnersPage({ onBack }) {
  return (
    <div className="flex flex-col min-h-full overflow-y-auto relative" data-testid="burners-page" style={{ background: "hsl(220,40%,8%)" }}>
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b backdrop-blur" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="burners-page-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="text-base font-black" style={{ color: "hsl(210,20%,95%)" }}>The Four Burners</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>The framework behind everything Max does</div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        <section>
          <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ color: "hsl(213,100%,65%)", background: "hsla(213,100%,60%,0.1)", border: "1px solid hsla(213,100%,60%,0.2)" }}>Popularized by James Clear</div>
          <h2 className="text-2xl font-black mb-3" style={{ color: "hsl(210,20%,95%)" }}>The theory, in plain English</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,65%)" }}>
            Imagine your life as a stove with four burners. Each one is a different part of your life:
          </p>
          <div className="space-y-3 mb-5">
            {BURNERS.map((b) => (
              <div key={b.name} className="rounded-xl p-4" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                  <span className="font-black text-sm" style={{ color: b.color }}>{b.name}</span>
                  <span className="text-xs ml-auto" style={{ color: "hsl(220,15%,45%)" }}>{b.tagline}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>{b.description}</p>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
            The classic theory — popularized by <span className="font-semibold" style={{ color: "hsl(213,100%,70%)" }}>James Clear</span>, author of <em>Atomic Habits</em> — argues you have to cut one burner to succeed in another. Cut two to really win.
          </p>
        </section>

        <section className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.08), hsla(213,100%,60%,0.04))", border: "1px solid hsla(25,100%,55%,0.25)" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,65%)" }}>Where we go further</div>
          <h2 className="text-2xl font-black mb-3" style={{ color: "hsl(210,20%,95%)" }}>You don't have to cut a burner.</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "hsl(220,15%,75%)" }}>
            <em>The Business of Life: Student Edition</em> respectfully refutes that conclusion. You can run <span className="font-bold" style={{ color: "hsl(25,100%,65%)" }}>all four burners at optimum</span> — not by doing everything at once, but by:
          </p>
          <ul className="space-y-2 text-sm mb-3" style={{ color: "hsl(210,15%,85%)" }}>
            <li className="flex gap-2"><span style={{ color: "hsl(25,100%,60%)" }}>1.</span> <span><span className="font-bold">Balancing.</span> No burner goes completely cold.</span></li>
            <li className="flex gap-2"><span style={{ color: "hsl(25,100%,60%)" }}>2.</span> <span><span className="font-bold">Intermittently focusing.</span> Go hard on one burner — without neglecting the other three.</span></li>
            <li className="flex gap-2"><span style={{ color: "hsl(25,100%,60%)" }}>3.</span> <span><span className="font-bold">Building a baseline.</span> A floor under each burner you refuse to drop below, even on your worst weeks.</span></li>
          </ul>
          <p className="text-xs italic" style={{ color: "hsl(220,15%,55%)" }}>
            This is the framework Max is built on. Every conversation is about spotting which burners are hot, which are cold, and what moves the needle without a trade-off.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-1" style={{ color: "hsl(210,20%,95%)" }}>Voices that back the way we live it</h2>
          <p className="text-xs mb-4" style={{ color: "hsl(220,15%,50%)" }}>
            Nine real quotes. Each tagged with the burner it speaks to. Tap to pause.
          </p>
          <QuoteCarousel />
        </section>

        <section className="rounded-2xl p-5" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,65%)" }}>Credit where it's due</div>
          <h3 className="text-lg font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>James Clear — Author of Atomic Habits</h3>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "hsl(220,15%,65%)" }}>
            James Clear popularized the Four Burners Theory in his widely-read essay. His book <em>Atomic Habits</em> is one of the best practical guides to behavior change ever written — a recommended read for anyone running the Business of Life.
          </p>
          <div className="flex flex-col gap-2 mb-3">
            <a href="https://jamesclear.com/four-burners" target="_blank" rel="noopener noreferrer" data-testid="burners-clear-essay-link" className="text-sm font-semibold px-4 py-2.5 rounded-xl text-center" style={{ background: "hsla(213,100%,60%,0.12)", border: "1px solid hsla(213,100%,60%,0.3)", color: "hsl(213,100%,70%)" }}>
              Read the original Four Burners essay →
            </a>
            <a href="https://jamesclear.com/atomic-habits" target="_blank" rel="noopener noreferrer" data-testid="burners-atomic-habits-link" className="text-sm font-semibold px-4 py-2.5 rounded-xl text-center" style={{ background: "hsla(213,100%,60%,0.12)", border: "1px solid hsla(213,100%,60%,0.3)", color: "hsl(213,100%,70%)" }}>
              Atomic Habits — James Clear →
            </a>
          </div>
          <div className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: "hsla(142,71%,45%,0.08)", border: "1px solid hsla(142,71%,45%,0.25)", color: "hsl(142,50%,75%)" }}>
            <strong style={{ color: "hsl(142,60%,80%)" }}>No affiliate. No kickback.</strong> Adam Bond Devereau is not paid and has no affiliate relationship with James Clear or <em>Atomic Habits</em>. These links are here purely to give credit and point you toward a book worth reading.
          </div>
        </section>

        <section className="rounded-2xl p-5" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,65%)" }}>Where this framework comes from</div>
          <h3 className="text-lg font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>The Business of Life: Student Edition</h3>
          <p className="text-sm leading-relaxed mb-3" style={{ color: "hsl(220,15%,65%)" }}>
            By <span className="font-semibold" style={{ color: "hsl(25,100%,65%)" }}>Adam Bond Devereau</span>. A full playbook for running all four burners at optimum — built specifically for young people (16–23) who refuse to accept that success has to cost something else.
          </p>
          <div className="text-sm font-semibold px-4 py-2.5 rounded-xl text-center" style={{ background: "hsla(25,100%,55%,0.1)", border: "1px dashed hsla(25,100%,55%,0.3)", color: "hsl(25,100%,70%)" }} data-testid="burners-book-placeholder">
            📖 Book link coming soon
          </div>
        </section>

        <p className="text-center text-xs pt-2 pb-4" style={{ color: "hsl(220,15%,35%)" }}>
          Part of the <span style={{ color: "hsl(25,100%,60%)" }} className="font-semibold">Hidden Genius</span> project
        </p>
      </div>
    </div>
  );
}
