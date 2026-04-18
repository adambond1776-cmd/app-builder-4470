import { useState } from "react";
import HiddenGeniusOnboarding from "./pages/HiddenGeniusOnboarding";
import WelcomeScreen from "./pages/WelcomeScreen";
import TrackScreen from "./pages/TrackScreen";
import ChatScreen from "./pages/ChatScreen";
import "./App.css";

function getInitialScreen() {
  try {
    if (localStorage.getItem("hg_onboarded") === "true") return "welcome";
  } catch {}
  return "onboarding";
}

export default function App() {
  const [screen, setScreen] = useState(getInitialScreen);
  const [track, setTrack] = useState("");

  return (
    <div
      className="flex flex-col h-screen w-full max-w-md mx-auto overflow-hidden"
      style={{ background: "hsl(220,40%,8%)", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      data-testid="app-root"
    >
      {screen === "onboarding" && <HiddenGeniusOnboarding onContinue={() => setScreen("welcome")} />}
      {screen === "welcome" && <WelcomeScreen onStart={() => setScreen("track")} />}
      {screen === "track" && <TrackScreen onSelectTrack={(t) => { setTrack(t); setScreen("chat"); }} />}
      {screen === "chat" && <ChatScreen track={track} onChangeTrack={() => setScreen("track")} />}
    </div>
  );
}
