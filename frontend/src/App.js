import { useCallback, useEffect, useRef, useState } from "react";
import HiddenGeniusOnboarding from "./pages/HiddenGeniusOnboarding";
import WelcomeScreen from "./pages/WelcomeScreen";
import TrackScreen from "./pages/TrackScreen";
import ChatScreen from "./pages/ChatScreen";
import FourBurnersPage from "./pages/FourBurnersPage";
import AuthCallback from "./pages/AuthCallback";
import SignupGate from "./pages/SignupGate";
import HomeScreen from "./pages/HomeScreen";
import MemoryScreen from "./pages/MemoryScreen";
import WorkbookHub from "./pages/WorkbookHub";
import ToolPage from "./pages/ToolPage";
import RoadFinder from "./pages/RoadFinder";
import GeniusProfile from "./pages/GeniusProfile";
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
import AquidneckLanding from "./pages/AquidneckLanding";
import TeacherHubPage from "./pages/TeacherHubPage";
import { apiJSON } from "./lib/api";
import "./App.css";

/* ============================================================
 * ROUTING
 * ------------------------------------------------------------
 * Two layers:
 *   1. PUBLIC ROUTES — real URL paths (server/SPA fallback serves
 *      index.html). Matched once at mount via parsePath(). No auth.
 *   2. APP SCREENS — authed, state-driven screens for signed-in
 *      users, mirrored into the URL hash (#/screen/<name>) so the
 *      browser Back button and page refresh both work.
 * ============================================================ */

/** Static path → route table for public pages (single source of truth). */
const PUBLIC_PATH_ROUTES = {
  "/pitches": "pitches_hub",
  "/sponsor": "sponsor",
  "/pricing": "pricing",
  "/teachers": "teacher_hub",
  "/teacher-hub": "teacher_hub",
  "/story": "story",
  "/hidden-genius": "story",
  "/payment/return": "payment_return",
  "/aquidneck": "aquidneck",
  "/free-books": "aquidneck",
  "/free": "aquidneck",
  "/free-aquidneck-books": "aquidneck",
  "/rhode-island-seniors-free-books": "aquidneck",
};

function parsePath() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const pitchMatch = pathname.match(/^\/pitch\/([a-zA-Z0-9-]+)$/);
  if (pitchMatch) return { type: "pitch_public", slug: pitchMatch[1] };
  if (pathname === "/judge") {
    const token = params.get("token");
    if (token) return { type: "judge", token };
  }
  if (PUBLIC_PATH_ROUTES[pathname]) return { type: PUBLIC_PATH_ROUTES[pathname] };
  return { type: "default" };
}

/**
 * Valid authed app screens. Used to (a) restore state from the URL
 * hash after a refresh and (b) reject garbage hashes. When adding a
 * new screen, register it here.
 */
const AUTHED_SCREENS = new Set([
  "signup_gate", "role_select",
  "home", "track", "chat", "memory", "burners",
  "workbook", "workbook_tool", "road_finder", "genius_profile",
  "founding", "pitch_submit",
  "kid_accept_invite", "genius_stack",
  "miles_intro", "miles_chat", "miles_ideas", "miles_polls", "miles_founding",
  "parent_home", "parent_chat", "parent_invite", "parent_polls",
  "parent_ideas", "parent_founding",
]);

const SCREEN_HASH_RE = /^#\/screen\/([a-z_]+)$/;

function readScreenFromHash() {
  if (typeof window === "undefined") return null;
  const m = window.location.hash.match(SCREEN_HASH_RE);
  const name = m ? m[1] : null;
  return name && AUTHED_SCREENS.has(name) ? name : null;
}

/* ============================================================
 * SHARED SHELL — one wrapper for every route, instead of ten
 * copy-pasted divs. width: "mobile" | "wide" | "full"
 * ============================================================ */
