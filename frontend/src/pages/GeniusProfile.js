import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function GeniusProfile({ onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [sentence, setSentence] = useState("");
  const [word, setWord] = useState("");
  const [exploreOpen, setExploreOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [err, setErr] = useState(null);

  const load = () =>
    apiJSON("/workbook/genius-profile").then((d) => {
      setData(d);
      setSentence(d.genius_profile?.refining_sentence || "");
      setWord(d.genius_profile?.working_word || "");
    }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const p = data?.genius_profile;
  const words = data?.working_words || [];
  const currentWord = words.find((w) => w.id === (p?.working_word || "").toLowerCase());

  const saveEdit = async () => {
    setBusy(true); setErr(null);
    try {
      await apiJSON("/workbook/genius-profile/edit", {
        method: "POST",
        body: JSON.stringify({ working_word: word, refining_sentence: sentence }),
      });
      setEditing(false);
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const merge = async () => {
    setBusy(true); setErr(null); setNote(null);
    try {
      const res = await apiJSON("/workbook/genius-profile/merge", { method: "POST" });
      setNote(res.seeded_track
        ? `Merged. Your road was set to ${res.seeded_track} from your Genius Profile — you can change it anytime.`
        : "Merged into MaxCoach.");
      await load();
      onChanged?.();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const withdraw = async () => {
    if (!window.confirm("Remove your Genius Profile from MaxCoach? This deletes the imported copy from your account.")) return;
    setBusy(true); setErr(null); setNote(null);
    try {
      await apiJSON("/workbook/genius-profile/withdraw", { method: "POST" });
      await load();
      onChanged?.();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="genius-profile">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)", backdropFilter: "blur(8px)" }}>
        <button onClick={onBack} data-testid="genius-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <div className="text-base font-black" style={{ color: "hsl(210,20%,95%)" }}>Genius Profile</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>From Genius Mining · Campus Quest</div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {err && <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

        {!p && (
          <div className="p-5 rounded-2xl text-center" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
            <div className="text-2xl mb-2">🧭</div>
            <div className="font-bold text-sm mb-1" style={{ color: "hsl(210,20%,92%)" }}>No Genius Profile yet</div>
            <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,60%)" }}>Complete the Genius Mining questionnaire in Campus Quest. When you consent, it syncs here and you can bring it into MaxCoach.</div>
          </div>
        )}

        {p && (
          <>
            {/* The sentence leads — the word is a starting place */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsla(160,70%,50%,0.3)" }}>
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(160,70%,72%)" }}>In your own words</div>
              {editing ? (
                <textarea value={sentence} onChange={(e) => setSentence(e.target.value)} rows={3} data-testid="genius-sentence-input" className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }} />
              ) : (
                <p className="text-lg font-bold leading-snug" style={{ color: "hsl(210,20%,96%)" }}>{p.refining_sentence || "—"}</p>
              )}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px]" style={{ color: "hsl(220,15%,55%)" }}>Working word:</span>
                {editing ? (
                  <select value={word} onChange={(e) => setWord(e.target.value)} data-testid="genius-word-select" className="text-xs rounded-lg px-2 py-1 outline-none" style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}>
                    {words.map((w) => <option key={w.id} value={w.id}>{w.word}</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "hsla(213,100%,60%,0.16)", color: "hsl(213,100%,75%)" }}>{currentWord?.word || p.working_word}</span>
                )}
              </div>
              <div className="text-[10px] mt-1.5 italic" style={{ color: "hsl(220,15%,48%)" }}>The word is only a starting place — about 80% right. Your sentence is the one that matters.</div>
              <div className="mt-3">
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={busy} data-testid="genius-save-btn" className="flex-1 py-2.5 rounded-xl font-semibold text-sm" style={{ background: "linear-gradient(135deg, hsl(160,70%,42%), hsl(160,70%,32%))", color: "white" }}>{busy ? "Saving…" : "Save"}</button>
                    <button onClick={() => { setEditing(false); setSentence(p.refining_sentence || ""); setWord(p.working_word || ""); }} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: "hsl(220,30%,14%)", color: "hsl(210,15%,80%)", border: "1px solid hsl(220,30%,22%)" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} data-testid="genius-edit-btn" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "hsl(220,30%,14%)", color: "hsl(160,70%,70%)", border: "1px solid hsla(160,70%,50%,0.3)" }}>Edit / correct this</button>
                )}
              </div>
            </motion.div>

            {/* Merge / withdraw */}
            {!data.merged ? (
              <div className="p-4 rounded-2xl" style={{ background: "hsla(213,100%,55%,0.08)", border: "1px solid hsla(213,100%,60%,0.3)" }}>
                <div className="font-bold text-sm mb-1" style={{ color: "hsl(210,20%,95%)" }}>Bring this into MaxCoach</div>
                <div className="text-xs leading-relaxed mb-3" style={{ color: "hsl(220,15%,62%)" }}>Merge your Genius Profile so MaxCoach can personalize your coaching and pre-fill your road — no re-answering questions you already did in Campus Quest.</div>
                <button onClick={merge} disabled={busy} data-testid="genius-merge-btn" className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(270,75%,55%))", color: "white" }}>{busy ? "Merging…" : "Merge into MaxCoach →"}</button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: "hsla(142,71%,45%,0.08)", border: "1px solid hsla(142,71%,45%,0.3)" }}>
                <div className="text-sm font-semibold" style={{ color: "hsl(142,60%,70%)" }}>✓ Merged into MaxCoach</div>
                <button onClick={withdraw} disabled={busy} data-testid="genius-withdraw-btn" className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "hsl(220,30%,14%)", color: "hsl(0,70%,62%)", border: "1px solid hsla(0,70%,50%,0.3)" }}>Withdraw</button>
              </div>
            )}
            {note && <div className="text-xs p-3 rounded-lg" style={{ background: "hsla(142,71%,45%,0.06)", border: "1px solid hsla(142,71%,45%,0.2)", color: "hsl(142,50%,70%)" }}>{note}</div>}

            {/* Section F (if present) or withheld note */}
            {p.section_f_withheld && (
              <div className="text-[11px] p-3 rounded-lg" style={{ background: "hsl(220,35%,10%)", border: "1px solid hsl(220,30%,18%)", color: "hsl(220,15%,58%)" }}>
                The "Figuring It Out" section is withheld until its consent is on file (required for under-18 students).
              </div>
            )}
            {p.kinds_of_work?.length > 0 && (
              <div className="p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(35,100%,70%)" }}>Kinds of work that fit</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.kinds_of_work.map((k) => (
                    <span key={k} className="text-[11px] px-2 py-1 rounded-full" style={{ background: "hsl(220,30%,15%)", color: "hsl(210,20%,82%)" }}>{k.replace(/_/g, " ")}</span>
                  ))}
                </div>
                {p.expected_path && (
                  <div className="text-[11px] mt-3" style={{ color: "hsl(220,15%,60%)" }}>Leaning toward: <span style={{ color: "hsl(210,20%,88%)" }}>{p.expected_path.replace(/_/g, " ")}</span></div>
                )}
              </div>
            )}

            {/* Explore the 8 */}
            <div>
              <button onClick={() => setExploreOpen((v) => !v)} data-testid="genius-explore-toggle" className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "hsl(220,15%,62%)" }}>Explore the 8 working words</span>
                <span className="text-xs" style={{ color: "hsl(220,15%,55%)" }}>{exploreOpen ? "▲" : "▼"}</span>
              </button>
              {exploreOpen && (
                <div className="mt-2 space-y-1.5">
                  {words.map((w) => (
                    <div key={w.id} className="px-3 py-2 rounded-lg flex items-start gap-2" style={{ background: (p.working_word || "").toLowerCase() === w.id ? "hsla(213,100%,55%,0.12)" : "hsl(220,35%,10%)", border: "1px solid hsl(220,30%,16%)" }}>
                      <span className="text-xs font-black w-20 flex-shrink-0" style={{ color: "hsl(213,100%,72%)" }}>{w.word}</span>
                      <span className="text-[11px]" style={{ color: "hsl(220,15%,62%)" }}>{w.means}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {p.participant_code && (
              <div className="text-center text-[10px] pt-1" style={{ color: "hsl(220,15%,38%)" }}>Campus Quest code {p.participant_code} · v{p.version || "?"}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
