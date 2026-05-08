import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiJSON } from "../lib/api";
import { startCheckout } from "../lib/stripe";

const MAYA_OPENER =
  "Hey. Maya here — your coach for running family life without losing yourself in it. Tell me the real thing on your mind today: what's feeling heaviest, which kid you're wrestling with, or where you personally feel stuck. We don't do surface-level here.";

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[85%]" data-testid="maya-typing">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mb-0.5"
        style={{ background: "linear-gradient(135deg, hsl(280,75%,60%) 0%, hsl(280,75%,48%) 100%)", color: "white" }}
      >
        M
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "hsl(220,35%,13%)", border: "1px solid hsl(220,30%,20%)" }}
      >
        <div className="flex gap-1.5 items-center py-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "hsl(280,75%,65%)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function UpgradeWall({ onFounding, onBack }) {
  const [boosting, setBoosting] = useState(false);
  const buyBooster = async () => {
    if (boosting) return;
    setBoosting(true);
    try { await startCheckout("booster_maya_30"); } catch { setBoosting(false); }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
      data-testid="maya-upgrade-wall"
    >
      <div className="text-5xl mb-3">🔒</div>
      <div className="font-black text-xl mb-2" style={{ color: "hsl(210,20%,95%)" }}>
        You've used today's 30 messages
      </div>
      <div className="text-sm mb-8 leading-relaxed" style={{ color: "hsl(220,15%,62%)" }}>
        Resets at midnight. Or — if Maya is already part of your rhythm — pick up another 200 messages, or lock in
        the Founding Parent rate before launch.
      </div>
      <button
        onClick={buyBooster}
        disabled={boosting}
        data-testid="maya-upgrade-booster-btn"
        className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-sm mb-3 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,45%))",
          color: "white",
        }}
      >
        {boosting ? "Opening checkout…" : "+200 messages · $2.99 →"}
      </button>
      <button
        onClick={onFounding}
        data-testid="maya-upgrade-founding-btn"
        className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-sm mb-3"
        style={{
          background: "linear-gradient(135deg, hsl(25,100%,55%), hsl(25,100%,45%))",
          color: "white",
        }}
      >
        Lock Founding Parent · $14.50/mo →
      </button>
      <div className="text-[11px] mb-6" style={{ color: "hsl(220,15%,50%)" }}>
        50% off launch price · First 100 parents only · Locked for a year
      </div>
      <button
        onClick={onBack}
        data-testid="maya-upgrade-back-btn"
        className="text-xs px-4 py-2 rounded-lg"
        style={{ color: "hsl(220,15%,60%)", background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)" }}
      >
        Come back tomorrow
      </button>
    </motion.div>
  );
}

