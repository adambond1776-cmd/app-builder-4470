import { useState } from "react";
import { apiJSON } from "../lib/api";

export default function MilesIdeas({ onBack }) {
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);

  const cats = [
    { id: "subject", label: "A Subject", color: "hsl(160,70%,50%)" },
    { id: "format", label: "Format / UX", color: "hsl(213,100%,60%)" },
    { id: "tutor", label: "Live Tutor", color: "hsl(35,100%,60%)" },
    { id: "homeschool", label: "Homeschool", color: "hsl(270,80%,65%)" },
    { id: "other", label: "Something Else", color: "hsl(220,15%,55%)" },
  ];

  const submit = async () => {
    if (idea.trim().length < 10 || !category) return;
    setSubmitting(true);
    setErr(null);
    try {
      await apiJSON("/miles/ideas", {
        method: "POST",
        body: JSON.stringify({ idea: idea.trim(), category }),
      });
      setSent(true);
    } catch (e) {
      setErr(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full overflow-y-auto" data-testid="miles-ideas-screen">
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "hsl(220,30%,18%)", background: "hsla(220,35%,9%,0.95)" }}
      >
        <button
          onClick={onBack}
          data-testid="miles-ideas-back-btn"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "hsl(220,30%,14%)", border: "1px solid hsl(220,30%,22%)", color: "hsl(210,20%,85%)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="font-black" style={{ color: "hsl(210,20%,95%)" }}>
          Shape Miles Academy
        </div>
      </div>
      <div className="px-5 py-6 space-y-5">
        {sent ? (
          <div className="text-center py-10" data-testid="miles-ideas-sent-state">
            <div className="text-5xl mb-3">💡</div>
            <h2 className="text-xl font-black mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Got it.
            </h2>
            <p className="text-sm" style={{ color: "hsl(220,15%,60%)" }}>
              Adam reads every one. Good ones become features — and founding members see them first.
            </p>
            <button
              onClick={onBack}
              data-testid="miles-ideas-done-btn"
              className="mt-6 px-8 py-3 rounded-xl font-semibold text-sm"
              style={{ background: "hsl(160,70%,45%)", color: "white" }}
            >
              Back
            </button>
          </div>
        ) : (
          <>
            <div className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,70%)" }}>
              What subject, feature, or format would make Miles Academy genuinely useful for your learner? One idea at a time.
            </div>
            <div>
              <div className="text-sm font-bold mb-2" style={{ color: "hsl(210,20%,92%)" }}>
                Your idea
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                data-testid="miles-ideas-text-input"
                rows={5}
                placeholder="Be specific. What subject, what grade, what outcome?"
                className="w-full resize-none rounded-xl px-3 py-3 text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
              <div className="text-[10px] mt-1" style={{ color: "hsl(220,15%,40%)" }}>
                {idea.length}/1500 · min 10 chars
              </div>
            </div>
            <div>
              <div className="text-sm font-bold mb-2" style={{ color: "hsl(210,20%,92%)" }}>
                What category?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    data-testid={`miles-ideas-cat-${c.id}`}
                    className="py-2.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: category === c.id ? c.color : "hsl(220,30%,14%)",
                      color: category === c.id ? "white" : "hsl(210,15%,75%)",
                      border: "1px solid " + (category === c.id ? c.color : "hsl(220,30%,22%)"),
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {err && (
              <div className="text-xs" style={{ color: "hsl(0,70%,60%)" }}>
                {err}
              </div>
            )}
            <button
              onClick={submit}
              disabled={idea.trim().length < 10 || !category || submitting}
              data-testid="miles-ideas-submit-btn"
              className="w-full py-4 rounded-2xl font-bold text-base disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, hsl(160,70%,45%), hsl(160,70%,35%))", color: "white" }}
            >
              {submitting ? "Sending…" : "Send to Adam"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
