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
import MaxPitchSubmit from "./pages/MaxPitchSubmit";
import PitchPublicPage from "./pages/PitchPublicPage";
import JudgeView from "./pages/JudgeView";
import RoleSelect from "./pages/RoleSelect";
import ParentDashboard from "./pages/ParentDashboard";
import ParentChatScreen from "./pages/ParentChatScreen";
import ParentInvite from "./pages/ParentInvite";
import ParentPolls from "./pages/ParentPolls";
import ParentIdeas from "./pages/ParentIdeas";
import ParentFounding from "./pages/ParentFounding";
import KidAcceptInvite from "./pages/KidAcceptInvite";
import MilesIntro from "./pages/MilesIntro";
import MilesChatScreen from "./pages/MilesChatScreen";
import MilesIdeas from "./pages/MilesIdeas";
import MilesPolls from "./pages/MilesPolls";
import MilesFounding from "./pages/MilesFounding";
import GeniusStackPage from "./pages/GeniusStackPage";
import PitchesHubPage from "./pages/PitchesHubPage";
import SponsorPage from "./pages/SponsorPage";
import PaymentReturn from "./pages/PaymentReturn";
import PricingPage from "./pages/PricingPage";
import { apiJSON } from "./lib/api";
import "./App.css";

function parsePath() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const pitchMatch = pathname.match(/^\/pitch\/([a-zA-Z0-9-]+)$/);
  if (pitchMatch) return { type: "pitch_public", slug: pitchMatch[1] };
  if (pathname === "/pitches") return { type: "pitches_hub" };
  if (pathname === "/sponsor") return { type: "sponsor" };
  if (pathname === "/pricing") return { type: "pricing" };
  if (pathname === "/payment/return") return { type: "payment_return" };
  if (pathname === "/judge") {
    const token = params.get("token");
    if (token) return { type: "judge", token };
  }
  return { type: "default" };
}

