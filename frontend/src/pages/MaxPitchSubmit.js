import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

export default function MaxPitchSubmit({ onBack, onSubmitted }) {
  const [round, setRound] = useState(null);
  const [mine, setMine] = useState(null);
  const [youtube, setYoutube] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  // Waitlist state (only used when round is full)
  const [wlName, setWlName] = useState("");
  const [wlEmail, setWlEmail] = useState("");
  const [wlNote, setWlNote] = useState("");
  const [wlBusy, setWlBusy] = useState(false);
  const [wlErr, setWlErr] = useState(null);
  const [wlDone, setWlDone] = useState(null); // { already_on_waitlist }

  useEffect(() => {
    apiJSON("/pitch/round").then(setRound).catch(() => {});
    apiJSON("/pitch/mine").then(setMine).catch(() => {});
  }, []);

  const canSubmit = text.trim().length >= 80 && text.length <= 1800;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setErr(null);
    try {
      const res = await apiJSON("/pitch/submit", { method: "POST", body: JSON.stringify({ pitch_text: text.trim(), youtube_url: youtube.trim() || null }) });
      onSubmitted?.(res.slug);
    } catch (e) { setErr(e.message); setSubmitting(false); }
  };

  const submitWaitlist = async (e) => {
    e?.preventDefault?.();
    if (wlBusy) return;
    setWlErr(null);
    if (!wlName.trim() || !wlEmail.trim()) {
      setWlErr("Name and email are required.");
      return;
    }
    setWlBusy(true);
    try {
      const res = await apiJSON("/pitch/waitlist", {
        method: "POST",
        body: JSON.stringify({
          name: wlName.trim(),
          email: wlEmail.trim(),
          note: wlNote.trim() || null,
        }),
      });
      setWlDone({ already_on_waitlist: !!res.already_on_waitlist });
    } catch (e) {
      setWlErr(e.message || "Couldn't join the waitlist. Try again.");
    } finally {
      setWlBusy(false);
    }
  };

  // ── Already submitted: confirmation + share screen
  if (mine) {
    const publicUrl = `${window.location.origin}/pitch/${mine.slug}`;
    return (
      <div className="flex flex-col min-h-full overflow-y-auto" data-testid="pitch-already-submitted">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
          <button onClick={onBack} data-testid="pitch-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>Max Pitch · Submitted</div>
        </div>
        <div className="px-5 py-6 space-y-4">
          <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, hsla(142,71%,45%,0.08), hsla(213,100%,60%,0.04))", border: "1px solid hsla(142,71%,45%,0.3)" }}>
            <div className="text-4xl mb-2">📬</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>Your pitch is live.</h2>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "hsl(220,15%,70%)" }}>
              Share your pitch link with everyone you know — every upvote makes judges pay more attention.
            </p>
            <div className="p-3 rounded-lg text-xs break-all mb-2" style={{ background: "hsl(220,30%,13%)", color: "hsl(213,100%,70%)" }} data-testid="pitch-public-url">{publicUrl}</div>
            <button onClick={() => { navigator.clipboard?.writeText(publicUrl); }} data-testid="pitch-copy-link-btn" className="w-full py-2.5 rounded-xl font-semibold text-sm" style={{ background: "hsl(213,100%,55%)", color: "white" }}>Copy link</button>
          </div>
          <div className="p-4 rounded-2xl" style={{ background: "hsl(220,35%,11%)", border: "1px solid hsl(220,30%,19%)" }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(220,15%,55%)" }}>Your pitch</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(210,20%,88%)" }}>{mine.pitch_text}</p>
            {mine.youtube_url && <div className="text-xs mt-2" style={{ color: "hsl(213,100%,65%)" }}>🎥 {mine.youtube_url}</div>}
            <div className="text-xs mt-3 font-bold" style={{ color: "hsl(25,100%,65%)" }}>{mine.upvote_count} upvote{mine.upvote_count === 1 ? "" : "s"}</div>
          </div>
        </div>
      </div>
    );
  }

  const isFull = round?.is_full;
  const spotsLeft = round?.spots_left;

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="pitch-submit-screen">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}>
        <button onClick={onBack} data-testid="pitch-back-btn" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>Max Pitch · {isFull ? "Waitlist" : "Submit"}</div>
          <div className="text-xs" style={{ color: "hsl(220,15%,50%)" }}>{round?.name}</div>
        </div>
        <a
          href="/teachers"
          data-testid="pitch-submit-teacher-hub-link"
          className="text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full no-underline whitespace-nowrap"
          style={{
            background: "hsla(280,80%,55%,0.16)",
            color: "hsl(280,80%,80%)",
            border: "1px solid hsla(280,80%,55%,0.4)",
          }}
        >
          🔨 Vote teachers
        </a>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* "What this is" — new copy */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="pitch-what-this-is"
          className="p-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, hsla(25,100%,55%,0.1), hsla(213,100%,60%,0.04))",
            border: "1px solid hsla(25,100%,55%,0.3)",
          }}
        >
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(25,100%,70%)" }}>
            What this is
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(210,20%,85%)" }}>
            Pitch yourself for <strong>90 days of 1-on-1 coaching</strong> from a real
            executive. Five families and kids also get <strong>Adam directly</strong> AND
            can become featured participants in the reality documentary. Judges/viewers
            review every pitch. High upvote counts get more attention — but judges can pick
            anyone who speaks to them.
          </p>
          <p className="text-xs italic mt-2" style={{ color: "hsl(25,100%,65%)" }}>
            This is a matchmaking interview. Not everyone matches. Non-winners stay in the
            pool for future rounds.
          </p>
        </motion.div>

        {/* Capacity meter */}
        {round && typeof round.cap === "number" && (
          <div
            className="p-3 rounded-xl flex items-center justify-between gap-3"
            data-testid="pitch-capacity-meter"
            style={{
              background: isFull ? "hsla(0,75%,55%,0.08)" : "hsl(220,35%,11%)",
              border: `1px solid ${isFull ? "hsla(0,75%,55%,0.4)" : "hsl(220,30%,19%)"}`,
            }}
          >
            <div className="flex-1">
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: isFull ? "hsl(0,75%,72%)" : "hsl(220,15%,55%)" }}
              >
                {isFull ? "Round full" : "Round capacity"}
              </div>
              <div className="text-sm font-bold" style={{ color: "hsl(210,20%,90%)" }}>
                {round.submission_count} / {round.cap}{" "}
                <span className="font-normal text-xs" style={{ color: "hsl(220,15%,55%)" }}>
                  pitches submitted
                </span>
              </div>
              {!isFull && (
                <div className="text-[11px] mt-0.5" style={{ color: "hsl(25,100%,65%)" }}>
                  {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
                </div>
              )}
            </div>
            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: "hsl(220,30%,18%)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (round.submission_count / Math.max(1, round.cap)) * 100)}%`,
                  background: isFull
                    ? "linear-gradient(90deg, hsl(0,75%,55%), hsl(25,100%,55%))"
                    : "linear-gradient(90deg, hsl(213,100%,55%), hsl(25,100%,55%))",
                }}
              />
            </div>
          </div>
        )}

        {/* ── ROUND FULL: Waitlist form ── */}
        {isFull ? (
          wlDone ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl"
              data-testid="pitch-waitlist-success"
              style={{
                background: "linear-gradient(135deg, hsla(142,71%,45%,0.1), hsla(213,100%,60%,0.04))",
                border: "1px solid hsla(142,71%,45%,0.4)",
              }}
            >
              <div className="text-3xl mb-2">✓</div>
              <h3 className="text-lg font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
                {wlDone.already_on_waitlist
                  ? "You're already on the waitlist."
                  : "You're on the waitlist."}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,70%)" }}>
                When the next round of Max Pitch opens, you'll get an email with first
                access — before it goes public. Keep an eye on your inbox.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={submitWaitlist}
              data-testid="pitch-waitlist-form"
              className="p-5 rounded-2xl space-y-4"
              style={{
                background: "hsl(220,35%,11%)",
                border: "1px solid hsl(220,30%,19%)",
              }}
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,68%)" }}>
                  Round 1 is full — join the waitlist
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,70%)" }}>
                  We're capping Round 1 at {round.cap} pitches so every kid gets the
                  attention they deserve. Drop your info and we'll email you the second
                  Round 2 opens — before it goes public.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: "hsl(210,20%,90%)" }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={wlName}
                  onChange={(e) => setWlName(e.target.value)}
                  data-testid="pitch-waitlist-name"
                  required
                  placeholder="Alex Rivera"
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none"
                  style={{
                    background: "hsl(220,30%,13%)",
                    border: "1px solid hsl(220,30%,22%)",
                    color: "hsl(210,20%,90%)",
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: "hsl(210,20%,90%)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={wlEmail}
                  onChange={(e) => setWlEmail(e.target.value)}
                  data-testid="pitch-waitlist-email"
                  required
                  placeholder="alex@example.com"
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none"
                  style={{
                    background: "hsl(220,30%,13%)",
                    border: "1px solid hsl(220,30%,22%)",
                    color: "hsl(210,20%,90%)",
                  }}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: "hsl(210,20%,90%)" }}>
                  One line about why you'd pitch <span className="font-normal" style={{ color: "hsl(220,15%,50%)" }}>(optional)</span>
                </label>
                <textarea
                  value={wlNote}
                  onChange={(e) => setWlNote(e.target.value)}
                  data-testid="pitch-waitlist-note"
                  rows={3}
                  placeholder="What you'd want coaching on, or why you're a fit for the documentary."
                  className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none leading-relaxed"
                  style={{
                    background: "hsl(220,30%,13%)",
                    border: "1px solid hsl(220,30%,22%)",
                    color: "hsl(210,20%,90%)",
                  }}
                />
              </div>

              {wlErr && (
                <div className="text-xs" data-testid="pitch-waitlist-error" style={{ color: "hsl(0,70%,60%)" }}>
                  {wlErr}
                </div>
              )}

              <button
                type="submit"
                disabled={wlBusy}
                data-testid="pitch-waitlist-submit-btn"
                className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(213,100%,42%))",
                  color: "white",
                  boxShadow: "0 0 24px hsla(213,100%,55%,0.25)",
                }}
              >
                {wlBusy ? "Adding you…" : "Notify me when Round 2 opens"}
              </button>
            </form>
          )
        ) : (
          // ── ROUND OPEN: Pitch form ──
          <>
            <div>
              <label className="text-sm font-bold mb-2 block" style={{ color: "hsl(210,20%,92%)" }}>
                1. Optional — YouTube link to a 30-60 second pitch video
              </label>
              <input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                data-testid="pitch-youtube-input"
                placeholder="https://youtu.be/... (set video to Unlisted)"
                className="w-full rounded-xl px-3 py-3 text-sm outline-none"
                style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
              />
              <div className="text-[11px] mt-1" style={{ color: "hsl(220,15%,45%)" }}>
                Tip: upload to YouTube as <strong>Unlisted</strong>, then paste the link here. Don't use Public.
              </div>
            </div>

            <div>
              <label className="text-sm font-bold mb-2 block" style={{ color: "hsl(210,20%,92%)" }}>2. Your written pitch</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid="pitch-text-input"
                rows={10}
                placeholder={`Answer 3 things:\n• What do you want help with?\n• Why should a judge pick you?\n• What would you actually do with the coaching?`}
                className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none leading-relaxed"
                style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,90%)" }}
              />
              <div className="text-[11px] mt-1" style={{ color: text.length > 1800 ? "hsl(0,70%,60%)" : "hsl(220,15%,45%)" }}>
                {text.length} / 1800 · minimum 80 chars
              </div>
            </div>

            {err && <div className="text-xs" data-testid="pitch-submit-error" style={{ color: "hsl(0,70%,60%)" }}>{err}</div>}

            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              data-testid="pitch-submit-btn"
              className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, hsl(25,100%,55%), hsl(25,100%,45%))",
                color: "white",
                boxShadow: canSubmit ? "0 0 24px hsla(25,100%,55%,0.3)" : "none",
              }}
            >
              {submitting ? "Submitting…" : "Submit my pitch"}
            </button>
          </>
        )}

        <div className="text-[11px] text-center" style={{ color: "hsl(220,15%,40%)" }}>
          Round closes {round?.deadline && new Date(round.deadline).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
