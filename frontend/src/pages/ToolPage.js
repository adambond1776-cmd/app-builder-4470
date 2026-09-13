import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

function Field({ field, value, onChange }) {
  const label = <label className="block text-xs font-semibold mb-1.5" style={{ color: "hsl(210,20%,80%)" }}>{field.label}</label>;
  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          data-testid={`field-${field.id}`}
          rows={2}
          className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
        />
      </div>
    );
  }
  if (field.type === "text") {
    return (
      <div>
        {label}
        <input
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          data-testid={`field-${field.id}`}
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
        />
      </div>
    );
  }
  if (field.type === "scale") {
    const min = field.min ?? 1, max = field.max ?? 10;
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-1.5" data-testid={`field-${field.id}`}>
          {nums.map((n) => (
            <button
              key={n}
              onClick={() => onChange(field.id, n)}
              className="w-8 h-8 rounded-lg text-xs font-bold"
              style={value === n
                ? { background: "hsl(213,100%,55%)", color: "white" }
                : { background: "hsl(220,30%,14%)", color: "hsl(210,20%,75%)", border: "1px solid hsl(220,30%,22%)" }}
            >{n}</button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "radio") {
    return (
      <div>
        {label}
        <div className="flex flex-col gap-1.5" data-testid={`field-${field.id}`}>
          {(field.options || []).map((o) => (
            <button
              key={o.id || o}
              onClick={() => onChange(field.id, o.id || o)}
              className="text-left px-3 py-2 rounded-lg text-sm"
              style={value === (o.id || o)
                ? { background: "hsla(213,100%,55%,0.16)", color: "hsl(213,100%,75%)", border: "1px solid hsla(213,100%,60%,0.4)" }
                : { background: "hsl(220,30%,13%)", color: "hsl(210,20%,80%)", border: "1px solid hsl(220,30%,20%)" }}
            >{o.label || o}</button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function ToolPage({ toolId, onBack, onSaved }) {
  const [tool, setTool] = useState(null);
  const [entries, setEntries] = useState([]);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reflection, setReflection] = useState("");
  const [err, setErr] = useState(null);

  useEffect(() => {
    apiJSON(`/workbook/tools/${toolId}`).then((d) => {
      setTool(d.tool);
      setEntries(d.entries || []);
      const current = (d.entries || []).find((e) => e.period_key === d.current_period);
      if (current) { setAnswers(current.answers || {}); setReflection(current.ai_reflection || ""); }
    }).catch((e) => setErr(e.message));
  }, [toolId]);

  const setField = (id, val) => { setAnswers((a) => ({ ...a, [id]: val })); setSaved(false); };

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await apiJSON(`/workbook/tools/${toolId}/entries`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setReflection(res.entry.ai_reflection || "");
      setSaved(true);
      const d = await apiJSON(`/workbook/tools/${toolId}`);
      setEntries(d.entries || []);
      onSaved?.();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  if (!tool) {
    return <div className="flex items-center justify-center h-full text-sm" style={{ color: "hsl(220,15%,55%)" }}>{err || "Loading…"}</div>;
  }

  const pastEntries = entries.filter((e) => e.answers && Object.keys(e.answers).length);

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="tool-page">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)", backdropFilter: "blur(8px)" }}>
        <button onClick={onBack} data-testid="tool-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="min-w-0">
          <div className="text-base font-black truncate" style={{ color: "hsl(210,20%,95%)" }}>{tool.title}</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>Week {tool && ""}{new Date().toISOString().slice(0, 10)}</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {tool.quote && (
          <div className="text-xs italic" style={{ color: "hsl(220,15%,55%)" }}>{tool.quote}</div>
        )}
        <div className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,66%)" }}>{tool.subtitle}</div>

        {(tool.sections || []).map((section) => (
          <div key={section.id} className="p-4 rounded-2xl space-y-3" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
            <div>
              <div className="font-black text-sm" style={{ color: "hsl(210,20%,95%)" }}>{section.title}</div>
              {section.quote && <div className="text-[11px] italic mt-0.5" style={{ color: "hsl(220,15%,50%)" }}>{section.quote}</div>}
            </div>
            {section.fields.map((f) => (
              <Field key={f.id} field={f} value={answers[f.id]} onChange={setField} />
            ))}
          </div>
        ))}

        {err && <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

        <button onClick={save} disabled={saving} data-testid="tool-save-btn" className="w-full py-3.5 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(270,75%,55%))", color: "white" }}>
          {saving ? "Saving…" : saved ? "Saved ✓ — Save again" : "Save this week's page"}
        </button>

        {saved && !reflection && (
          <div className="text-xs text-center" style={{ color: "hsl(142,60%,65%)" }}>Page saved. Your streak is counting.</div>
        )}

        {reflection && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl" style={{ background: "hsla(213,100%,55%,0.08)", border: "1px solid hsla(213,100%,60%,0.3)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,68%)" }}>Max's reflection</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(210,20%,88%)" }}>{reflection}</p>
          </motion.div>
        )}

        {pastEntries.length > 1 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1" style={{ color: "hsl(220,15%,55%)" }}>Past pages · {pastEntries.length}</div>
            <div className="space-y-1.5">
              {pastEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "hsl(220,35%,10%)", border: "1px solid hsl(220,30%,16%)" }}>
                  <span className="text-xs" style={{ color: "hsl(210,20%,80%)" }}>{e.period_key}</span>
                  <span className="text-[10px]" style={{ color: "hsl(220,15%,45%)" }}>{(e.created_at || "").slice(0, 10)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
