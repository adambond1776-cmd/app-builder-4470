import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FourBurnersSheet from "../components/FourBurnersSheet";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TRACK_EMOJI = { "College Track": "🎓", "Work Track": "💼", "Trade Track": "🔧", "Figuring It Out Track": "🔍" };
const OPENING = `What's going on in your world right now? Hit me with it — work, school, relationships, health, whatever's on your mind. We'll figure it out together.`;

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[85%]">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mb-0.5" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%) 0%, hsl(213,100%,45%) 100%)", color: "white" }}>M</div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: "hsl(220,35%,13%)", border: "1px solid hsl(220,30%,20%)" }}>
        <div className="flex gap-1.5 items-center py-0.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(213,100%,60%)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackButtons({ messageIndex, track, messageContent }) {
  const [rating, setRating] = useState(null);
  const send = async (value) => {
    if (rating) return;
    setRating(value);
    try {
      await fetch(`${API}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIndex, rating: value, track, preview: messageContent.slice(0, 100) }) });
    } catch {}
  };
  if (rating) return <div className="mt-1 ml-10 text-xs" style={{ color: "hsl(220,15%,40%)" }}>{rating === "up" ? "Glad that landed ✓" : "Got it, I'll do better ✓"}</div>;
  return (
    <div className="mt-1.5 ml-10 flex gap-2">
      <button onClick={() => send("up")} data-testid={`feedback-up-${messageIndex}`} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ color: "hsl(220,15%,45%)", background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,20%)" }}>👍 <span>Helpful</span></button>
      <button onClick={() => send("down")} data-testid={`feedback-down-${messageIndex}`} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ color: "hsl(220,15%,45%)", background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,20%)" }}>👎 <span>Miss</span></button>
    </div>
  );
}

export default function ChatScreen({ track, onChangeTrack, onBack }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: OPENING }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showBurners, setShowBurners] = useState(false);
  const [sessionId] = useState(() => `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    const newCount = exchangeCount + 1;
    setExchangeCount(newCount);
    if (newCount === 10) setShowSavePrompt(true);
    try {
      const res = await fetch(`${API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: updated, track, sessionId }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Hmm, hit a snag: ${err.message}. Try again in a sec.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const assistants = messages.filter(m => m.role === "assistant");

  return (
    <div className="flex flex-col h-full" data-testid="chat-screen">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsl(220,35%,9%)" }}>
        {onBack && (
          <button onClick={onBack} data-testid="chat-back-btn" className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsl(220,30%,16%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%) 0%, hsl(213,100%,45%) 100%)", color: "white" }}>M</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: "hsl(210,20%,95%)" }}>Max</div>
          <div className="text-xs flex items-center gap-1.5" style={{ color: "hsl(213,100%,60%)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "hsl(142,71%,45%)" }} />
            {TRACK_EMOJI[track] || "🎯"} {track}
          </div>
        </div>
        <button onClick={() => setShowBurners(true)} data-testid="chat-burners-btn" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ color: "hsl(213,100%,65%)", background: "hsla(213,100%,60%,0.1)", border: "1px solid hsla(213,100%,60%,0.2)" }}>4B</button>
        <button onClick={onChangeTrack} data-testid="chat-change-track-btn" className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "hsl(220,15%,55%)", background: "hsl(220,30%,16%)", border: "1px solid hsl(220,30%,22%)" }}>Change</button>
      </div>

      <AnimatePresence>
        {showSavePrompt && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex-shrink-0 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: "hsla(25,100%,55%,0.12)", borderBottom: "1px solid hsla(25,100%,55%,0.25)" }}>
              <div className="flex-1 text-xs leading-relaxed" style={{ color: "hsl(25,100%,70%)" }}>
                Your journey is worth documenting. Create your free account at{" "}
                <a href="https://HiddenGeniusInvitational.com" target="_blank" rel="noopener noreferrer" className="font-bold underline" style={{ color: "hsl(25,100%,75%)" }}>HiddenGeniusInvitational.com</a>
              </div>
              <button onClick={() => setShowSavePrompt(false)} className="text-xs px-2 py-1 rounded" style={{ color: "hsl(25,100%,60%)" }}>✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" data-testid="chat-messages">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const aIdx = msg.role === "assistant" ? assistants.indexOf(msg) : -1;
            const showFb = msg.role === "assistant" && aIdx > 0 && !isLoading;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pb-2">
                <div className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mb-0.5" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%) 0%, hsl(213,100%,45%) 100%)", color: "white" }}>M</div>}
                  <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"}`} style={msg.role === "user" ? { background: "linear-gradient(135deg, hsl(213,100%,52%) 0%, hsl(213,100%,42%) 100%)", color: "white" } : { background: "hsl(220,35%,13%)", border: "1px solid hsl(220,30%,20%)", color: "hsl(210,15%,88%)" }}>{msg.content}</div>
                </div>
                {showFb && <FeedbackButtons messageIndex={aIdx} track={track} messageContent={msg.content} />}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isLoading && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><TypingIndicator /></motion.div>}
        <div ref={endRef} />
      </div>

      <div className="flex-shrink-0 px-4 py-4 border-t" style={{ borderColor: "hsl(220,30%,16%)", background: "hsl(220,35%,9%)" }}>
        <div className="flex items-end gap-3">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} placeholder="Message Max..." rows={1} data-testid="chat-input" className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none" style={{ background: "hsl(220,30%,15%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)", maxHeight: "120px", lineHeight: "1.5" }} />
          <button onClick={sendMessage} disabled={!input.trim() || isLoading} data-testid="chat-send-btn" className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40" style={{ background: input.trim() && !isLoading ? "linear-gradient(135deg, hsl(213,100%,58%) 0%, hsl(213,100%,48%) 100%)" : "hsl(220,30%,20%)" }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "hsl(220,15%,35%)" }}>Max can make mistakes. Think for yourself.</p>
      </div>

      <FourBurnersSheet open={showBurners} onClose={() => setShowBurners(false)} />
    </div>
  );
}
