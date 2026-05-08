// TeacherHubPage — public roster of approved teachers/coaches who want to be in the toolkit.
// Visually mirrors the Max Pitch Hub aesthetic but is fully standalone — does NOT import or
// modify any pitch-related code. Lives at /teachers (also /teacher-hub).
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiJSON } from "../lib/api";

const EXPERTISE_LABELS = {
  video_production: "Video Production",
  coaching: "Coaching",
  ai_tools: "AI Tools",
  writing: "Writing",
  college_prep: "College Prep",
  entrepreneurship: "Entrepreneurship",
  mental_health: "Mental Health",
  fitness_health: "Fitness & Health",
  music: "Music",
  art_design: "Art & Design",
  stem: "STEM",
  languages: "Languages",
  trades: "Trades",
  other: "Other",
};

const EXPERTISE_COLORS = {
  video_production: "#0ea5e9",
  coaching: "#f97316",
  ai_tools: "#a855f7",
  writing: "#ec4899",
  college_prep: "#10b981",
  entrepreneurship: "#eab308",
  mental_health: "#06b6d4",
  fitness_health: "#84cc16",
  music: "#f43f5e",
  art_design: "#8b5cf6",
  stem: "#3b82f6",
  languages: "#14b8a6",
  trades: "#f59e0b",
  other: "#94a3b8",
};

