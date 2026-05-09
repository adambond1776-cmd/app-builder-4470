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

const PILOT_SCHOOLS = [
  "Newport High School",
  "Middletown High School",
  "Portsmouth High School",
  "Other Aquidneck Island school",
];

const TOOLKIT_TOOLS = [
  "Weekly Architecture Review",
  "Energy Audit",
  "Signal Board",
  "Operating Agreement",
  "Presence Protocol",
  "90-Day Foundation Sprint",
  "Genius Mining Starter",
  "Household / Advisory Check-In",
];

export default function TeacherHubPage() {
  const [teachers, setTeachers] = useState(null);
  const [viewerCanVote, setViewerCanVote] = useState(false);
  const [me, setMe] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showApply, setShowApply] = useState(false);
  const [voting, setVoting] = useState({}); // { [teacherId]: true } while in flight
  const [voteErr, setVoteErr] = useState(null);

  const reload = () =>
    apiJSON("/teachers")
      .then((res) => {
        setTeachers(res.teachers || []);
        setViewerCanVote(!!res.viewer_can_vote);
      })
      .catch(() => setTeachers([]));

  useEffect(() => {
    document.title = "Teacher Hub · MaxCoach";
    reload();
    apiJSON("/auth/me").then(setMe).catch(() => setMe(null));

    // Real-time vote sync: re-poll the public list every 12s so vote counts +
    // leaderboard order stay live across browsers without a manual refresh.
    // Pauses while the tab is hidden to save bandwidth, resumes on focus.
    let interval = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(reload, 12000);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", start);
    window.addEventListener("blur", stop);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", start);
      window.removeEventListener("blur", stop);
    };
  }, []);

  const handleVote = async (teacherId) => {
    if (!viewerCanVote) {
      setVoteErr("Sign in to vote for the toolkit builder.");
      setTimeout(() => setVoteErr(null), 4000);
      return;
    }
    if (voting[teacherId]) return;
    setVoting((v) => ({ ...v, [teacherId]: true }));
    setVoteErr(null);
    // Optimistic update
    setTeachers((prev) =>
      (prev || []).map((t) =>
        t.id === teacherId
          ? { ...t, has_voted: !t.has_voted, vote_count: (t.vote_count || 0) + (t.has_voted ? -1 : 1) }
          : t
      )
    );
    try {
      const res = await apiJSON(`/teachers/${teacherId}/vote`, { method: "POST" });
      // Reconcile with the truth from server
      setTeachers((prev) =>
        (prev || []).map((t) =>
          t.id === teacherId ? { ...t, vote_count: res.vote_count, has_voted: res.has_voted } : t
        )
      );
    } catch (e) {
      // Roll back optimistic on failure
      reload();
      setVoteErr(e.message || "Couldn't record your vote. Try again.");
      setTimeout(() => setVoteErr(null), 4000);
    } finally {
      setVoting((v) => {
        const next = { ...v };
        delete next[teacherId];
        return next;
      });
    }
  };

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
              Apply as a builder
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
          Teacher Toolkit Builder
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-black leading-[1.05] tracking-tight mb-4"
          style={{ fontSize: "clamp(2rem, 4.8vw, 3.4rem)", color: "hsl(210,20%,95%)" }}
        >
          Help build the Teacher Toolkit.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-base sm:text-lg leading-relaxed mb-8"
          style={{ color: "hsl(220,15%,70%)", maxWidth: "44rem" }}
        >
          We are giving <strong>The Business of Life: Student Edition</strong> to
          juniors and seniors across Newport, Middletown, and Portsmouth — then
          inviting local teachers to help turn the book's tools into a practical
          school-ready system.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" data-testid="teacher-toolkit-pilot-stats">
          {[
            ["3 schools", "Newport, Middletown, Portsmouth"],
            ["300 reviews", "Authentic student feedback in 30 days"],
            ["1 toolkit", "Built with teachers, not handed down"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="p-4 rounded-2xl"
              style={{ background: "hsl(220,30%,12%)", border: "1px solid hsl(220,30%,19%)" }}
            >
              <div className="font-black text-lg" style={{ color: "hsl(210,20%,95%)" }}>{k}</div>
              <div className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,65%)" }}>{v}</div>
            </div>
          ))}
        </div>

        <div
          className="p-5 sm:p-6 rounded-3xl mb-7"
          style={{
            background: "linear-gradient(135deg, hsla(213,100%,55%,0.12), hsla(142,70%,45%,0.06))",
            border: "1px solid hsla(213,100%,55%,0.28)",
          }}
          data-testid="teacher-toolkit-builder-vision"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,75%)" }}>
            Student Edition → Teacher Toolkit
          </div>
          <h2 className="font-black text-xl sm:text-2xl mb-3" style={{ color: "hsl(210,20%,96%)" }}>
            Students do not need another adult telling them to try harder.
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,75%)" }}>
            They need adults who can help them build better systems: weekly reflection,
            energy awareness, signal tracking, cleaner communication, presence, 90-day
            growth sprints, and a way to mine the genius already hiding in how they think.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TOOLKIT_TOOLS.map((tool) => (
              <div
                key={tool}
                className="px-3 py-2 rounded-xl text-[11px] font-bold leading-tight"
                style={{
                  background: "hsla(220,30%,10%,0.55)",
                  color: "hsl(210,20%,88%)",
                  border: "1px solid hsl(220,30%,20%)",
                }}
              >
                {tool}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={() => setShowApply(true)}
            data-testid="teacher-toolkit-apply-hero"
            className="flex-1 px-5 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg, hsl(280,80%,55%), hsl(213,100%,55%))" }}
          >
            Apply as a Teacher Builder →
          </button>
          <a
            href="/free-aquidneck-books"
            data-testid="teacher-toolkit-free-books-link"
            className="flex-1 px-5 py-3 rounded-2xl font-bold text-sm text-center no-underline"
            style={{
              background: "hsla(142,70%,45%,0.12)",
              color: "hsl(142,70%,75%)",
              border: "1px solid hsla(142,70%,45%,0.35)",
            }}
          >
            Claim free student books →
          </a>
        </div>

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

      {/* LEADERBOARD — shows top 3 by vote count */}
      {teachers && teachers.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 pb-2" data-testid="teacher-leaderboard">
          <div
            className="p-5 sm:p-6 rounded-3xl mb-6"
            style={{
              background:
                "linear-gradient(135deg, hsla(40,90%,55%,0.10), hsla(280,80%,55%,0.06))",
              border: "1px solid hsla(40,90%,55%,0.28)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "hsl(40,90%,70%)" }}
                  >
                    Toolkit Builder Leaderboard
                  </div>
                  <div
                    className="font-black text-base sm:text-lg leading-tight"
                    style={{ color: "hsl(210,20%,95%)" }}
                  >
                    Vote for who should help build the Teacher Toolkit.
                  </div>
                </div>
              </div>
              {!viewerCanVote && (
                <a
                  href="/"
                  data-testid="teacher-leaderboard-signin-link"
                  className="text-[11px] font-bold px-3 py-1.5 rounded-full no-underline whitespace-nowrap"
                  style={{
                    background: "hsla(213,100%,55%,0.18)",
                    color: "hsl(213,100%,80%)",
                    border: "1px solid hsla(213,100%,55%,0.4)",
                  }}
                >
                  Sign in to vote
                </a>
              )}
            </div>
            <p
              className="text-xs leading-relaxed mb-1"
              style={{ color: "hsl(210,20%,90%)" }}
              data-testid="teacher-hub-vote-explainer"
            >
              <strong>Vote for the teacher you want shaping the tools students
              will actually use in advisory, classrooms, mentoring, and life.</strong>
            </p>
            <p
              className="text-[11px] leading-relaxed mb-4"
              style={{ color: "hsl(220,15%,65%)" }}
            >
              Students and teachers each get one vote per teacher. This is how
              local student signal helps decide who should translate the book
              into a school-ready system.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[...teachers]
                .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                .slice(0, 3)
                .map((t, idx) => (
                  <div
                    key={t.id}
                    data-testid={`leaderboard-row-${idx + 1}`}
                    className="p-3 rounded-2xl flex items-center gap-3"
                    style={{
                      background: "hsl(220,30%,11%)",
                      border:
                        idx === 0
                          ? "1px solid hsla(40,90%,55%,0.5)"
                          : "1px solid hsl(220,30%,19%)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm"
                      style={{
                        background:
                          idx === 0
                            ? "linear-gradient(135deg, hsl(40,90%,55%), hsl(25,95%,55%))"
                            : idx === 1
                            ? "hsl(220,15%,55%)"
                            : "hsl(25,55%,45%)",
                        color: "white",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-sm truncate"
                        style={{ color: "hsl(210,20%,92%)" }}
                      >
                        {t.name}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "hsl(220,15%,60%)" }}
                      >
                        {(t.expertise || [])
                          .map((e) => EXPERTISE_LABELS[e] || e)
                          .slice(0, 2)
                          .join(" · ") || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="font-black text-base"
                        style={{ color: "hsl(40,90%,70%)" }}
                      >
                        {t.vote_count || 0}
                      </div>
                      <div
                        className="text-[9px] font-bold uppercase tracking-widest"
                        style={{ color: "hsl(220,15%,55%)" }}
                      >
                        votes
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Inline vote error toast */}
      {voteErr && (
        <div className="max-w-5xl mx-auto px-5">
          <div
            data-testid="teacher-vote-error"
            className="p-3 rounded-xl text-xs mb-4"
            style={{
              background: "hsla(0,75%,55%,0.08)",
              border: "1px solid hsla(0,75%,55%,0.3)",
              color: "hsl(0,75%,82%)",
            }}
          >
            {voteErr}
          </div>
        </div>
      )}

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
              <TeacherCard
                key={t.id}
                teacher={t}
                index={i}
                onVote={() => handleVote(t.id)}
                voting={!!voting[t.id]}
                viewerCanVote={viewerCanVote}
              />
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
              Help build the school-ready version.
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,75%)" }}>
              Apply to help turn the Student Edition into practical tools for
              classrooms, advisory periods, mentoring, and the 300-review local pilot.
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
            Apply as a Teacher Builder →
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

function TeacherCard({ teacher, index, onVote, voting, viewerCanVote }) {
  const expertise = teacher.expertise || [];
  const accent = EXPERTISE_COLORS[expertise[0]] || "hsl(280,80%,55%)";
  const voteCount = teacher.vote_count || 0;
  const hasVoted = !!teacher.has_voted;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      data-testid={`teacher-card-${teacher.id}`}
      className="p-5 rounded-2xl flex flex-col"
      style={{
        background: "hsl(220,30%,11%)",
        border: hasVoted
          ? `1px solid ${accent}66`
          : "1px solid hsl(220,30%,19%)",
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
            className="font-black text-base leading-tight flex items-center gap-2"
            style={{ color: "hsl(210,20%,95%)" }}
          >
            <span className="truncate">{teacher.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {teacher.school && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "hsla(213,100%,55%,0.16)", color: "hsl(213,100%,75%)" }}
              >
                {teacher.school}
              </span>
            )}
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
        {/* Live vote count badge — top-right of card */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center px-2.5 py-1 rounded-xl min-w-[44px]"
          data-testid={`teacher-vote-count-${teacher.id}`}
          style={{
            background: "hsla(40,90%,55%,0.12)",
            border: "1px solid hsla(40,90%,55%,0.32)",
          }}
        >
          <div className="font-black text-base leading-none" style={{ color: "hsl(40,90%,72%)" }}>
            {voteCount}
          </div>
          <div
            className="text-[8px] font-bold uppercase tracking-widest mt-0.5"
            style={{ color: "hsl(40,90%,60%)" }}
          >
            votes
          </div>
        </div>
      </div>

      <p
        className="text-sm leading-relaxed mb-3"
        style={{ color: "hsl(220,15%,75%)" }}
      >
        {teacher.role_title && (
          <span style={{ color: "hsl(210,20%,90%)", fontWeight: 700 }}>{teacher.role_title}: </span>
        )}
        {(teacher.bio || "").length > 180
          ? `${teacher.bio.slice(0, 180)}…`
          : teacher.bio}
      </p>

      <div
        className="pt-3 border-t mb-3"
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
        {teacher.toolkit_tool && (
          <div className="text-[11px] mt-2" style={{ color: "hsl(220,15%,60%)" }}>
            Tool to test: <span style={{ color: accent, fontWeight: 700 }}>{teacher.toolkit_tool}</span>
          </div>
        )}
      </div>

      {/* VOTE BUTTON — sticks to bottom of card */}
      <button
        type="button"
        onClick={onVote}
        disabled={voting}
        data-testid={`teacher-vote-btn-${teacher.id}`}
        aria-pressed={hasVoted}
        className="mt-auto w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: hasVoted
            ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
            : viewerCanVote
            ? "hsla(40,90%,55%,0.16)"
            : "hsl(220,30%,13%)",
          border: hasVoted
            ? `1px solid ${accent}aa`
            : viewerCanVote
            ? "1px solid hsla(40,90%,55%,0.4)"
            : "1px solid hsl(220,30%,22%)",
          color: hasVoted
            ? "white"
            : viewerCanVote
            ? "hsl(40,90%,72%)"
            : "hsl(220,15%,65%)",
        }}
      >
        {voting ? (
          "Saving…"
        ) : hasVoted ? (
          <>
            <span>✓</span>
            <span>Your toolkit-builder vote</span>
          </>
        ) : viewerCanVote ? (
          <>
            <span>🔨</span>
            <span>Vote for Toolkit Builder</span>
          </>
        ) : (
          <>
            <span>🔒</span>
            <span>Sign in to vote</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

function ApplyModal({ onClose, onSubmitted }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [bio, setBio] = useState("");
  const [whyGreat, setWhyGreat] = useState("");
  const [studentNeed, setStudentNeed] = useState("");
  const [toolkitTool, setToolkitTool] = useState("");
  const [retreatInterest, setRetreatInterest] = useState(false);
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
    if (
      !name.trim() ||
      !email.trim() ||
      !school.trim() ||
      !roleTitle.trim() ||
      !toolkitTool ||
      studentNeed.trim().length < 30 ||
      bio.trim().length < 30 ||
      whyGreat.trim().length < 30 ||
      picks.length === 0
    ) {
      setErr(
        "Fill all required fields. Student need, bio, and your pitch each need at least 30 characters, and pick at least one expertise tag."
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
          school: school.trim() || null,
          role_title: roleTitle.trim() || null,
          bio: bio.trim(),
          why_great: whyGreat.trim(),
          student_need: studentNeed.trim() || null,
          toolkit_tool: toolkitTool || null,
          retreat_interest: retreatInterest,
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
              considered for the founding Teacher Toolkit Builder cohort.
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
                Apply as a Teacher Builder
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

            <FormField label="School / organization *">
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                data-testid="teacher-apply-school"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              >
                <option value="">Pick one</option>
                {PILOT_SCHOOLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Role / subject *">
              <input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                data-testid="teacher-apply-role-title"
                placeholder="English teacher, advisory lead, coach, counselor..."
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

            <FormField label="Tool from the book you want to test first *">
              <select
                value={toolkitTool}
                onChange={(e) => setToolkitTool(e.target.value)}
                data-testid="teacher-apply-toolkit-tool"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              >
                <option value="">Pick a tool</option>
                {TOOLKIT_TOOLS.map((tool) => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>
            </FormField>

            <FormField label="What do students need right now that school is not fully giving them? *">
              <textarea
                value={studentNeed}
                onChange={(e) => setStudentNeed(e.target.value)}
                data-testid="teacher-apply-student-need"
                rows={3}
                placeholder="Name the real gap you see. Be honest and practical."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
              <div
                className="text-[11px] mt-1"
                style={{ color: studentNeed.length > 1000 ? "hsl(0,70%,65%)" : "hsl(220,15%,50%)" }}
              >
                {studentNeed.length} / 1000
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

            <FormField label="Why should you earn a founding teacher spot? * (30–600 chars)">
              <textarea
                value={whyGreat}
                onChange={(e) => setWhyGreat(e.target.value)}
                data-testid="teacher-apply-why-great"
                rows={3}
                placeholder="What would make you valuable in a 3-month build with students, teachers, and this book?"
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

            <label
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: "hsl(220,30%,13%)", border: "1px solid hsl(220,30%,22%)" }}
            >
              <input
                type="checkbox"
                checked={retreatInterest}
                onChange={(e) => setRetreatInterest(e.target.checked)}
                data-testid="teacher-apply-retreat-interest"
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,72%)" }}>
                I am interested in a 1-month campus working group / retreat-style pilot to test tools,
                improve them with student feedback, and help shape the Teacher Edition.
              </span>
            </label>

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
