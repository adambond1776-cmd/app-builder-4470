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

const BOOK_TITLE = "The Business of Life, Student Edition – A Student’s Guide to Figuring It Out and Leveling Up";
const BOOK_ISBN = "9798258761231";

const PILOT_SCHOOLS = [
  "Newport High School",
  "Middletown High School",
  "Portsmouth High School",
  "Other Aquidneck Island school",
];

const TOOLKIT_TOOLS = [
  "Four Burners",
  "Weekly Architecture Review",
  "Energy Audit",
  "Signal Board",
  "Operating Agreement",
  "Presence Protocol",
  "90-Day Foundation Sprint",
  "Genius Mining",
  "Household / Advisory Check-ins",
];

const OPPORTUNITY_POINTS = [
  "Join a 30-day summer campus build retreat / working sprint",
  "Shape the first school-ready Teacher Toolkit from real student feedback",
  "Receive public founding contributor recognition if selected",
  "Potential profit-sharing or licensing upside if the toolkit becomes a paid school product",
  "Become one of the local teacher faces of the Newport County rollout",
  "Possible filming for a reality-doc style pilot, always with consent and clear boundaries",
];

const HOW_IT_WORKS = [
  ["1", "Free books go local", "Juniors and seniors at Newport, Middletown, and Portsmouth get the book free."],
  ["2", "Teachers pitch themselves", "Applicants explain what students need and which tool they would test first."],
  ["3", "The community votes", "Students, families, and local supporters help surface the strongest founding-seat candidates."],
  ["4", "Finalists build", "Selected teachers join the 30-day retreat and turn student signal into a classroom-ready toolkit."],
];

const PITCH_FIELDS = [
  "Full name",
  "School",
  "Role / Subject",
  "Why should YOU be selected?",
  "What do students need right now?",
  "Which book tool would you test first?",
  "What teacher/student problem could this solve?",
  "Filming / public-feature comfort",
  "30-day summer retreat availability",
  "Optional short video pitch or photo",
];