const SHELL_STYLES = { background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" };

function AppShell({ width = "mobile", tall = true, children }) {
  const widthClass = width === "wide" ? "max-w-2xl" : width === "full" ? "" : "max-w-md";
  const heightClass = tall ? "h-screen overflow-hidden" : "min-h-screen";
  return (
    <div
      className={`flex flex-col ${heightClass} w-full ${widthClass} mx-auto`}
      style={width === "full" ? undefined : SHELL_STYLES}
      data-testid="app-root"
    >
      {children}
    </div>
  );
}

/* Public route type → shell config + element factory. */
const PUBLIC_SCREENS = {
  pitch_public: { width: "mobile", tall: true, render: (route) => <PitchPublicPage slug={route.slug} /> },
  pitches_hub: { width: "wide", tall: false, render: () => <PitchesHubPage /> },
  sponsor: { width: "wide", tall: false, render: () => <SponsorPage /> },
  payment_return: { width: "mobile", tall: false, render: () => <PaymentReturn /> },
  pricing: { width: "wide", tall: false, render: () => <PricingPage onBack={null} /> },
  aquidneck: { width: "full", tall: false, render: () => <AquidneckLanding /> },
  teacher_hub: { width: "full", tall: false, render: () => <TeacherHubPage /> },
  story: { width: "mobile", tall: true, render: () => <HiddenGeniusOnboarding onContinue={() => { window.location.href = "/"; }} /> },
  judge: { width: "mobile", tall: true, render: (route) => <JudgeView token={route.token} /> },
};

export default function App() {
  const [route] = useState(parsePath); // captured once at mount
  const [user, setUser] = useState(null); // null=loading, false=signed out, obj=signed in
  const [screen, setScreen] = useState(null);
  const [prevScreen, setPrevScreen] = useState("home");
  const [track, setTrack] = useState("");
  const [milesCfg, setMilesCfg] = useState(null);
  const [workbookTool, setWorkbookTool] = useState(null);

  const hasSessionInUrl = typeof window !== "undefined" && window.location.hash?.includes("session_id=");

  /* ---- URL-hash history sync (authed screens only) ----
   * Each screen change pushes #/screen/<name> so the browser Back
   * button steps through screens instead of leaving the app, and a
   * refresh restores the same screen. */
  const firstHashSync = useRef(true);

  useEffect(() => {
    if (user === null || user === false) return; // only sync authed app screens
    if (screen === null) return;
    const hash = `#/screen/${screen}`;
    if (firstHashSync.current) {
      firstHashSync.current = false;
      window.history.replaceState({ mc_screen: screen }, "", hash);
    } else if (window.location.hash !== hash) {
      window.history.pushState({ mc_screen: screen }, "", hash);
    }
  }, [screen, user]);

  useEffect(() => {
    const onPopState = (e) => {
      const fromState = e.state && typeof e.state.mc_screen === "string" ? e.state.mc_screen : null;
      const target = fromState && AUTHED_SCREENS.has(fromState) ? fromState : readScreenFromHash();
      if (target) setScreen(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /* ---- Data loading ---- */
  useEffect(() => {
    apiJSON("/miles/config").then(setMilesCfg).catch(() => {});
  }, []);

  useEffect(() => {
    if (route.type !== "default") return; // public pages don't need auth check
    if (hasSessionInUrl) return;
    (async () => {
      try {
        const u = await apiJSON("/auth/me");
        setUser(u);
        setTrack(u.current_track || "");
      } catch { setUser(false); }
    })();
  }, [hasSessionInUrl, route.type]);

  /* ---- Post-auth routing (once per sign-in; refreshUser() re-sets
   * the user object, so this must not re-run and clobber the screen) ---- */
  const didInitialRoute = useRef(false);

  useEffect(() => {
    if (user === null || user === false) return;
    if (didInitialRoute.current) return;
    didInitialRoute.current = true;
    if (!user.age_confirmed || !user.beta_consent) { setScreen("signup_gate"); return; }
    // Prefer the screen recorded in the URL hash (refresh / back-navigation
    // restore), falling back to the user's home screen.
    const restored = readScreenFromHash();
    setScreen(restored || "home");
  }, [user]);

  useEffect(() => {
    if (user !== false) return;
    setScreen("welcome");
  }, [user]);

  /* ---- Handlers ---- */
  const handleAuthed = async (u) => { setUser(u); setTrack(u.current_track || ""); };

  const handleLogout = async () => {
    try { await apiJSON("/auth/logout", { method: "POST" }); } catch {}
    setUser(false);
    setScreen("welcome");
    // Drop any #/screen/... entry so Back doesn't land inside the authed app.
    try { window.history.replaceState(null, "", window.location.pathname); } catch {}
    firstHashSync.current = true;
    didInitialRoute.current = false;
  };

  const startLogin = () => {
    const redirectUrl = window.location.origin + "/";
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const refreshUser = async () => {
    try {
      const u = await apiJSON("/auth/me");
      setUser(u);
      setTrack(u.current_track || "");
      return u;
    } catch { return null; }
  };

  const openBurners = (from) => { setPrevScreen(from); setScreen("burners"); };

  // Miles entry is persona-dependent: returning users resume chat,
  // new users pick a persona first. Used from home + parent dashboards.
  const openMiles = (from) => {
    setPrevScreen(from);
    setScreen(user?.miles_persona ? "miles_chat" : "miles_intro");
  };
  const openGeniusStack = (from) => { setPrevScreen(from); setScreen("genius_stack"); };

  /* ---- Public routes short-circuit auth entirely ---- */
  if (route.type !== "default") {
    const cfg = PUBLIC_SCREENS[route.type];
    return <AppShell width={cfg.width} tall={cfg.tall}>{cfg.render(route)}</AppShell>;
  }

  if (hasSessionInUrl) {
    return (
      <AppShell>
        <AuthCallback onAuthed={handleAuthed} />
      </AppShell>
    );
  }

  let body;
  if (user === null) {
    body = <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>Loading…</div>;
  } else if (user === false) {
    if (screen === "burners") body = <FourBurnersPage onBack={() => setScreen("welcome")} />;
    else body = <WelcomeScreen onStart={startLogin} onOpenBurners={() => openBurners("welcome")} isAuthed={false} />;
  } else {
    // Signed in — one renderHome() keeps the two HomeScreen call sites identical.
    const renderHome = () => (
      <HomeScreen
        user={user}
        onContinueChat={() => setScreen(user.current_track ? "chat" : "track")}
        onOpenMemory={() => setScreen("memory")}
        onOpenBurners={() => openBurners("home")}
        onPickTrack={() => setScreen("track")}
        onApplyFounding={() => setScreen("founding")}
        onOpenMaxPitch={() => setScreen("pitch_submit")}
        onOpenKidAcceptInvite={() => setScreen("kid_accept_invite")}
        onOpenMiles={() => openMiles("home")}
        onOpenGeniusStack={() => openGeniusStack("home")}
        onOpenWorkbook={() => setScreen("workbook")}
        onLogout={handleLogout}
      />
    );

    if (screen === "signup_gate") {
      body = <SignupGate user={user} onComplete={async () => { const u = await refreshUser(); setScreen(u?.role === "parent" ? "parent_home" : "role_select"); }} onBlocked={handleLogout} />;
    } else if (screen === "role_select" || (user.role == null && screen === "home")) {
      body = <RoleSelect user={user} onSelected={async (r) => { await refreshUser(); setScreen(r === "parent" ? "parent_home" : "home"); }} />;
    } else if (user.role === "parent" && ["parent_home", "home"].includes(screen)) {
      body = (
        <ParentDashboard
          user={user}
          onLogout={handleLogout}
          onOpenPolls={() => setScreen("parent_polls")}
          onOpenIdeas={() => setScreen("parent_ideas")}
          onOpenFounding={() => setScreen("parent_founding")}
          onOpenInvite={() => setScreen("parent_invite")}
          onOpenMaya={() => setScreen("parent_chat")}
          onOpenMiles={() => openMiles("parent_home")}
          onOpenGeniusStack={() => openGeniusStack("parent_home")}
        />
      );
    } else if (screen === "parent_chat") {
      body = <ParentChatScreen onBack={() => setScreen("parent_home")} onOpenFounding={() => setScreen("parent_founding")} />;
    } else if (screen === "parent_invite") {
      body = <ParentInvite onBack={() => setScreen("parent_home")} />;
    } else if (screen === "parent_polls") {
      body = <ParentPolls onBack={() => setScreen("parent_home")} />;
    } else if (screen === "parent_ideas") {
      body = <ParentIdeas onBack={() => setScreen("parent_home")} />;
    } else if (screen === "parent_founding") {
      body = <ParentFounding onBack={() => setScreen("parent_home")} />;
    } else if (screen === "kid_accept_invite") {
      body = <KidAcceptInvite onBack={() => setScreen("home")} onAccepted={() => setScreen("home")} />;
    } else if (screen === "miles_intro") {
      body = <MilesIntro cfg={milesCfg} onPicked={async () => { await refreshUser(); setScreen("miles_chat"); }} onBack={() => setScreen(prevScreen || "home")} />;
    } else if (screen === "miles_chat") {
      body = <MilesChatScreen cfg={milesCfg} persona={user.miles_persona} onBack={() => setScreen(prevScreen || "home")} onOpenFounding={() => setScreen("miles_founding")} onOpenGeniusStack={() => setScreen("genius_stack")} />;
    } else if (screen === "miles_ideas") {
      body = <MilesIdeas onBack={() => setScreen("miles_chat")} />;
    } else if (screen === "miles_polls") {
      body = <MilesPolls onBack={() => setScreen("miles_chat")} />;
    } else if (screen === "miles_founding") {
      body = <MilesFounding onBack={() => setScreen("miles_chat")} />;
    } else if (screen === "genius_stack") {
      body = <GeniusStackPage onBack={() => setScreen(prevScreen || (user.miles_persona ? "miles_chat" : (user.role === "parent" ? "parent_home" : "home")))} />;
    } else if (screen === "home") {
      body = renderHome();
    } else if (screen === "track") {
      body = <TrackScreen onSelectTrack={(t) => { setTrack(t); setUser({ ...user, current_track: t }); setScreen("chat"); }} onBack={() => setScreen("home")} />;
    } else if (screen === "chat") {
      body = <ChatScreen track={track} onChangeTrack={() => setScreen("track")} onBack={() => setScreen("home")} onOpenBurners={() => openBurners("chat")} onUserUpdated={refreshUser} />;
    } else if (screen === "memory") {
      body = <MemoryScreen onBack={() => setScreen("home")} onSaved={(m) => setUser({ ...user, memory_card: m })} />;
    } else if (screen === "workbook") {
      body = <WorkbookHub user={user} onBack={() => setScreen("home")} onOpenTool={(id) => { setWorkbookTool(id); setScreen("workbook_tool"); }} onOpenRoadFinder={() => setScreen("road_finder")} onOpenGenius={() => setScreen("genius_profile")} />;
    } else if (screen === "workbook_tool") {
      body = <ToolPage toolId={workbookTool} onBack={() => setScreen("workbook")} onSaved={refreshUser} />;
    } else if (screen === "road_finder") {
      body = <RoadFinder user={user} onBack={() => setScreen("workbook")} onCommitted={async (t) => { setTrack(t); setUser({ ...user, current_track: t }); await refreshUser(); setScreen("workbook"); }} />;
    } else if (screen === "genius_profile") {
      body = <GeniusProfile onBack={() => setScreen("workbook")} onChanged={refreshUser} />;
    } else if (screen === "founding") {
      body = <FoundingApply onBack={() => setScreen("home")} onSubmitted={refreshUser} />;
    } else if (screen === "pitch_submit") {
      body = <MaxPitchSubmit onBack={() => setScreen("home")} />;
    } else if (screen === "burners") {
      body = <FourBurnersPage onBack={() => setScreen(prevScreen)} />;
    } else {
      // Unknown screen value — never dead-end; fall back to home.
      body = renderHome();
    }
  }

  return (
    <AppShell>
      {body}
    </AppShell>
  );
}
