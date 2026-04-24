import { useEffect, useRef, useState } from "react";
import { apiJSON } from "../lib/api";

export default function AuthCallback({ onAuthed }) {
  const processed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      const hash = window.location.hash;
      const match = hash.match(/session_id=([^&]+)/);
      if (!match) { setError("No session_id in URL"); return; }
      const sessionId = decodeURIComponent(match[1]);
      try {
        const data = await apiJSON("/auth/session", {
          method: "POST",
          headers: { "X-Session-ID": sessionId },
          body: JSON.stringify({ session_id: sessionId }),
        });
        // Clear the hash so it's not processed again
        window.history.replaceState(null, "", window.location.pathname);
        onAuthed(data.user);
      } catch (e) {
        setError(e.message);
      }
    };
    run();
  }, [onAuthed]);

  return (
    <div className="flex items-center justify-center h-full" style={{ color: "hsl(210,20%,85%)" }}>
      <div className="text-center" data-testid="auth-callback">
        <div className="animate-pulse text-sm">Signing you in…</div>
        {error && <div className="text-xs mt-3" style={{ color: "hsl(0,70%,60%)" }}>Error: {error}</div>}
      </div>
    </div>
  );
}
