import { useEffect, useRef, useState } from "react";
import { apiJSON } from "../lib/api";

export default function AuthCallback({ onAuthed }) {
  const processed = useRef(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("starting"); // starting | parsing | exchanging | settling

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      try {
        setPhase("parsing");
        const hash = window.location.hash || "";
        const match = hash.match(/session_id=([^&]+)/);
        if (!match) {
          throw new Error("No session_id was returned by the auth provider. The redirect may have been blocked — try again, or use a different browser.");
        }
        const sessionId = decodeURIComponent(match[1]);

        setPhase("exchanging");
        const data = await apiJSON("/auth/session", {
          method: "POST",
          headers: { "X-Session-ID": sessionId },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!data || !data.user) {
          throw new Error("Server returned an empty user — please try signing in again.");
        }

        setPhase("settling");
        // Clear the hash BEFORE setting state so React doesn't re-trigger this component
        window.history.replaceState(null, "", window.location.pathname);

        // Defer the onAuthed call so React can flush the hash-clear first.
        // Wrapping in a microtask avoids the rare "object cannot be cloned"
        // error some browsers throw when state updates happen mid-navigation.
        setTimeout(() => {
          try {
            onAuthed(data.user);
          } catch (innerErr) {
            console.error("[AuthCallback] onAuthed failed:", innerErr);
            setError(innerErr?.message || String(innerErr) || "Failed to apply session — try again.");
          }
        }, 0);
      } catch (e) {
        console.error("[AuthCallback] Sign-in failed:", e);
        setError(e?.message || String(e) || "Unknown error during sign-in.");
      }
    };

    run();
  }, [onAuthed]);

  const tryAgain = () => {
    // Clear stuck hash + reload to a clean welcome state
    try {
      window.history.replaceState(null, "", "/");
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  return (
    <div
      className="flex items-center justify-center h-full px-6"
      style={{ color: "hsl(210,20%,85%)" }}
      data-testid="auth-callback"
    >
      <div className="text-center max-w-sm w-full">
        {!error ? (
          <>
            <div className="flex justify-center gap-1.5 mb-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{
                    background: "hsl(213,100%,65%)",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <div className="text-sm" data-testid="auth-callback-status">
              {phase === "parsing" && "Reading sign-in token…"}
              {phase === "exchanging" && "Verifying with the server…"}
              {phase === "settling" && "You're in. Loading your space…"}
              {phase === "starting" && "Signing you in…"}
            </div>
          </>
        ) : (
          <div data-testid="auth-callback-error">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="font-black text-base mb-2" style={{ color: "hsl(0,75%,75%)" }}>
              Sign-in hit a snag
            </div>
            <div
              className="text-xs leading-relaxed mb-5 px-3 py-3 rounded-xl text-left"
              style={{
                background: "hsla(0,75%,55%,0.08)",
                border: "1px solid hsla(0,75%,55%,0.3)",
                color: "hsl(0,75%,82%)",
                wordBreak: "break-word",
              }}
            >
              {error}
            </div>
            <button
              onClick={tryAgain}
              data-testid="auth-callback-retry-btn"
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,45%))",
                color: "white",
              }}
            >
              Try again →
            </button>
            <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "hsl(220,15%,55%)" }}>
              If it keeps failing — try a different browser, disable browser extensions, or open the site in an
              incognito window. Right now Google is the only sign-in option (Apple + email coming later).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
