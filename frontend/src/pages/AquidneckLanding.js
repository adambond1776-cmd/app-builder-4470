import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { apiJSON } from "../lib/api";

// Newport / Aquidneck Island ocean stock photo (Unsplash, free to use)
const HERO_BG =
  "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?auto=format&fit=crop&w=1920&q=70";

// Real book cover — uploaded by Adam (Hidden Genius Labs LLC)
const BOOK_COVER =
  "https://customer-assets.emergentagent.com/job_app-builder-4470/artifacts/0n8vtbwc_Screenshot%202026-05-05%20125144.png";

const SCHOOLS = [
  { value: "newport_high", label: "Newport High" },
  { value: "middletown_high", label: "Middletown High" },
  { value: "portsmouth_high", label: "Portsmouth High" },
  { value: "other", label: "Other" },
];

const ROLES = [
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "teacher_staff", label: "Teacher / Staff" },
];

const BURNERS = [
  { label: "School / Work", color: "#3b82f6" },
  { label: "Relationships", color: "#f97316" },
  { label: "Health", color: "#10b981" },
  { label: "Your Dreams", color: "#a855f7" },
];

export default function AquidneckLanding() {
  const formRef = useRef(null);
  const sampleRef = useRef(null);

  const [first_name, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("newport_high");
  const [otherSchool, setOtherSchool] = useState("");
  const [role, setRole] = useState("junior");
  const [reality, setReality] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null); // { already_claimed }

  useEffect(() => {
    document.title = "Free Books for Aquidneck Island Students · MaxCoach";
  }, []);

  const scrollToForm = () =>
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const scrollToSample = () =>
    sampleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (!first_name.trim() || !email.trim()) {
      setErr("Please fill in your first name and email.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiJSON("/aquidneck/claim", {
        method: "POST",
        body: JSON.stringify({
          first_name,
          email,
          school,
          other_school_name: school === "other" ? otherSchool : null,
          role,
          reality_project_interest: reality,
        }),
      });
      setDone({ already_claimed: !!res.already_claimed });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex) {
      setErr(ex.message || "Something went wrong. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="w-full"
      style={{
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      data-testid="aquidneck-landing"
    >
      {/* Top nav */}
      <header
        className="sticky top-0 z-30 backdrop-blur"
        style={{
          background: "rgba(255,255,255,0.85)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #0d9488)",
              }}
            >
              M
            </div>
            <div className="font-black text-base tracking-tight">MaxCoach</div>
          </div>
          <button
            onClick={scrollToForm}
            data-testid="nav-claim-btn"
            className="text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-full text-white"
            style={{
              background: "linear-gradient(135deg, #0ea5e9, #0d9488)",
            }}
          >
            Claim Free Books
          </button>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "min(85vh, 760px)" }}
        data-testid="hero-section"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('${HERO_BG}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(13,148,136,0.85) 0%, rgba(14,116,144,0.85) 50%, rgba(15,23,42,0.92) 100%)",
          }}
          aria-hidden
        />

        <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-20 sm:pt-24 sm:pb-28 text-white">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-6"
            style={{
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.22)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{ color: "#5eead4" }}>●</span>
            Free for Aquidneck Island · Limited Local Gift
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-black leading-[1.05] tracking-tight mb-5"
            style={{ fontSize: "clamp(2rem, 5.2vw, 3.6rem)" }}
          >
            Feeling overwhelmed trying to juggle school, work,
            relationships, health & your dreams?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-base sm:text-lg leading-relaxed mb-6"
            style={{ color: "rgba(255,255,255,0.9)", maxWidth: "44rem" }}
          >
            You're not failing — you're just running on all four burners at
            once. Discover a simple framework that helps 16–26 year olds balance
            life and figure out what you really want… right now, before you
            graduate.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="inline-block mb-7 px-4 py-2 rounded-xl font-black"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(94,234,212,0.5)",
              color: "#5eead4",
              fontSize: "clamp(1rem, 2.4vw, 1.25rem)",
            }}
          >
            FREE for Aquidneck Island Juniors, Seniors (16+) & Teachers
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={scrollToForm}
              data-testid="hero-claim-btn"
              className="px-7 py-4 rounded-full font-black text-base shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, #5eead4 0%, #0ea5e9 100%)",
                color: "#022c22",
                boxShadow:
                  "0 20px 50px -10px rgba(94,234,212,0.5), 0 0 0 1px rgba(255,255,255,0.18)",
              }}
            >
              Claim Your Free Books Now →
            </button>
            <button
              onClick={scrollToSample}
              data-testid="hero-sample-btn"
              className="px-6 py-4 rounded-full font-bold text-sm sm:text-base"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "white",
              }}
            >
              Read a Free Sample First
            </button>
          </motion.div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="px-5 py-16 sm:py-20" data-testid="what-you-get">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div
              className="text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#0d9488" }}
            >
              What's inside
            </div>
            <h2
              className="font-black leading-tight"
              style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.4rem)" }}
            >
              Two free books built to be useful — this week.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              data-testid="card-burners"
              className="p-7 rounded-3xl"
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px -15px rgba(15,23,42,0.15)",
              }}
            >
              <div
                className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                style={{ background: "#ecfeff", color: "#0e7490" }}
              >
                Book One
              </div>
              <h3 className="font-black text-xl mb-2">
                The Four Burners Framework
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#475569" }}
              >
                A simple, practical way to balance the four main areas of your
                life — School/Work, Relationships, Health, and Your Dreams —
                without burning out or quitting everything.
              </p>
              <div className="flex gap-2 mt-5">
                {BURNERS.map((b) => (
                  <div
                    key={b.label}
                    className="flex-1 h-1.5 rounded-full"
                    style={{ background: b.color, opacity: 0.85 }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              data-testid="card-prompt-bonus"
              className="p-7 rounded-3xl relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #0d9488 0%, #0ea5e9 100%)",
                color: "white",
                boxShadow: "0 10px 30px -10px rgba(13,148,136,0.45)",
              }}
            >
              <div
                className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "white",
                }}
              >
                Free Bonus
              </div>
              <h3 className="font-black text-xl mb-2">
                Prompt Level-Up Guide
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                Ready-to-use AI prompts that help you discover your strengths,
                explore careers, and build a clear plan for what's next — using
                tools you already have access to.
              </p>
              <div className="text-[11px] mt-5 opacity-80">
                For ChatGPT, Claude, Gemini, or NotebookLM
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LOOK INSIDE / SAMPLE */}
      <section
        ref={sampleRef}
        className="px-5 py-16 sm:py-20"
        style={{ background: "white" }}
        data-testid="sample-section"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Cover image — real book cover */}
          <div className="order-2 md:order-1">
            <div
              className="aspect-[3/4] rounded-2xl mx-auto max-w-xs overflow-hidden relative"
              style={{
                boxShadow:
                  "0 30px 60px -20px rgba(15,23,42,0.55), 0 0 0 1px rgba(15,23,42,0.08)",
              }}
              data-testid="book-cover-image"
            >
              <img
                src={BOOK_COVER}
                alt="The Business of Life: Student Edition — by Adam Bond Devereau"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div
              className="text-center mt-4 text-xs"
              style={{ color: "#64748b" }}
            >
              <strong style={{ color: "#0f172a" }}>The Business of Life</strong>{" "}
              · Student Edition
              <div className="text-[11px] mt-0.5">by Adam Bond Devereau</div>
            </div>
          </div>

          {/* Sample text */}
          <div className="order-1 md:order-2">
            <div
              className="text-[11px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#0d9488" }}
            >
              Look inside
            </div>
            <h2
              className="font-black leading-tight mb-5"
              style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.2rem)" }}
            >
              Read a free sample before claiming.
            </h2>

            <div
              className="p-5 rounded-2xl mb-5"
              style={{
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "#475569" }}
              >
                Contents
              </div>
              <ol
                className="text-sm space-y-1.5"
                style={{ color: "#334155" }}
              >
                <li>· Find Your Road First</li>
                <li>· Introduction: The Stove</li>
                <li>1. The Myth of Separation</li>
                <li>2. You Already Have the OS</li>
                <li>3. Why the Home Is Losing</li>
                <li>4. The Disillusionment Tax</li>
                <li>5. Genius Mining</li>
                <li>6. The Foundation</li>
                <li>7. Leading the People Around You</li>
                <li>8. The Integration Playbook</li>
                <li>9. Activation</li>
                <li>10. Your Life. Your Build.</li>
                <li className="pt-2 italic" style={{ color: "#64748b" }}>
                  + The Toolkit (8 hands-on tools)
                </li>
              </ol>
            </div>

            <div className="text-sm leading-relaxed space-y-3 mb-5" style={{ color: "#334155" }}>
              <div
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#0d9488" }}
              >
                Introduction · The Stove
              </div>
              <p className="italic" style={{ color: "#64748b" }}>
                "You don't rise to the level of your goals. You fall to the
                level of your systems." — James Clear, <em>Atomic Habits</em>
              </p>
              <p>
                There's a theory that's been quietly accepted as gospel in elite
                business circles — and handed down to everyone else who wanted
                to get ahead. It goes like this: your life is a stove with four
                burners. <strong>Work. Relationships. Health. Yourself.</strong>{" "}
                To be successful, you have to turn one off. To be{" "}
                <em>really</em> successful, you have to turn two off.
              </p>
              <p>
                The highest performers in the world didn't just hear this
                theory. They lived it — and some of them said so out loud. Elon
                Musk has been blunt about the personal cost of building Tesla
                and SpaceX simultaneously. Sam Altman has spoken candidly about
                what it takes to run OpenAI at this moment in history. Jeff
                Bezos called the personal tradeoffs "harmony" — which, when you
                read between the lines, means: accept what you're giving up and
                make peace with it. These aren't failures of character. These
                are some of the most disciplined operators alive. And they all
                arrived at the same conclusion.
              </p>
              <p>
                Here's the problem: most of you reading this are eighteen,
                twenty-two, or somewhere in between. You haven't built the
                empire yet. You're trying to figure out which road to take while
                managing school or work or a trade, your relationships, your
                health, and the terrifying question of who you're actually
                becoming. And someone already told you — directly or indirectly
                — that you can't run all of it at once.
              </p>
              <p>
                <strong>This book is a direct challenge to that idea.</strong>{" "}
                The Four Burners theory assumes the stove is fixed. That the
                hardware is the constraint. What it misses is that most people
                aren't failing because they have too many burners — they're
                failing because nobody ever gave them a system for running all
                of them on the same architecture. The answer isn't to shut
                burners off. <strong>The answer is to upgrade the stove.</strong>
              </p>
            </div>

            {/* Four Burners visual excerpt */}
            <div
              className="p-5 rounded-2xl"
              style={{
                background: "#0f172a",
                color: "white",
              }}
              data-testid="burners-diagram"
            >
              <div
                className="text-[10px] font-bold uppercase tracking-widest mb-3"
                style={{ color: "#5eead4" }}
              >
                The Four Burners — at a glance
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BURNERS.map((b) => (
                  <div
                    key={b.label}
                    className="p-3 rounded-xl flex items-center gap-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      style={{
                        background: b.color,
                        boxShadow: `0 0 16px ${b.color}`,
                      }}
                    />
                    <div className="text-sm font-bold">{b.label}</div>
                  </div>
                ))}
              </div>
              <p
                className="text-xs mt-4 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Pick two to run hot. Let two simmer. Trade-offs aren't failure —
                they're the whole game.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={scrollToForm}
                data-testid="sample-claim-btn"
                className="px-6 py-3.5 rounded-full font-bold text-sm text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #0ea5e9, #0d9488)",
                }}
              >
                Claim Full Books →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section
        className="px-5 py-16 sm:py-20"
        style={{ background: "#f1f5f9" }}
        data-testid="who-section"
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="text-[11px] font-bold uppercase tracking-widest mb-2 text-center"
            style={{ color: "#0d9488" }}
          >
            Who this is for
          </div>
          <h2
            className="font-black leading-tight text-center mb-8"
            style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.2rem)" }}
          >
            Made for Aquidneck Island — right now, while it still matters.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <div
              className="p-6 rounded-2xl"
              style={{ background: "white", border: "1px solid #e2e8f0" }}
            >
              <div
                className="text-2xl mb-3"
                style={{ color: "#0d9488" }}
              >
                ●
              </div>
              <h3 className="font-black text-base mb-2">Juniors & Seniors (16+)</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                Newport High, Middletown High, and Portsmouth High students
                trying to figure out what's next without burning out before
                graduation.
              </p>
            </div>
            <div
              className="p-6 rounded-2xl"
              style={{ background: "white", border: "1px solid #e2e8f0" }}
            >
              <div className="text-2xl mb-3" style={{ color: "#0ea5e9" }}>
                ●
              </div>
              <h3 className="font-black text-base mb-2">
                Teachers, counselors & staff
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                A useful tool for yourself — and one you can hand to a student
                who's struggling with the juggle.
              </p>
            </div>
          </div>

          <div
            className="p-5 rounded-2xl text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(14,165,233,0.08))",
              border: "1px solid rgba(13,148,136,0.25)",
            }}
          >
            <strong style={{ color: "#0f766e" }}>Perfect timing:</strong>
            <span style={{ color: "#334155" }}>
              {" "}
              use these tools now while you still have counselors, teachers, and
              school momentum behind you — before graduation pulls the rug.
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-5 py-16 sm:py-20" data-testid="how-it-works">
        <div className="max-w-4xl mx-auto">
          <div
            className="text-[11px] font-bold uppercase tracking-widest mb-2 text-center"
            style={{ color: "#0d9488" }}
          >
            How it works
          </div>
          <h2
            className="font-black leading-tight text-center mb-10"
            style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.2rem)" }}
          >
            Three steps. About 90 seconds total.
          </h2>

          <div className="space-y-4">
            {[
              {
                n: 1,
                t: "Fill out the quick form below",
                d: "Get instant download links emailed straight to you — no waiting, no shipping fee, no catch.",
                icon: "✉",
              },
              {
                n: 2,
                t: "Read & start using the tools this week",
                d: "While you're still in school. Use the framework on real life — your homework load, your relationships, your sleep, your goals.",
                icon: "✦",
              },
              {
                n: 3,
                t: "Optional: submit a short video on maxcoach.app",
                d: "Be considered for our potential Level-Up Reality Project — a Rhode Island student spotlight series.",
                icon: "▶",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="p-5 rounded-2xl flex gap-4 items-start"
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px -8px rgba(15,23,42,0.1)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #0d9488, #0ea5e9)",
                    color: "white",
                  }}
                >
                  {s.n}
                </div>
                <div>
                  <h3 className="font-black text-base mb-1">{s.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REALITY PROJECT TEASE */}
      <section
        className="px-5 py-16 sm:py-20"
        data-testid="reality-tease"
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="p-7 sm:p-10 rounded-3xl relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)",
              color: "white",
              boxShadow:
                "0 30px 60px -20px rgba(12,74,110,0.6), inset 0 0 0 1px rgba(94,234,212,0.18)",
            }}
          >
            <div
              className="text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "#5eead4" }}
            >
              ▶ Be on camera (optional)
            </div>
            <h3
              className="font-black leading-tight mb-3"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
            >
              Want to be one of the first Rhode Island students featured in our
              Level-Up Reality Project?
            </h3>
            <p
              className="text-sm sm:text-base leading-relaxed"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              After reading, film a quick 15–30 second video on{" "}
              <strong>maxcoach.app</strong> sharing your level-up journey —
              what burner you're turning up, what you're letting simmer, what
              changed for you. We're picking a small first cohort.
            </p>
          </div>
        </div>
      </section>

      {/* CLAIM FORM */}
      <section
        ref={formRef}
        className="px-5 py-16 sm:py-20"
        style={{
          background:
            "linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)",
        }}
        data-testid="claim-form-section"
      >
        <div className="max-w-2xl mx-auto">
          {done ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-7 sm:p-10 rounded-3xl text-center"
              data-testid="claim-success"
              style={{
                background: "white",
                border: "1px solid #5eead4",
                boxShadow: "0 30px 60px -20px rgba(13,148,136,0.3)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl mb-4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981, #0d9488)",
                }}
              >
                ✓
              </div>
              <h3 className="font-black text-2xl mb-2">
                {done.already_claimed
                  ? "You already claimed — check your email."
                  : "Thank you!"}
              </h3>
              <p
                className="text-sm leading-relaxed mb-5"
                style={{ color: "#475569" }}
              >
                Check your email for instant download links to both books. (If
                you don't see it in 5 minutes, peek in spam or promotions and
                drag it to your inbox so the next email lands clean.)
              </p>
              <div
                className="p-4 rounded-2xl text-sm"
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                }}
              >
                If the books help you, an honest review on Amazon means the
                world. Want to film your level-up video?{" "}
                <a
                  href="/"
                  data-testid="success-app-link"
                  style={{ color: "#0d9488", fontWeight: 700 }}
                >
                  Open MaxCoach →
                </a>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-7">
                <div
                  className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: "#0d9488" }}
                >
                  Claim your free books
                </div>
                <h2
                  className="font-black leading-tight"
                  style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.4rem)" }}
                >
                  Fill this out. We'll email both books in seconds.
                </h2>
              </div>

              <form
                onSubmit={submit}
                data-testid="claim-form"
                className="p-6 sm:p-8 rounded-3xl space-y-4"
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  boxShadow:
                    "0 30px 60px -20px rgba(15,23,42,0.15)",
                }}
              >
                <div>
                  <label
                    className="text-xs font-bold mb-1.5 block"
                    style={{ color: "#334155" }}
                  >
                    First name
                  </label>
                  <input
                    type="text"
                    value={first_name}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-testid="form-first-name"
                    required
                    placeholder="Alex"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="text-xs font-bold mb-1.5 block"
                    style={{ color: "#334155" }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="form-email"
                    required
                    placeholder="alex@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="text-xs font-bold mb-1.5 block"
                    style={{ color: "#334155" }}
                  >
                    School
                  </label>
                  <select
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    data-testid="form-school"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                    }}
                  >
                    {SCHOOLS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {school === "other" && (
                    <input
                      type="text"
                      value={otherSchool}
                      onChange={(e) => setOtherSchool(e.target.value)}
                      data-testid="form-other-school"
                      placeholder="Which school?"
                      className="mt-2 w-full px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                      }}
                    />
                  )}
                </div>

                <div>
                  <label
                    className="text-xs font-bold mb-1.5 block"
                    style={{ color: "#334155" }}
                  >
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    data-testid="form-role"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  className="flex items-start gap-3 p-4 rounded-xl cursor-pointer"
                  style={{
                    background: "#f0fdfa",
                    border: "1px solid #99f6e4",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reality}
                    onChange={(e) => setReality(e.target.checked)}
                    data-testid="form-reality-checkbox"
                    className="mt-1 w-4 h-4 accent-teal-600"
                  />
                  <span className="text-sm leading-relaxed" style={{ color: "#0f766e" }}>
                    <strong>I'm interested in the Level-Up Reality Project.</strong>{" "}
                    Send me details on filming a short video.
                  </span>
                </label>

                {err && (
                  <div
                    className="p-3 rounded-xl text-sm"
                    data-testid="form-error"
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                    }}
                  >
                    {err}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  data-testid="form-submit-btn"
                  className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)",
                    boxShadow:
                      "0 16px 40px -10px rgba(13,148,136,0.45)",
                  }}
                >
                  {busy ? "Sending…" : "Get My Free Books Now →"}
                </button>

                <p
                  className="text-xs text-center leading-relaxed"
                  style={{ color: "#64748b" }}
                >
                  We email the books once and won't sell or share your address.
                  Cancel future updates with one click.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section
        className="px-5 py-16 sm:py-20"
        style={{ background: "white" }}
        data-testid="social-proof"
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="text-[11px] font-bold uppercase tracking-widest mb-2 text-center"
            style={{ color: "#0d9488" }}
          >
            From students like you
          </div>
          <h2
            className="font-black leading-tight text-center mb-8"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
          >
            "Overwhelmed → in control. Before graduation."
          </h2>

          <blockquote
            className="p-7 rounded-3xl mb-6 text-center italic"
            style={{
              background: "#f1f5f9",
              border: "1px solid #e2e8f0",
              fontSize: "clamp(1.05rem, 2.2vw, 1.25rem)",
              color: "#0f172a",
            }}
          >
            "This helped me go from overwhelmed to feeling in control before
            graduation."
            <div
              className="not-italic text-sm mt-3 font-bold"
              style={{ color: "#475569" }}
            >
              — Recent college grad
            </div>
          </blockquote>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="aspect-video rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px dashed rgba(255,255,255,0.15)",
                }}
                data-testid={`testimonial-video-slot-${i}`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-1">▶</div>
                  <div className="text-xs uppercase tracking-widest">
                    Video Testimonial {i}
                  </div>
                  <div className="text-[10px] mt-1 opacity-70">Coming soon</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="px-5 py-10"
        style={{
          background: "#0f172a",
          color: "rgba(255,255,255,0.65)",
        }}
        data-testid="footer"
      >
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white"
              style={{
                background:
                  "linear-gradient(135deg, #0ea5e9, #0d9488)",
              }}
            >
              M
            </div>
            <span className="font-black text-white text-sm">MaxCoach</span>
          </div>
          <div className="text-xs leading-relaxed" style={{ maxWidth: "40rem", margin: "0 auto" }}>
            Made with love for Aquidneck Island. A free community gift from a
            local Rhode Island author for Newport, Middletown & Portsmouth
            students and educators.
          </div>
          <div className="text-[11px] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>Part of Hidden Genius Labs LLC</span>
            <span>·</span>
            <a
              href="/pricing"
              data-testid="footer-pricing-link"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Pricing
            </a>
            <span>·</span>
            <a
              href="/pitches"
              data-testid="footer-pitches-link"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Max Pitch
            </a>
            <span>·</span>
            <a
              href="/sponsor"
              data-testid="footer-sponsor-link"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Sponsor
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
