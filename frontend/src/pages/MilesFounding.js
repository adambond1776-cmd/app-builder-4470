import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function MilesFounding({ onBack }) {
  const [status, setStatus] = useState(null);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiJSON("/miles/founding-status").then(setStatus).catch(() => {});
  }, []);

  const signup = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await apiJSON("/miles/founding-signup", {
        method: "POST",
        body: JSON.stringify({ agrees_to_founding_terms: true }),
      });
      const s = await apiJSON("/miles/founding-status");
      setStatus(s);
    } catch (e) {
      setErr(e.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  if (!status)
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>
        Loading…
      </div>
    );

  const brandShort = status.brand_short || "Miles";

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="miles-founding-screen">
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}
      >
        <button
          onClick={onBack}
          data-testid="miles-founding-back-btn"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>
          Founding {brandShort}
        </div>
      </div>

      <div className="px-5 py-6 space-y-5">
        {status.signed_up ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
            data-testid="miles-founding-signed-up-state"
          >
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-2xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              You're Founding {brandShort} #{status.signup?.slot_number}.
            </h2>
            <div
              className="inline-block px-4 py-2 rounded-lg my-3"
              style={{
                background: "hsla(160,70%,45%,0.15)",
                color: "hsl(160,70%,70%)",
                border: "1px solid hsla(160,70%,45%,0.3)",
              }}
            >
              ${status.founding_price}/mo locked for 1 year
            </div>
            <p className="text-sm max-w-xs mx-auto" style={{ color: "hsl(220,15%,65%)" }}>
              When {status.brand_name || "Miles Academy"} launches at ${status.launch_price}/mo, your rate stays
              locked. We'll email you to activate — no card required right now.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, hsla(160,70%,45%,0.1), hsla(35,100%,60%,0.04))",
                border: "1px solid hsla(160,70%,45%,0.35)",
              }}
            >
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "hsl(160,70%,65%)" }}
              >
                Founding {brandShort} offer
              </div>
              <div className="flex items-baseline gap-3 mb-3">
                <div className="text-3xl font-black" style={{ color: "hsl(210,20%,95%)" }}>
                  ${status.founding_price}
                </div>
                <div className="text-xs line-through" style={{ color: "hsl(220,15%,45%)" }}>
                  ${status.launch_price}/mo at launch
                </div>
              </div>
              <div className="text-sm leading-relaxed mb-3" style={{ color: "hsl(210,20%,85%)" }}>
                Lock in 50% off for a year as one of the first {status.cap} families.{" "}
                <strong>{status.spots_left} spots left.</strong>
              </div>
              <ul className="text-xs space-y-1.5" style={{ color: "hsl(220,15%,65%)" }}>
                <li>✓ Unlimited sessions with Ivy, Vance & Drake</li>
                <li>✓ All subjects: math, writing, test prep, college apps + more</li>
                <li>✓ Priority vote on the full curriculum planner & tutor marketplace</li>
                <li>✓ Direct line to Adam for feature requests</li>
                <li>✓ First access to live tutor sessions when they launch</li>
                <li>✓ Rate locked for 1 year minimum</li>
              </ul>
            </motion.div>

            <div
              className="p-3 rounded-xl text-xs leading-relaxed"
              style={{
                background: "hsla(142,71%,45%,0.08)",
                border: "1px solid hsla(142,71%,45%,0.25)",
                color: "hsl(142,50%,70%)",
              }}
            >
              <strong>No charge now.</strong> Just locking in your spot. When {brandShort} launches, we'll email you
              to activate with a card.
            </div>

            <label
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}
            >
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                data-testid="miles-founding-agree-checkbox"
                className="mt-0.5"
              />
              <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
                I understand this is a waitlist. When {brandShort} launches, I'll have the first chance to activate at the
                founding rate. No commitment to pay if I change my mind.
              </div>
            </label>

            {err && (
              <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>
                {err}
              </div>
            )}

            <button
              onClick={signup}
              disabled={!agree || submitting}
              data-testid="miles-founding-lock-btn"
              className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(160,70%,35%))",
                color: "white",
                boxShadow: agree ? "0 0 24px hsla(160,70%,45%,0.3)" : "none",
              }}
            >
              {submitting ? "Locking…" : `Lock in $${status.founding_price}/mo`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
