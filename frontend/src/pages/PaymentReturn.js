import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getCheckoutStatus } from "../lib/stripe";

// Poll with exponential backoff — matches the emergentintegrations playbook recommendation.
// Max ~20s of polling total before surfacing a fallback state.
const POLL_SCHEDULE_MS = [0, 1200, 1500, 2000, 2500, 3000, 4000, 6000]; // ~20s total
const MAX_POLLS = POLL_SCHEDULE_MS.length;

const TARGET_DESTINATIONS = {
  max: { label: "Back to Max", href: "/" },
  maya: { label: "Back to Maya", href: "/" },
  miles: { label: "Back to Miles Academy", href: "/" },
  family: { label: "See my Founding Family slot", href: "/" },
  spotlight: { label: "See live pitches", href: "/pitches" },
  anchor: { label: "See live pitches", href: "/pitches" },
};

function labelForProduct(product_id) {
  const map = {
    booster_max_30: "Max Booster Pack (+200 msgs)",
    booster_maya_30: "Maya Booster Pack (+200 msgs)",
    booster_miles_30: "Miles Booster Pack (+200 msgs)",
    founding_family_lock: "Founding Parent — Family Plan",
    founding_miles_lock: "Founding Miles Academy",
    sponsor_spotlight: "Max Pitch Spotlight Sponsor",
    sponsor_anchor: "Max Pitch Anchor Sponsor",
  };
  return map[product_id] || product_id;
}

export default function PaymentReturn() {
  const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const session_id = qs?.get("session_id");
  const cancelled = qs?.get("cancelled") === "1";
  const [state, setState] = useState(cancelled ? "cancelled" : session_id ? "polling" : "error");
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);
  const pollCountRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!session_id || cancelled) return;
    cancelledRef.current = false;

    const poll = async () => {
      if (cancelledRef.current) return;
      if (pollCountRef.current >= MAX_POLLS) {
        setState("timeout");
        return;
      }
      try {
        const s = await getCheckoutStatus(session_id);
        setStatus(s);
        if (s.payment_status === "paid") {
          setState("paid");
          return;
        }
        if (s.status === "expired") {
          setState("expired");
          return;
        }
      } catch (e) {
        setErr(e.message || "Status check failed");
        // 404 means the session isn't on our records — surface error after 2 attempts
        if (e.status === 404 && pollCountRef.current >= 1) {
          setState("error");
          return;
        }
        // keep trying until MAX_POLLS — network blips shouldn't give up
      }
      const delay = POLL_SCHEDULE_MS[pollCountRef.current] ?? 4000;
      pollCountRef.current += 1;
      setTimeout(poll, delay);
    };
    poll();
    return () => {
      cancelledRef.current = true;
    };
  }, [session_id, cancelled]);

  const backHref = status?.target ? TARGET_DESTINATIONS[status.target]?.href || "/" : "/";
  const backLabel = status?.target ? TARGET_DESTINATIONS[status.target]?.label || "Back to app" : "Back to app";

  return (
    <div
      className="flex flex-col min-h-full items-center justify-center px-6 py-10"
      style={{ background: "hsl(220,40%,8%)", color: "hsl(210,20%,92%)" }}
      data-testid="payment-return-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-3xl text-center"
        style={{
          background: "hsl(220,35%,11%)",
          border: "1px solid hsl(220,30%,22%)",
        }}
      >
        {state === "polling" && (
          <div data-testid="payment-polling">
            <div className="flex justify-center gap-1.5 mb-5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "hsl(213,100%,65%)" }}
                />
              ))}
            </div>
            <h1 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Confirming your payment…
            </h1>
            <p className="text-sm" style={{ color: "hsl(220,15%,65%)" }}>
              Stripe's handshake is wrapping up. This usually takes a few seconds.
            </p>
          </div>
        )}

        {state === "paid" && (
          <div data-testid="payment-success">
            <div className="text-6xl mb-3">🎉</div>
            <h1 className="text-2xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              You're in.
            </h1>
            {status?.product_id && (
              <div
                className="inline-block px-4 py-2 rounded-lg my-2 text-sm font-semibold"
                style={{
                  background: "hsla(142,71%,45%,0.15)",
                  color: "hsl(142,71%,70%)",
                  border: "1px solid hsla(142,71%,45%,0.3)",
                }}
              >
                {labelForProduct(status.product_id)}
              </div>
            )}
            {status?.amount_total && (
              <div className="text-sm mt-2" style={{ color: "hsl(220,15%,65%)" }}>
                Paid: ${(status.amount_total / 100).toFixed(2)}{" "}
                <span className="uppercase">{status.currency}</span>
              </div>
            )}
            <p className="text-sm mt-4 mb-6 leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
              {status?.kind === "booster" && "Your extra messages are live on your account."}
              {status?.kind === "founding_lock" && "Your founding rate is locked for 1 year. You'll get a heads-up email before your year ends."}
              {status?.kind === "sponsor" && "Adam is pinging you within 24 hours with your placement brief + round kickoff call."}
            </p>
            <a
              href={backHref}
              data-testid="payment-success-back-btn"
              className="inline-block w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,45%))",
                color: "white",
              }}
            >
              {backLabel} →
            </a>
          </div>
        )}

        {state === "cancelled" && (
          <div data-testid="payment-cancelled">
            <div className="text-5xl mb-3">↩️</div>
            <h1 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Checkout cancelled
            </h1>
            <p className="text-sm mb-5" style={{ color: "hsl(220,15%,65%)" }}>
              No worries — you weren't charged. You can come back anytime.
            </p>
            <a
              href="/"
              className="inline-block w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: "hsl(220,30%,15%)", color: "hsl(210,20%,85%)", border: "1px solid hsl(220,30%,22%)" }}
            >
              Back to app
            </a>
          </div>
        )}

        {state === "expired" && (
          <div data-testid="payment-expired">
            <div className="text-5xl mb-3">⏰</div>
            <h1 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Session expired
            </h1>
            <p className="text-sm mb-5" style={{ color: "hsl(220,15%,65%)" }}>
              Stripe's checkout window timed out. Start over whenever you're ready — nothing was charged.
            </p>
            <a
              href="/"
              className="inline-block w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: "hsl(220,30%,15%)", color: "hsl(210,20%,85%)" }}
            >
              Back to app
            </a>
          </div>
        )}

        {state === "timeout" && (
          <div data-testid="payment-timeout">
            <div className="text-5xl mb-3">⏳</div>
            <h1 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Still processing…
            </h1>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>
              Stripe hasn't confirmed yet — this can happen with certain payment methods. You'll get an email when
              it settles, and your perks will appear on your account shortly after.
            </p>
            <a
              href="/"
              className="inline-block w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: "hsl(220,30%,15%)", color: "hsl(210,20%,85%)" }}
            >
              Back to app
            </a>
          </div>
        )}

        {state === "error" && (
          <div data-testid="payment-error">
            <div className="text-5xl mb-3">⚠️</div>
            <h1 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Missing session
            </h1>
            <p className="text-sm" style={{ color: "hsl(220,15%,65%)" }}>
              {err || "We couldn't find a checkout session on this URL."}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