export default function TeacherHubPage() {
  const [teachers, setTeachers] = useState(null);
  const [viewerCanVote, setViewerCanVote] = useState(false);
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

  const startTeacherSignIn = () => {
    const redirectUrl = window.location.origin + window.location.pathname;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  useEffect(() => {
    document.title = "Teacher Toolkit Casting Call · MaxCoach";
    reload();

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
      startTeacherSignIn();
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
      const tags = (t.expertise || []).map((e) => EXPERTISE_LABELS[e] || e).join(" ");
      const blob = `${t.name || ""} ${t.school || ""} ${t.role_title || ""} ${tags} ${t.bio || ""} ${
        t.why_great || ""
      }`.toLowerCase();
      return blob.includes(q);
    });
  }, [teachers, filter, search]);

  const topTeachers = useMemo(() => {
    if (!teachers) return [];
    return [...teachers].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 3);
  }, [teachers]);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "radial-gradient(circle at 20% 0%, hsla(185,85%,45%,0.18), transparent 30%), radial-gradient(circle at 85% 12%, hsla(213,100%,55%,0.14), transparent 28%), hsl(220,40%,8%)",
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
              style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(185,85%,45%))" }}
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
                background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))",
              }}
            >
              Apply as a builder
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-10 pb-8 sm:pt-16 sm:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-5 lg:gap-8 items-start mb-8">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
              style={{
                background: "hsla(185,85%,45%,0.12)",
                border: "1px solid hsla(185,85%,45%,0.32)",
                color: "hsl(185,80%,72%)",
              }}
            >
              <span style={{ color: "hsl(185,80%,70%)" }}>●</span>
              Casting call · Founding Teacher Seats
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="font-black leading-[1.02] tracking-tight mb-4"
              style={{ fontSize: "clamp(2.15rem, 5.2vw, 4rem)", color: "hsl(210,20%,96%)" }}
            >
              Teachers — Pitch Yourself for a Founding Teacher Seat
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-base sm:text-lg leading-relaxed mb-6"
              style={{ color: "hsl(220,15%,74%)", maxWidth: "46rem" }}
            >
              This summer we're selecting a small group of local teachers to help turn the book into a
              real school-ready Teacher Toolkit. Students get the book for free. The community votes.
              Finalists pitch. Selected teachers join a 30-day campus build retreat and may earn founding
              contributor status with potential profit-sharing upside.
            </motion.p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowApply(true)}
                data-testid="teacher-toolkit-apply-hero"
                className="px-5 py-3 rounded-2xl font-bold text-sm text-white"
                style={{ background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))" }}
              >
                Apply / Pitch Yourself →
              </button>
              <a
                href="#teacher-vote"
                data-testid="teacher-toolkit-vote-link"
                className="px-5 py-3 rounded-2xl font-bold text-sm text-center no-underline"
                style={{
                  background: "hsla(213,100%,55%,0.12)",
                  color: "hsl(213,100%,78%)",
                  border: "1px solid hsla(213,100%,55%,0.36)",
                }}
              >
                Help choose the founding teachers →
              </a>
            </div>
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 sm:p-6 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, hsla(213,100%,55%,0.16), hsla(185,85%,45%,0.08))",
              border: "1px solid hsla(185,85%,45%,0.34)",
              boxShadow: "0 24px 80px rgba(14, 165, 233, 0.12)",
            }}
            data-testid="teacher-book-card"
          >
            <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(185,80%,72%)" }}>
              Current book
            </div>
            <h2 className="font-black text-xl leading-tight mb-3" style={{ color: "hsl(210,20%,96%)" }}>
              {BOOK_TITLE}
            </h2>
            <div className="text-xs font-bold mb-5" style={{ color: "hsl(220,15%,68%)" }}>
              ISBN: {BOOK_ISBN}
            </div>
            <div className="space-y-3">
              {[
                ["Free for students", "Juniors and seniors in the local pilot get a copy at no cost."],
                ["Reality-doc energy", "A public build challenge with clear consent, real stakes, and local pride."],
                ["Teacher-built", "The toolkit gets shaped by educators who know classrooms, advisory, and students."],
              ].map(([title, body]) => (
                <div key={title} className="p-3 rounded-2xl" style={{ background: "hsla(220,30%,8%,0.48)", border: "1px solid hsla(220,30%,24%,0.7)" }}>
                  <div className="font-black text-sm mb-1" style={{ color: "hsl(210,20%,94%)" }}>{title}</div>
                  <p className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,68%)" }}>{body}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" data-testid="teacher-toolkit-pilot-stats">
          {[
            ["3 high schools", "Newport, Middletown, Portsmouth"],
            ["300 authentic reviews", "Student signal in the first 30 days"],
            ["Founding seats", "Teachers compete for the summer build retreat"],
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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-7" data-testid="teacher-casting-core">
          <div
            className="p-5 sm:p-6 rounded-3xl"
            style={{ background: "hsl(220,30%,11%)", border: "1px solid hsl(220,30%,19%)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(185,80%,72%)" }}>
              Local Pilot
            </div>
            <h2 className="font-black text-xl mb-3" style={{ color: "hsl(210,20%,96%)" }}>
              Free books first. Real student signal next.
            </h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,72%)" }}>
              We are putting {BOOK_TITLE} in front of juniors and seniors at Newport High,
              Middletown High, and Portsmouth High. The first goal is 300 authentic reviews,
              reflections, and tool responses in 30 days.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,72%)" }}>
              The teacher seats are for educators who can translate that student feedback into lessons,
              prompts, check-ins, and classroom routines that schools can actually use.
            </p>
          </div>

          <div
            className="p-5 sm:p-6 rounded-3xl"
            style={{
              background: "linear-gradient(135deg, hsla(185,85%,45%,0.12), hsla(213,100%,55%,0.08))",
              border: "1px solid hsla(185,85%,45%,0.32)",
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(185,80%,72%)" }}>
              The Opportunity / Prize
            </div>
            <h2 className="font-black text-xl mb-3" style={{ color: "hsl(210,20%,96%)" }}>
              This is not a normal teacher profile. It is a founding-seat application.
            </h2>
            <ul className="space-y-2">
              {OPPORTUNITY_POINTS.map((point) => (
                <li key={point} className="text-xs leading-relaxed flex gap-2" style={{ color: "hsl(220,15%,76%)" }}>
                  <span style={{ color: "hsl(185,80%,70%)", fontWeight: 900 }}>✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mb-7" data-testid="teacher-how-it-works">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "hsl(213,100%,70%)" }}>
            How it works
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {HOW_IT_WORKS.map(([step, title, body]) => (
              <div
                key={step}
                className="p-4 rounded-2xl"
                style={{ background: "hsl(220,30%,12%)", border: "1px solid hsl(220,30%,19%)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black mb-3"
                  style={{ background: "linear-gradient(135deg, hsl(213,100%,55%), hsl(185,85%,45%))", color: "white" }}
                >
                  {step}
                </div>
                <div className="font-black text-sm mb-1" style={{ color: "hsl(210,20%,94%)" }}>{title}</div>
                <p className="text-xs leading-relaxed" style={{ color: "hsl(220,15%,66%)" }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <div
          className="p-5 sm:p-6 rounded-3xl mb-7"
          style={{
            background: "linear-gradient(135deg, hsla(213,100%,55%,0.12), hsla(185,85%,45%,0.08))",
            border: "1px solid hsla(213,100%,55%,0.28)",
          }}
          data-testid="teacher-toolkit-builder-vision"
          id="toolkit-tools"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213,100%,75%)" }}>
            Toolkit Tools
          </div>
          <h2 className="font-black text-xl sm:text-2xl mb-3" style={{ color: "hsl(210,20%,96%)" }}>
            Build the teacher version around tools students can actually feel.
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,75%)" }}>
            The founding cohort will test and package practical systems for weekly reflection,
            energy awareness, signal tracking, cleaner agreements, presence, 90-day momentum,
            genius discovery, and household or advisory conversations.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <a
            href="/free-aquidneck-books"
            data-testid="teacher-toolkit-free-books-link"
            className="px-5 py-3 rounded-2xl font-bold text-sm text-center no-underline"
            style={{
              background: "hsla(142,70%,45%,0.12)",
              color: "hsl(142,70%,75%)",
              border: "1px solid hsla(142,70%,45%,0.35)",
            }}
          >
            Claim free student books →
          </a>
          <a
            href="#toolkit-tools"
            data-testid="teacher-toolkit-tools-link"
            className="px-5 py-3 rounded-2xl font-bold text-sm text-center no-underline"
            style={{
              background: "hsl(220,30%,13%)",
              color: "hsl(213,100%,78%)",
              border: "1px solid hsl(220,30%,24%)",
            }}
          >
            See the toolkit tools →
          </a>
          <button
            onClick={() => setShowApply(true)}
            data-testid="teacher-toolkit-apply-secondary"
            className="px-5 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))" }}
          >
            Pitch for a founding seat →
          </button>
        </div>

        <section
          className="p-5 sm:p-6 rounded-3xl mb-8"
          style={{
            background: "linear-gradient(135deg, hsla(185,85%,45%,0.12), hsla(213,100%,55%,0.07))",
            border: "1px solid hsla(185,85%,45%,0.3)",
          }}
          data-testid="teacher-pitch-form-preview"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(185,80%,72%)" }}>
            Teacher Pitch Form
          </div>
          <h2 className="font-black text-xl sm:text-2xl mb-2" style={{ color: "hsl(210,20%,96%)" }}>
            Contestant-style, but grounded in real classroom judgment.
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,74%)" }}>
            Tell us why you should earn a founding teacher seat, what students need now,
            which tool you would test first, what teacher/student problem it could solve,
            and how available you are for the 30-day summer retreat.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-5">
            {PITCH_FIELDS.map((field) => (
              <div
                key={field}
                className="px-3 py-2 rounded-xl text-[11px] font-bold leading-tight"
                style={{ background: "hsl(220,30%,10%)", color: "hsl(210,20%,88%)", border: "1px solid hsl(220,30%,20%)" }}
              >
                {field}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowApply(true)}
            data-testid="teacher-pitch-form-open"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))" }}
          >
            Open the teacher pitch form →
          </button>
        </section>

        <div className="mb-4" data-testid="teacher-roster-controls-heading">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "hsl(185,80%,72%)" }}>
            Current Teacher Pitches
          </div>
          <h2 className="font-black text-xl sm:text-2xl" style={{ color: "hsl(210,20%,96%)" }}>
            Browse the public roster and vote below.
          </h2>
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
                    ? `${EXPERTISE_COLORS[f.k] || "hsl(185,85%,45%)"}22`
                    : "hsl(220,30%,13%)",
                border: `1px solid ${
                  filter === f.k
                    ? `${EXPERTISE_COLORS[f.k] || "hsl(185,85%,45%)"}66`
                    : "hsl(220,30%,22%)"
                }`,
                color:
                  filter === f.k
                    ? EXPERTISE_COLORS[f.k] || "hsl(185,80%,72%)"
                    : "hsl(220,15%,65%)",
              }}
            >
              {f.l}
            </button>
          ))}
        </div>
      </section>

      {/* Voting Section */}
      <section className="max-w-5xl mx-auto px-5 pb-2" data-testid="teacher-leaderboard" id="teacher-vote">
        <div
          className="p-5 sm:p-6 rounded-3xl mb-6"
          style={{
            background:
              "linear-gradient(135deg, hsla(213,100%,55%,0.12), hsla(185,85%,45%,0.07))",
            border: "1px solid hsla(213,100%,55%,0.28)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "hsl(185,80%,72%)" }}
              >
                Voting Section
              </div>
              <h2
                className="font-black text-xl sm:text-2xl leading-tight"
                style={{ color: "hsl(210,20%,95%)" }}
              >
                Help decide which teachers earn a founding seat.
              </h2>
            </div>
            {!viewerCanVote && (
              <button
                type="button"
                onClick={startTeacherSignIn}
                data-testid="teacher-leaderboard-signin-link"
                className="text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap"
                style={{
                  background: "hsla(213,100%,55%,0.18)",
                  color: "hsl(213,100%,80%)",
                  border: "1px solid hsla(213,100%,55%,0.4)",
                }}
              >
                Sign in to vote
              </button>
            )}
          </div>
          <p
            className="text-sm leading-relaxed mb-5"
            style={{ color: "hsl(220,15%,72%)" }}
            data-testid="teacher-hub-vote-explainer"
          >
            Approved teacher pitches appear here. Students, families, and community members can vote for
            the educators they want to see turn the Student Edition into a school-ready Teacher Toolkit.
          </p>

          {teachers === null ? (
            <div className="p-4 rounded-2xl text-sm" style={{ background: "hsl(220,30%,11%)", border: "1px solid hsl(220,30%,19%)", color: "hsl(220,15%,65%)" }}>
              Loading teacher pitches...
            </div>
          ) : topTeachers.length === 0 ? (
            <div className="p-4 rounded-2xl" style={{ background: "hsl(220,30%,11%)", border: "1px dashed hsl(220,30%,24%)" }}>
              <div className="font-black text-sm mb-1" style={{ color: "hsl(210,20%,92%)" }}>
                No approved pitches yet.
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "hsl(220,15%,65%)" }}>
                The first approved teacher applications will become the public voting roster.
              </p>
              <button
                onClick={() => setShowApply(true)}
                data-testid="teacher-vote-empty-cta"
                className="px-4 py-2 rounded-full text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))" }}
              >
                Be the first to pitch →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topTeachers.map((t, idx) => (
                <div
                  key={t.id}
                  data-testid={`leaderboard-row-${idx + 1}`}
                  className="p-3 rounded-2xl flex items-center gap-3"
                  style={{
                    background: "hsl(220,30%,11%)",
                    border:
                      idx === 0
                        ? "1px solid hsla(185,85%,45%,0.52)"
                        : "1px solid hsl(220,30%,19%)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm"
                    style={{
                      background:
                        idx === 0
                          ? "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))"
                          : idx === 1
                          ? "hsl(213,36%,44%)"
                          : "hsl(185,45%,34%)",
                      color: "white",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: "hsl(210,20%,92%)" }}>
                      {t.name}
                    </div>
                    <div className="text-[11px] truncate" style={{ color: "hsl(220,15%,60%)" }}>
                      {t.school || (t.expertise || []).map((e) => EXPERTISE_LABELS[e] || e).slice(0, 2).join(" · ") || "Founding teacher pitch"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-base" style={{ color: "hsl(185,80%,72%)" }}>
                      {t.vote_count || 0}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "hsl(220,15%,55%)" }}>
                      votes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
                ? "No founding teacher pitches yet."
                : "No matches for this filter."}
            </h3>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "hsl(220,15%,65%)" }}>
              {teachers.length === 0
                ? "Be the first to pitch for a founding seat."
                : "Try a different expertise or clear the search."}
            </p>
            {teachers.length === 0 && (
              <button
                onClick={() => setShowApply(true)}
                data-testid="teacher-hub-empty-cta"
                className="px-5 py-2.5 rounded-full font-bold text-sm text-white"
                style={{
                  background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))",
                }}
              >
                Pitch yourself →
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
              "linear-gradient(135deg, hsla(185,85%,45%,0.12), hsla(213,100%,55%,0.06))",
            border: "1px solid hsla(185,85%,45%,0.25)",
          }}
        >
          <div className="flex-1">
            <h3
              className="font-black mb-2"
              style={{ fontSize: "clamp(1.2rem, 2.4vw, 1.6rem)", color: "hsl(210,20%,95%)" }}
            >
              Ready to pitch for a founding seat?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(220,15%,75%)" }}>
              Selected teachers help turn the book into practical tools for classrooms,
              advisory periods, mentoring, and the 300-review local pilot.
            </p>
          </div>
          <button
            onClick={() => setShowApply(true)}
            data-testid="teacher-hub-bottom-cta"
            className="px-6 py-3 rounded-full font-bold text-sm text-white whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))",
            }}
          >
            Apply / Pitch Yourself →
          </button>
        </div>
      </section>

      <AnimatePresence>
        {showApply && (
          <ApplyModal onClose={() => setShowApply(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TeacherCard({ teacher, index, onVote, voting, viewerCanVote }) {
  const expertise = teacher.expertise || [];
  const accent = EXPERTISE_COLORS[expertise[0]] || "hsl(185,85%,45%)";
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
                  background: `${EXPERTISE_COLORS[e] || "hsl(185,85%,45%)"}22`,
                  color: EXPERTISE_COLORS[e] || "hsl(185,80%,72%)",
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
          Founding-seat pitch
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

function ApplyModal({ onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [bio, setBio] = useState("");
  const [whyGreat, setWhyGreat] = useState("");
  const [studentNeed, setStudentNeed] = useState("");
  const [toolkitTool, setToolkitTool] = useState("");
  const [teacherStudentProblem, setTeacherStudentProblem] = useState("");
  const [filmedPublicly, setFilmedPublicly] = useState("");
  const [filmedNote, setFilmedNote] = useState("");
  const [summerAvailability, setSummerAvailability] = useState("");
  const [videoPitchUrl, setVideoPitchUrl] = useState("");
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
      !filmedPublicly ||
      !summerAvailability.trim() ||
      studentNeed.trim().length < 30 ||
      teacherStudentProblem.trim().length < 30 ||
      bio.trim().length < 30 ||
      whyGreat.trim().length < 30 ||
      picks.length === 0
    ) {
      setErr(
        "Fill all required fields. Student need, teacher/student problem, credibility snapshot, and your pitch each need at least 30 characters. Pick at least one expertise tag."
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
          teacher_student_problem: teacherStudentProblem.trim() || null,
          filmed_publicly: filmedPublicly || null,
          filmed_note: filmedNote.trim() || null,
          summer_availability: summerAvailability.trim() || null,
          video_pitch_url: videoPitchUrl.trim() || null,
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
              Adam reviews every applicant personally. If it's a fit, your pitch can move into
              the public voting roster for a founding Teacher Toolkit seat.
            </p>
            <button
              onClick={onClose}
              data-testid="teacher-apply-close-btn"
              className="px-6 py-2.5 rounded-full font-bold text-sm text-white"
              style={{
                background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} data-testid="teacher-apply-form" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-xl" style={{ color: "hsl(210,20%,95%)" }}>
                Pitch for a Founding Teacher Seat
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

            <FormField label="What problem between teachers and students could this toolkit help solve? *">
              <textarea
                value={teacherStudentProblem}
                onChange={(e) => setTeacherStudentProblem(e.target.value)}
                data-testid="teacher-apply-teacher-student-problem"
                rows={3}
                placeholder="Name the disconnect, friction, or missed opportunity you see every week."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
              <div
                className="text-[11px] mt-1"
                style={{ color: teacherStudentProblem.length > 1000 ? "hsl(0,70%,65%)" : "hsl(220,15%,50%)" }}
              >
                {teacherStudentProblem.length} / 1000
              </div>
            </FormField>

            <FormField label="Your credibility snapshot * (30–1500 chars)">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                data-testid="teacher-apply-bio"
                rows={4}
                placeholder="Who you teach, what you've built, and why students trust you."
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
                placeholder="What would make you valuable in a 30-day build retreat with students, teachers, and this book?"
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
                I am interested in a 30-day campus build retreat to test tools,
                improve them with student feedback, and help shape the Teacher Toolkit.
              </span>
            </label>

            <FormField label="Are you comfortable being filmed or publicly featured? *">
              <select
                value={filmedPublicly}
                onChange={(e) => setFilmedPublicly(e.target.value)}
                data-testid="teacher-apply-filmed-publicly"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              >
                <option value="">Pick one</option>
                <option value="yes">Yes — I am open to being featured</option>
                <option value="maybe">Maybe — I would want to discuss boundaries first</option>
                <option value="no">No — I only want to help behind the scenes</option>
              </select>
            </FormField>

            <FormField label="Filming / public-feature note (optional)">
              <textarea
                value={filmedNote}
                onChange={(e) => setFilmedNote(e.target.value)}
                data-testid="teacher-apply-filmed-note"
                rows={2}
                placeholder="Anything Adam should know about consent, comfort level, school policy, or boundaries?"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none leading-relaxed"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
            </FormField>

            <FormField label="Availability for a 30-day summer campus working retreat *">
              <input
                value={summerAvailability}
                onChange={(e) => setSummerAvailability(e.target.value)}
                data-testid="teacher-apply-summer-availability"
                placeholder="Available July afternoons, flexible in August, weekends only..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
            </FormField>

            <FormField label="Short video pitch or photo link (optional)">
              <input
                value={videoPitchUrl}
                onChange={(e) => setVideoPitchUrl(e.target.value)}
                data-testid="teacher-apply-video-pitch"
                placeholder="Paste a YouTube, Loom, Google Drive, or image URL"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "hsl(220,30%,13%)",
                  border: "1px solid hsl(220,30%,22%)",
                  color: "hsl(210,20%,90%)",
                }}
              />
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
                background: "linear-gradient(135deg, hsl(185,85%,45%), hsl(213,100%,55%))",
              }}
            >
              {busy ? "Submitting…" : "Pitch yourself for a founding seat →"}
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
