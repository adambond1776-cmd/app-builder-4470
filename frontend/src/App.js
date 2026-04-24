import { useEffect, useState } from "react";
import HiddenGeniusOnboarding from "./pages/HiddenGeniusOnboarding";
import WelcomeScreen from "./pages/WelcomeScreen";
import TrackScreen from "./pages/TrackScreen";
import ChatScreen from "./pages/ChatScreen";
import FourBurnersPage from "./pages/FourBurnersPage";
import AuthCallback from "./pages/AuthCallback";
import SignupGate from "./pages/SignupGate";
import HomeScreen from "./pages/HomeScreen";
import MemoryScreen from "./pages/MemoryScreen";
import FoundingApply from "./pages/FoundingApply";
import { apiJSON } from "./lib/api";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);      // null=loading, false=not auth, object=auth
  const [screen, setScreen] = useState(null);
  const [prevScreen, setPrevScreen] = useState("home");
  const [track, setTrack] = useState("");

  // If hash has session_id, handle auth callback (synchronous check in render)
  const hasSessionInUrl = typeof window !== "undefined" && window.location.hash?.includes("session_id=");

  useEffect(() => {
    if (hasSessionInUrl) return; // let AuthCallback handle
    const check = async () => {
      try {
        const u = await apiJSON("/auth/me");
        setUser(u);
        setTrack(u.current_track || "");
      } catch {
        setUser(false);
      }
    };
    check();
  }, [hasSessionInUrl]);

  useEffect(() => {
    if (user === null || user === false) return;
    // Logged-in routing
    if (!user.age_confirmed || !user.beta_consent) { setScreen("signup_gate"); return; }
    if (screen === null || screen === "auth_callback") setScreen("home");
  }, [user]);   // eslint-disable-line

  useEffect(() => {
    if (user !== false) return;
    // Not logged in routing
    try {
      if (localStorage.getItem("hg_onboarded") === "true") setScreen("welcome");
      else setScreen("onboarding");
    } catch { setScreen("onboarding"); }
  }, [user]);

  const handleAuthed = async (u) => {
    setUser(u);
    setTrack(u.current_track || "");
  };

  const handleLogout = async () => {
    try { await apiJSON("/auth/logout", { method: "POST" }); } catch {}
    setUser(false);
    setScreen("welcome");
  };

  const startLogin = () => {
    const redirectUrl = window.location.origin + "/";
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const openBurners = (from) => { setPrevScreen(from); setScreen("burners"); };

  const refreshUser = async () => {
    try { const u = await apiJSON("/auth/me"); setUser(u); setTrack(u.current_track || ""); } catch {}
  };

  let body;
  if (hasSessionInUrl && (user === null || user === false)) {
    body = <AuthCallback onAuthed={handleAuthed} />;
  } else if (user === null) {
    body = <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>Loading…</div>;
  } else if (user === false) {
    if (screen === "onboarding") body = <HiddenGeniusOnboarding onContinue={() => { try { localStorage.setItem("hg_onboarded", "true"); } catch {}; setScreen("welcome"); }} />;
    else if (screen === "burners") body = <FourBurnersPage onBack={() => setScreen("welcome")} />;
    else body = <WelcomeScreen onStart={startLogin} onBack={() => setScreen("onboarding")} onOpenBurners={() => openBurners("welcome")} isAuthed={false} />;
  } else {
    // Authed user
    if (screen === "signup_gate") body = <SignupGate user={user} onComplete={async () => { await refreshUser(); setScreen("home"); }} onBlocked={handleLogout} />;
    else if (screen === "home") body = <HomeScreen user={user} onContinueChat={() => setScreen(user.current_track ? "chat" : "track")} onOpenMemory={() => setScreen("memory")} onOpenBurners={() => openBurners("home")} onPickTrack={() => setScreen("track")} onApplyFounding={() => setScreen("founding")} onLogout={handleLogout} />;
    else if (screen === "track") body = <TrackScreen onSelectTrack={(t) => { setTrack(t); setUser({ ...user, current_track: t }); setScreen("chat"); }} onBack={() => setScreen("home")} />;
    else if (screen === "chat") body = <ChatScreen track={track} onChangeTrack={() => setScreen("track")} onBack={() => setScreen("home")} onOpenBurners={() => openBurners("chat")} onUserUpdated={refreshUser} />;
    else if (screen === "memory") body = <MemoryScreen onBack={() => setScreen("home")} onSaved={(m) => setUser({ ...user, memory_card: m })} />;
    else if (screen === "founding") body = <FoundingApply onBack={() => setScreen("home")} onSubmitted={refreshUser} />;
    else if (screen === "burners") body = <FourBurnersPage onBack={() => setScreen(prevScreen)} />;
    else body = <HomeScreen user={user} onContinueChat={() => setScreen("chat")} onOpenMemory={() => setScreen("memory")} onOpenBurners={() => openBurners("home")} onPickTrack={() => setScreen("track")} onApplyFounding={() => setScreen("founding")} onLogout={handleLogout} />;
  }

  return (
    <div
      className="flex flex-col h-screen w-full max-w-md mx-auto overflow-hidden"
      style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      data-testid="app-root"
    >
      {body}
    </div>
  );
}