export default function TeacherHubPage() {
  const [teachers, setTeachers] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showApply, setShowApply] = useState(false);

  useEffect(() => {
    document.title = "Teacher Hub · MaxCoach";
    apiJSON("/teachers")
      .then((res) => setTeachers(res.teachers || []))
      .catch(() => setTeachers([]));
  }, []);

  const filtered = useMemo(() => {
    if (!teachers) return [];
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (filter !== "all" && !(t.expertise || []).includes(filter)) return false;
      if (!q) return true;
      const blob = `${t.name || ""} ${t.bio || ""} ${t.why_great || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [teachers, filter, search]);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "hsl(220,40%,8%)",
        color: "hsl(210,20%,90%)",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      data-testid="teacher-hub-page"
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: "hsla(220,40%,8%,0.85)",
          borderBottom: "1px solid hsl(220,30%,18%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 no-underline"
            style={{ color: "hsl(210,20%,90%)" }}
            data-testid="teacher-hub-logo"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(280,80%,55%))" }}
            >
              M
            </div>
            <span className="font-black text-sm">MaxCoach</span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/pitches"
              className="text-xs font-bold px-3 py-1.5 rounded-full no-underline"
              style={{ color: "hsl(220,15%,70%)" }}
              data-testid="teacher-hub-pitches-link"
            >
              Max Pitch
            </a>
            <button
              onClick={() => setShowApply(true)}
              data-testid="teacher-hub-apply-btn"
              className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{
                background: "linear-gradient(135deg, hsl(280,80%,55%), hsl(213,100%,55%))",
              }}
            >
              Become a teacher
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-8 sm:pt-16 sm:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
          style={{
            background: "hsla(280,80%,55%,0.12)",
            border: "1px solid hsla(280,80%,55%,0.3)",
            color: "hsl(280,80%,80%)",
          }}
        >
          <span style={{ color: "hsl(280,80%,75%)" }}>●</span>
          Teacher Hub
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-black leading-[1.05] tracking-tight mb-4"
          style={{ fontSize: "clamp(2rem, 4.8vw, 3.4rem)", color: "hsl(210,20%,95%)" }}
        >
          The humans behind the toolkit.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-base sm:text-lg leading-relaxed mb-8"
          style={{ color: "hsl(220,15%,70%)", maxWidth: "44rem" }}
        >
          Coaches, video pros, makers, and educators who teach inside MaxCoach.
          Not influencers. Real people students will actually meet, work with, or
          learn from.
        </motion.p>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, expertise, or what they teach…"
            data-testid="teacher-hub-search"
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
            style={{
              background: "hsl(220,30%,13%)",
              border: "1px solid hsl(220,30%,22%)",
              color: "hsl(210,20%,90%)",
            }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {[{ k: "all", l: "All" }, ...Object.entries(EXPERTISE_LABELS).map(([k, l]) => ({ k, l }))].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              data-testid={`teacher-hub-filter-${f.k}`}
              className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all"
              style={{
                background:
                  filter === f.k
                    ? `${EXPERTISE_COLORS[f.k] || "hsl(280,80%,55%)"}22`
                    : "hsl(220,30%,13%)",
                border: `1px solid ${
                  filter === f.k
                    ? `${EXPERTISE_COLORS[f.k] || "hsl(280,80%,55%)"}66`
                    : "hsl(220,30%,22%)"
                }`,
                color:
                  filter === f.k
                    ? EXPERTISE_COLORS[f.k] || "hsl(280,80%,80%)"
                    : "hsl(220,15%,65%)",
              }}
            >
              {f.l}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-5xl mx-auto px-5 pb-16">
        {teachers === null ? (
          <div
            className="text-center py-20 text-sm"
            style={{ color: "hsl(220,15%,55%)" }}
            data-testid="teacher-hub-loading"
          >
            Loading teachers…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16 px-5 rounded-3xl"
            data-testid="teacher-hub-empty"
            style={{
              background: "hsl(220,30%,11%)",
              border: "1px dashed hsl(220,30%,22%)",
            }}
          >
            <div className="text-3xl mb-3">📚</div>
            <h3 className="font-black text-lg mb-2" style={{ color: "hsl(210,20%,90%)" }}>
              {teachers.length === 0
                ? "No teachers in the hub yet."
                : "No matches for this filter."}
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,65%)" }}>
              {teachers.length === 0
                ? "Be the first one in. The hub launches with the people who say yes early."
                : "Try a different expertise or clear the search."}
            </p>
            {teachers.length === 0 && (
              <button
                onClick={() => setShowApply(true)}
                data-testid="teacher-hub-empty-cta"
                className="px-5 py-2.5 rounded-full font-bold text-sm text-white"
                style={{
                  background: "linear-gradient(135deg, hsl(280,80%,55%), hsl(213,100%,55%))",
                }}
              >
                Apply to be a teacher →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t, i) => (
              <TeacherCard key={t.id} teacher={t} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA strip */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div
          className="p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center gap-5"
          style={{
            background:
              "linear-gradient(135deg, hsla(280,80%,55%,0.12), hsla(213,100%,55%,0.06))",
            border: "1px solid hsla(280,80%,55%,0.25)",
          }}
        >
          <div className="flex-1">
            <h3
              className="font-black mb-2"
              style={{ fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)", color: "hsl(210,20%,95%)" }}
            >
              Teach inside MaxCoach.
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,75%)" }}>
              Drop your bio + the one thing you'd be unreasonably great at teaching.
              Adam reviews every application personally.
            </p>
          </div>
          <button
            onClick={() => setShowApply(true)}
            data-testid="teacher-hub-bottom-cta"
            className="px-6 py-3 rounded-full font-bold text-sm text-white whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, hsl(280,80%,55%), hsl(213,100%,55%))",
            }}
          >
            Become a teacher →
          </button>
        </div>
      </section>

      <AnimatePresence>
        {showApply && (
          <ApplyModal
            onClose={() => setShowApply(false)}
            onSubmitted={() => {
              setShowApply(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherCard({ teacher, index }) {
  const expertise = teacher.expertise || [];
  const accent = EXPERTISE_COLORS[expertise[0]] || "hsl(280,80%,55%)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      data-testid={`teacher-card-${teacher.id}`}
      className="p-5 rounded-2xl flex flex-col"
      style={{
        background: "hsl(220,30%,11%)",
        border: "1px solid hsl(220,30%,19%)",
        minHeight: "260px",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        {teacher.photo_url ? (
          <img
            src={teacher.photo_url}
            alt={teacher.name}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            style={{ border: `2px solid ${accent}55` }}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-xl"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
            }}
          >
            {(teacher.name || "?").trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div
            className="font-black text-base leading-tight"
            style={{ color: "hsl(210,20%,95%)" }}
          >
            {teacher.name}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {expertise.slice(0, 2).map((e) => (
              <span
                key={e}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${EXPERTISE_COLORS[e] || "hsl(280,80%,55%)"}22`,
                  color: EXPERTISE_COLORS[e] || "hsl(280,80%,80%)",
                }}
              >
                {EXPERTISE_LABELS[e] || e}
              </span>
            ))}
            {expertise.length > 2 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsl(220,30%,15%)", color: "hsl(220,15%,65%)" }}
              >
                +{expertise.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>

      <p
        className="text-sm leading-relaxed mb-3"
        style={{ color: "hsl(220,15%,75%)" }}
      >
        {(teacher.bio || "").length > 180
          ? `${teacher.bio.slice(0, 180)}…`
          : teacher.bio}
      </p>

      <div
        className="mt-auto pt-3 border-t"
        style={{ borderColor: "hsl(220,30%,18%)" }}
      >
        <div
          className="text-[10px] font-bold uppercase tracking-widest mb-1"
          style={{ color: accent }}
        >
          Why I'm great
        </div>
        <p
          className="text-xs leading-relaxed italic"
          style={{ color: "hsl(220,15%,75%)" }}
        >
          {(teacher.why_great || "").length > 140
            ? `"${teacher.why_great.slice(0, 140)}…"`
            : `"${teacher.why_great}"`}
        </p>
      </div>
    </motion.div>
  );
}