export default function ParentChatScreen({ onBack, onOpenFounding }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: MAYA_OPENER }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [limitState, setLimitState] = useState("normal");
  const [remaining, setRemaining] = useState(null);
  const [nudge, setNudge] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await apiJSON("/family/chat/history?limit=40");
        if (h.messages?.length) {
          setMessages([{ role: "assistant", content: MAYA_OPENER }, ...h.messages]);
        }
        setRemaining(h.remaining_today);
        if (h.remaining_today === 0) setLimitState("exhausted");
        else if (h.remaining_today <= 5) setLimitState("final_five");
        else if (h.remaining_today <= 10) setLimitState("approaching");
      } catch {
        // no history is fine
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || limitState === "exhausted") return;
    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    try {
      const payload = messages
        .concat([userMsg])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(1) // drop opener (it's a UI greeting, not a Maya turn worth feeding back)
        .map((m) => ({ role: m.role, content: m.content }));
      const data = await apiJSON("/family/chat", {
        method: "POST",
        body: JSON.stringify({ messages: payload }),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      setRemaining(data.remaining_today);
      setLimitState(data.limit_state);
      setNudge(data.nudge || null);
    } catch (err) {
      if (err.status === 429) {
        setLimitState("exhausted");
        setRemaining(0);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Hmm, hit a snag: ${err.message}. Try again.` },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="parent-chat-screen">
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(220,30%,18%)", background: "hsl(220,35%,9%)" }}
      >
        <button
          onClick={onBack}
          data-testid="maya-back-btn"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(220,30%,16%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
          style={{ background: "linear-gradient(135deg, hsl(280,75%,60%) 0%, hsl(280,75%,48%) 100%)", color: "white" }}
        >
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: "hsl(210,20%,95%)" }}>
            Maya
          </div>
          <div className="text-xs flex items-center gap-1.5" style={{ color: "hsl(280,75%,70%)" }}>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "hsl(142,71%,45%)" }}
            />
            Parent Coach · Family Edition
          </div>
        </div>
        {remaining !== null && (
          <div
            className="text-[10px] px-2 py-1 rounded-full font-semibold"
            data-testid="maya-remaining-chip"
            style={{
              color:
                limitState === "final_five"
                  ? "hsl(25,100%,70%)"
                  : limitState === "approaching"
                  ? "hsl(48,95%,65%)"
                  : "hsl(220,15%,60%)",
              background: "hsl(220,30%,14%)",
              border: "1px solid hsl(220,30%,22%)",
            }}
          >
            {remaining}/30
          </div>
        )}
      </div>

      <AnimatePresence>
        {(limitState === "approaching" || limitState === "final_five") && nudge && (
          <motion.div
            key={limitState}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden"
            data-testid="maya-nudge-banner"
          >
            <button
              onClick={limitState === "final_five" ? onOpenFounding : undefined}
              className="w-full px-4 py-2.5 text-center text-xs flex items-center justify-center gap-2"
              style={{
                background:
                  limitState === "final_five"
                    ? "linear-gradient(90deg, hsla(25,100%,55%,0.15), hsla(280,75%,60%,0.12))"
                    : "hsla(48,95%,55%,0.1)",
                color: limitState === "final_five" ? "hsl(25,100%,75%)" : "hsl(48,95%,70%)",
                borderBottom:
                  limitState === "final_five"
                    ? "1px solid hsla(25,100%,55%,0.3)"
                    : "1px solid hsla(48,95%,55%,0.25)",
                cursor: limitState === "final_five" ? "pointer" : "default",
              }}
            >
              <span>{nudge}</span>
              {limitState === "final_five" && <span style={{ fontWeight: 700 }}>→</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {limitState === "exhausted" ? (
        <UpgradeWall onFounding={onOpenFounding} onBack={onBack} />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" data-testid="maya-messages">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="pb-2"
                >
                  <div
                    className={`flex items-end gap-2 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mb-0.5"
                        style={{
                          background: "linear-gradient(135deg, hsl(280,75%,60%) 0%, hsl(280,75%,48%) 100%)",
                          color: "white",
                        }}
                      >
                        M
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user" ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"
                      }`}
                      style={
                        msg.role === "user"
                          ? {
                              background:
                                "linear-gradient(135deg, hsl(280,75%,55%) 0%, hsl(280,75%,45%) 100%)",
                              color: "white",
                            }
                          : {
                              background: "hsl(220,35%,13%)",
                              border: "1px solid hsl(220,30%,20%)",
                              color: "hsl(210,15%,88%)",
                            }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <TypingIndicator />
              </motion.div>
            )}
            <div ref={endRef} />
          </div>

          <div
            className="flex-shrink-0 px-4 py-4 border-t"
            style={{ borderColor: "hsl(220,30%,16%)", background: "hsl(220,35%,9%)" }}
          >
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Message Maya..."
                rows={1}
                data-testid="maya-input"
                disabled={!historyLoaded}
                className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "hsl(220,30%,15%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                  maxHeight: "120px",
                  lineHeight: "1.5",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                data-testid="maya-send-btn"
                className="w-11 h-11 rounded-2xl flex items-center justify-center disabled:opacity-40"
                style={{
                  background:
                    input.trim() && !isLoading
                      ? "linear-gradient(135deg, hsl(280,75%,58%) 0%, hsl(280,75%,48%) 100%)"
                      : "hsl(220,30%,20%)",
                }}
              >
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs mt-2" style={{ color: "hsl(220,15%,35%)" }}>
              Maya can make mistakes. Trust your gut with your own family.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
