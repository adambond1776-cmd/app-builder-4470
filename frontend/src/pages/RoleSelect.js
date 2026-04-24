import { useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function RoleSelect({ user, onSelected }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const pick = async (role) => {
    setSaving(true); setErr(null);
    try {
      await apiJSON("/profile", { method: "PATCH", body: JSON.stringify({ role }) });
      onSelected(role);
    } catch (e) { setErr(e.message); setSaving(false); }
  };

  return (
    <div className="flex flex-col min-h-full px-6 py-10 justify-center" data-testid="role-select">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,65%)" }}>Welcome, {(user.name || "").split(" ")[0]}</div>
          <h1 className="text-3xl font-black" style={{ color: "hsl(210,20%,95%)" }}>Who's this for?</h1>
          <p className="text-sm mt-2" style={{ color: "hsl(220,15%,60%)" }}>Pick your lane. This changes what you'll see.</p>
        </div>
        <button onClick={() => pick("kid")} disabled={saving} data-testid="role-kid-btn" className="w-full text-left p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(213,100%,60%,0.12), hsla(213,100%,60%,0.04))", border: "1px solid hsla(213,100%,60%,0.3)" }}>
          <div className="text-2xl mb-2">🎯</div>
          <div className="font-black text-lg" style={{ color: "hsl(210,20%,95%)" }}>I'm a young person (16–23)</div>
          <div className="text-sm mt-1" style={{ color: "hsl(220,15%,65%)" }}>Get coached by Max. Build your Business of Life.</div>
        </button>
        <button onClick={() => pick("parent")} disabled={saving} data-testid="role-parent-btn" className="w-full text-left p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(25,100%,55%,0.12), hsla(25,100%,55%,0.04))", border: "1px solid hsla(25,100%,55%,0.3)" }}>
          <div className="text-2xl mb-2">👨‍👩‍👧</div>
          <div className="font-black text-lg" style={{ color: "hsl(210,20%,95%)" }}>I'm a parent</div>
          <div className="text-sm mt-1" style={{ color: "hsl(220,15%,65%)" }}>Help your kid run their Business of Life. You guide what we build next.</div>
        </button>
        {err && <div className="text-xs text-center" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}
      </motion.div>
    </div>
  );
}