export default function App() {
  const [route] = useState(parsePath);  // captured once at mount
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState(null);
  const [prevScreen, setPrevScreen] = useState("home");
  const [track, setTrack] = useState("");
  const [milesCfg, setMilesCfg] = useState(null);

  const hasSessionInUrl = typeof window !== "undefined" && window.location.hash?.includes("session_id=");

  useEffect(() => {
    apiJSON("/miles/config").then(setMilesCfg).catch(() => {});
  }, []);

  useEffect(() => {
    if (route.type !== "default") return;  // public pages don't need auth check
    if (hasSessionInUrl) return;
    (async () => {
      try {
        const u = await apiJSON("/auth/me");
        setUser(u);
        setTrack(u.current_track || "");
      } catch { setUser(false); }
    })();
  }, [hasSessionInUrl, route.type]);

  useEffect(() => {
    if (user === null || user === false) return;
    if (!user.age_confirmed || !user.beta_consent) { setScreen("signup_gate"); return; }
    if (screen === null || screen === "auth_callback") setScreen("home");
  }, [user]); // eslint-disable-line

  useEffect(() => {
    if (user !== false) return;
    try { setScreen(localStorage.getItem("hg_onboarded") === "true" ? "welcome" : "onboarding"); }
    catch { setScreen("onboarding"); }
  }, [user]);

  // --- Public routes short-circuit auth entirely ---
  if (route.type === "pitch_public") {
    return (
      <div className="flex flex-col h-screen w-full max-w-md mx-auto overflow-hidden" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
        <PitchPublicPage slug={route.slug} />
      </div>
    );
  }
  if (route.type === "pitches_hub") {
    return (
      <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
        <PitchesHubPage />
      </div>
    );
  }
  if (route.type === "sponsor") {
    return (
      <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
        <SponsorPage />
      </div>
    );
  }
  if (route.type === "payment_return") {
    return (
      <div className="flex flex-col min-h-screen w-full max-w-md mx-auto" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
        <PaymentReturn />
      </div>
    );
  }
  if (route.type === "pricing") {
    return (
      <div className="flex flex-col min-h-screen w-full max-w-2xl mx-auto" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
        <PricingPage onBack={null} />
      </div>
    );
  }
  if (route.type === "judge") {
    return (
      <div className="flex flex-col h-screen w-full max-w-md mx-auto overflow-hidden" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
        <JudgeView token={route.token} />
      </div>
    );
  }

  const handleAuthed = async (u) => { setUser(u); setTrack(u.current_track || ""); };
  const handleLogout = async () => { try { await apiJSON("/auth/logout", { method: "POST" }); } catch {} setUser(false); setScreen("welcome"); };
  const startLogin = () => {
    const redirectUrl = window.location.origin + "/";
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  const openBurners = (from) => { setPrevScreen(from); setScreen("burners"); };
  const refreshUser = async () => { try { const u = await apiJSON("/auth/me"); setUser(u); setTrack(u.current_track || ""); } catch {} };

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
    if (screen === "signup_gate") body = <SignupGate user={user} onComplete={async () => { await refreshUser(); setScreen(user.role === "parent" ? "parent_home" : "role_select"); }} onBlocked={handleLogout} />;
    else if (screen === "role_select" || (user.role == null && screen === "home")) body = <RoleSelect user={user} onSelected={async (r) => { await refreshUser(); setScreen(r === "parent" ? "parent_home" : "home"); }} />;
    else if (user.role === "parent" && ["parent_home", "home"].includes(screen)) body = <ParentDashboard user={user} onLogout={handleLogout} onOpenPolls={() => setScreen("parent_polls")} onOpenIdeas={() => setScreen("parent_ideas")} onOpenFounding={() => setScreen("parent_founding")} onOpenInvite={() => setScreen("parent_invite")} onOpenMaya={() => setScreen("parent_chat")} onOpenMiles={() => { setPrevScreen("parent_home"); setScreen(user.miles_persona ? "miles_chat" : "miles_intro"); }} onOpenGeniusStack={() => { setPrevScreen("parent_home"); setScreen("genius_stack"); }} />;
    else if (screen === "parent_chat") body = <ParentChatScreen onBack={() => setScreen("parent_home")} onOpenFounding={() => setScreen("parent_founding")} />;
    else if (screen === "parent_invite") body = <ParentInvite onBack={() => setScreen("parent_home")} />;
    else if (screen === "parent_polls") body = <ParentPolls onBack={() => setScreen("parent_home")} />;
    else if (screen === "parent_ideas") body = <ParentIdeas onBack={() => setScreen("parent_home")} />;
    else if (screen === "parent_founding") body = <ParentFounding onBack={() => setScreen("parent_home")} />;
    else if (screen === "kid_accept_invite") body = <KidAcceptInvite onBack={() => setScreen("home")} onAccepted={() => setScreen("home")} />;
    else if (screen === "miles_intro") body = <MilesIntro cfg={milesCfg} onPicked={async () => { await refreshUser(); setScreen("miles_chat"); }} onBack={() => setScreen(prevScreen || "home")} />;
    else if (screen === "miles_chat") body = <MilesChatScreen cfg={milesCfg} persona={user.miles_persona} onBack={() => setScreen(prevScreen || "home")} onOpenFounding={() => setScreen("miles_founding")} onOpenGeniusStack={() => setScreen("genius_stack")} />;
    else if (screen === "miles_ideas") body = <MilesIdeas onBack={() => setScreen("miles_chat")} />;
    else if (screen === "miles_polls") body = <MilesPolls onBack={() => setScreen("miles_chat")} />;
    else if (screen === "miles_founding") body = <MilesFounding onBack={() => setScreen("miles_chat")} />;
    else if (screen === "genius_stack") body = <GeniusStackPage onBack={() => setScreen(user.miles_persona ? "miles_chat" : (user.role === "parent" ? "parent_home" : "home"))} />;
    else if (screen === "home") body = <HomeScreen user={user} onContinueChat={() => setScreen(user.current_track ? "chat" : "track")} onOpenMemory={() => setScreen("memory")} onOpenBurners={() => openBurners("home")} onPickTrack={() => setScreen("track")} onApplyFounding={() => setScreen("founding")} onOpenMaxPitch={() => setScreen("pitch_submit")} onOpenKidAcceptInvite={() => setScreen("kid_accept_invite")} onOpenMiles={() => { setPrevScreen("home"); setScreen(user.miles_persona ? "miles_chat" : "miles_intro"); }} onOpenGeniusStack={() => { setPrevScreen("home"); setScreen("genius_stack"); }} onLogout={handleLogout} />;
    else if (screen === "track") body = <TrackScreen onSelectTrack={(t) => { setTrack(t); setUser({ ...user, current_track: t }); setScreen("chat"); }} onBack={() => setScreen("home")} />;
    else if (screen === "chat") body = <ChatScreen track={track} onChangeTrack={() => setScreen("track")} onBack={() => setScreen("home")} onOpenBurners={() => openBurners("chat")} onUserUpdated={refreshUser} />;
    else if (screen === "memory") body = <MemoryScreen onBack={() => setScreen("home")} onSaved={(m) => setUser({ ...user, memory_card: m })} />;
    else if (screen === "founding") body = <FoundingApply onBack={() => setScreen("home")} onSubmitted={refreshUser} />;
    else if (screen === "pitch_submit") body = <MaxPitchSubmit onBack={() => setScreen("home")} />;
    else if (screen === "burners") body = <FourBurnersPage onBack={() => setScreen(prevScreen)} />;
    else body = <HomeScreen user={user} onContinueChat={() => setScreen("chat")} onOpenMemory={() => setScreen("memory")} onOpenBurners={() => openBurners("home")} onPickTrack={() => setScreen("track")} onApplyFounding={() => setScreen("founding")} onOpenMaxPitch={() => setScreen("pitch_submit")} onOpenKidAcceptInvite={() => setScreen("kid_accept_invite")} onOpenMiles={() => { setPrevScreen("home"); setScreen(user.miles_persona ? "miles_chat" : "miles_intro"); }} onOpenGeniusStack={() => { setPrevScreen("home"); setScreen("genius_stack"); }} onLogout={handleLogout} />;
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto overflow-hidden" style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} data-testid="app-root">
      {body}
    </div>
  );
}