function ApplyModal({ onClose, onSubmitted }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [whyGreat, setWhyGreat] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [picks, setPicks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  const togglePick = (k) =>
    setPicks((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    setErr(null);
    if (!name.trim() || !email.trim() || bio.trim().length < 30 || whyGreat.trim().length < 30 || picks.length === 0) {
      setErr(
        "Fill all required fields. Bio + 'Why I'm great' both need at least 30 characters, and pick at least one expertise tag."
      );
      return;
    }
    setBusy(true);
    try {
      await apiJSON("/teachers/apply", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          bio: bio.trim(),
          why_great: whyGreat.trim(),
          expertise: picks,
          photo_url: photoUrl.trim() || null,
        }),
      });
      setDone(true);
    } catch (ex) {
      setErr(ex.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      data-testid="teacher-apply-modal"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 sm:p-7"
        style={{
          background: "hsl(220,35%,11%)",
          border: "1px solid hsl(220,30%,22%)",
        }}
      >
        {done ? (
          <div data-testid="teacher-apply-success" className="text-center py-6">
            <div className="text-4xl mb-3">✓</div>
            <h3 className="font-black text-xl mb-2" style={{ color: "hsl(210,20%,95%)" }}>
              Application in.
            </h3>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "hsl(220,15%,70%)" }}>
              Adam reviews every applicant personally. If it's a fit, you'll be
              live on the Teacher Hub within a few days.
            </p>
            <button
              onClick={onClose}
              data-testid="teacher-apply-close-btn"
              className="px-6 py-2.5 rounded-full font-bold text-sm text-white"
              style={{
                background: "linear-gradient(135deg, hsl(280,80%,55%), hsl(213,100%,55%))",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} data-testid="teacher-apply-form" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-xl" style={{ color: "hsl(210,20%,95%)" }}>
                Become a teacher
              </h2>
              <button
                type="button"
                onClick={onClose}
                data-testid="teacher-apply-cancel-btn"
                aria-label="Close"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: "hsl(220,30%,14%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(220,15%,70%)",
                }}
              >
                ×
              </button>
            </div>

            <FormField label="Your name *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="teacher-apply-name"
                placeholder="Alex Rivera"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
            </FormField>

            <FormField label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="teacher-apply-email"
                placeholder="alex@example.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
            </FormField>

            <FormField label="Profile photo URL (optional)">
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                data-testid="teacher-apply-photo"
                placeholder="https://… (paste an image URL)"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
            </FormField>

            <FormField label="Expertise * (pick at least one)">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(EXPERTISE_LABELS).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => togglePick(k)}
                    data-testid={`teacher-apply-expertise-${k}`}
                    className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: picks.includes(k)
                        ? `${EXPERTISE_COLORS[k]}22`
                        : "hsl(220,30%,13%)",
                      border: `1px solid ${
                        picks.includes(k)
                          ? `${EXPERTISE_COLORS[k]}66`
                          : "hsl(220,30%,22%)"
                      }`,
                      color: picks.includes(k)
                        ? EXPERTISE_COLORS[k]
                        : "hsl(220,15%,65%)",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Bio * (30–1500 chars)">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                data-testid="teacher-apply-bio"
                rows={4}
                placeholder="Where you've been, what you've built, who you've helped."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
              <div
                className="text-[11px] mt-1"
                style={{ color: bio.length > 1500 ? "hsl(0,70%,65%)" : "hsl(220,15%,50%)" }}
              >
                {bio.length} / 1500
              </div>
            </FormField>

            <FormField label="Why I'm great for the toolkit * (30–600 chars)">
              <textarea
                value={whyGreat}
                onChange={(e) => setWhyGreat(e.target.value)}
                data-testid="teacher-apply-why-great"
                rows={3}
                placeholder="The one thing you'd be unreasonably great at teaching here."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
              <div
                className="text-[11px] mt-1"
                style={{ color: whyGreat.length > 600 ? "hsl(0,70%,65%)" : "hsl(220,15%,50%)" }}
              >
                {whyGreat.length} / 600
              </div>
            </FormField>

            {err && (
              <div
                data-testid="teacher-apply-error"
                className="p-3 rounded-xl text-xs"
                style={{
                  background: "hsla(0,75%,55%,0.08)",
                  border: "1px solid hsla(0,75%,55%,0.3)",
                  color: "hsl(0,75%,82%)",
                }}
              >
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              data-testid="teacher-apply-submit-btn"
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, hsl(280,80%,55%), hsl(213,100%,55%))",
              }}
            >
              {busy ? "Submitting…" : "Submit application →"}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label
        className="text-xs font-bold mb-1.5 block"
        style={{ color: "hsl(220,15%,80%)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
