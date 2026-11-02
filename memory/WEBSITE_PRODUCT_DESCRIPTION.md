# Max Coach — Website Product Description & Feature Guide

**Purpose of this document:** A detailed, website-ready description of Max Coach and its related experiences, based on the product and implementation documentation in this repository. You can adapt the “Ready-to-use website copy” directly for your website. The feature-status notes are for internal accuracy; they are not all intended as marketing copy.

---

## Ready-to-use website copy

### Short description

**Max Coach is an AI-powered life-coaching companion for young people.** Built around Adam Bond Devereau’s *The Business of Life* framework, Max helps teens and young adults think through school, work, relationships, health, personal growth, and what they want to do next—with direct, practical coaching tailored to their goals.

### Main website description

Life is bigger than school or work alone. Max Coach helps young people look at the whole picture and make their next move with intention.

Choose the road that best fits where you are right now—**School, Work, Trade, or Figuring It Out**—and talk through what is happening, what matters to you, and what you can do next. Max is designed to be direct, warm, and practical: not a lecture, not generic motivation, and not a substitute for doing the work yourself. It helps you cut through the noise, notice patterns, and turn a big or confusing situation into a concrete next step.

At the heart of Max is **The Four Burners**: Work/School, Relationships, Health, and Self. Instead of treating success as a choice between one area of life and the rest, the framework helps you notice how all four are doing and where a small adjustment could make a difference.

Max can also remember useful context between conversations through a concise **Memory Card**. It may capture a young person’s goals, current challenges, commitments, and coaching context. The user can view, edit, or reset this memory, keeping control over what Max carries forward.

### Coaching for the road you’re on

Max adapts its coaching lens to four starting points:

- **School:** academics, admissions and transitions, genuine interests, and building a direction beyond simply getting through class.
- **Work:** skills, workplace dynamics, compensation, side-income ideas, and longer-term career or ownership possibilities.
- **Trade:** apprenticeships, skilled-trade career paths, choosing a trade, and the economics of progressing toward greater responsibility or ownership.
- **Figuring It Out:** getting clarity through small experiments, separating real curiosity from outside expectations, and choosing a useful next step without pretending to have everything mapped out.

A user can choose a track and can change it as their circumstances evolve.

### A practical framework for the whole person

The Four Burners framework asks users to pay attention to four connected parts of life:

1. **Work / School** — learning, training, work, and what the user is building.
2. **Relationships** — family, friends, and the people around them.
3. **Health** — sleep, movement, energy, and mental well-being.
4. **Self** — identity, values, confidence, and who the user is becoming.

The app presents the framework as a way to reflect and make adjustments, not as a promise that life will always be perfectly balanced.

### Academic coaching with Miles Academy

**Miles Academy** is the academic-coaching experience alongside Max. A learner chooses one of three coaching styles:

- **Ivy:** patient, warm, and encouraging.
- **Vance:** energetic and motivational, connecting today’s work to a future goal.
- **Drake:** structured and rigorous, with clear expectations and practical study loops.

Miles supports conversations across **math, writing, reading, science, history, languages, test preparation, college applications, and general study skills**. Its coaching is designed to teach the underlying pattern—not simply do an assignment for the learner. For example, when a student asks for a solution, the coaching instructions call for working through an example and then inviting the student to try the next one.

Miles draws on four learning themes: **Mastery, Motivation, Method, and Mindset**. That means developing subject understanding, connecting effort to a learner’s goals, strengthening study methods such as active recall and spaced review, and building confidence through practice.

#### The Accelerator and the Genius Stack

Miles Academy includes Adam’s **Accelerator** approach to learning: work through a large amount of material, separate high-signal ideas from distractions, organize what matters into meaningful chunks, and build a mental model that makes the topic easier to understand and explain.

The product also introduces the **Genius Stack**, a suggested workflow using three separate tools:

- **NotebookLM** to gather and compare source material such as articles, PDFs, videos, and podcasts.
- **Obsidian** as a personal knowledge vault where the learner can keep and develop notes.
- **Gemini** to synthesize or build creative work from organized, source-grounded notes.

The app provides a walkthrough and coaching guidance for this workflow. **It does not, based on the reviewed code, connect to or automatically read a user’s Obsidian vault.** The tools are presented as an external workflow, not as built-in vault synchronization.

### A digital workbook for reflection and follow-through

The Digital Workbook brings selected ideas from *The Business of Life* into interactive pages. It supports choosing a current road and completing tools such as the **Weekly Architecture Review**, a guided reflection across the four burners. Users can record what went well, what felt difficult or was avoided, decisions they are putting off, and one change they want to try next week. Max can provide a short reflection on a saved entry.

The workbook also displays tool status and recent entries. The **Weekly Architecture Review** is the clearly implemented, fillable recurring review in the reviewed source. Other workbook tools—such as the Energy Audit, Signal Board, Operating Agreement, Presence Protocol, and 90-Day Foundation Sprint—are marked as coming soon in the implementation. Genius Mining is described as an imported profile rather than a workbook survey completed directly in this app.

### Support for parents and families with Maya

Parents have a separate coaching experience called **Maya**. Maya is designed to help parents think through family routines, connection, resources, and each family member’s individual growth. The Family Burners framework is:

- **Structure** — routines, responsibilities, boundaries, and the rhythm of home.
- **Connection** — conversation, presence, and quality time.
- **Resources** — the family’s finite time, energy, and money.
- **Individual Growth** — the growth of each person in the family, including the parent.

Maya keeps its coaching history and Memory Card separate from the young person’s Max conversations. Parent and child experiences have separate message limits and separate memory controls.

A parent can link a young person’s account using an invite code. The young person chooses which categories of information to share, such as their Memory Card, Four Burners information, or activity. The parent dashboard is designed to show only permitted, shared information; the implementation documentation states that raw chat content is not shared with a parent. Either side can unlink the accounts.

Parents can also submit product ideas and vote on proposed family features. These collaboration tools are ways for families to help shape the roadmap; they are not coaching sessions themselves.

### Max Pitch: a route to human coaching

**Max Pitch** is a separate coaching-opportunity program connected to the app. Young people can submit a pitch for consideration for one-on-one coaching with an executive. Public pitch pages can be shared, and visitors can upvote pitches. Judges use a private link to review submissions and indicate whom they are interested in coaching. Selection is based on fit; upvotes are a signal for attention, not a guarantee of selection.

Round capacity, deadlines, sponsor details, and availability can change. A waitlist is available when a round reaches its submission limit. Do not promise a specific coach, number of available spots, deadline, or sponsor unless it has been confirmed for the current round.

### Teacher Hub and community pathways

The app also includes a public Teacher Hub experience. Educators and coaches can apply to be considered for a public roster. Profiles appear on the hub after approval, and signed-in users can vote for approved teachers. This is a separate pathway for educators and coaches; it should not be described as guaranteed access to tutoring or a live tutor appointment.

### Who it’s for

Max Coach is built primarily for young people navigating school, early work, skilled trades, and the transition into adulthood. Miles Academy focuses on academic learning and can also support parents guiding a learner. Maya is designed for parents and caregivers who want a dedicated space to reflect on family life and their own parenting challenges.

### Suggested calls to action

- **Start a conversation with Max**
- **Explore academic coaching with Miles Academy**
- **Talk with Maya about family life**
- **Explore the Accelerator and Genius Stack**
- **See current Max Pitch opportunities**
- **Explore the Teacher Hub**

---

## Feature guide and status notes

### Core app experiences documented in the code

- AI life coaching with Max, with four selectable coaching tracks.
- Four Burners reflection framework.
- User-controlled Max Memory Card: view, edit, and reset.
- Miles Academy academic coaching, three coach personas, nine subject contexts, and a separate Miles memory.
- Accelerator and Genius Stack explanations and walkthrough.
- Maya parent coaching with a separate parent memory and chat history.
- Family linking with a time-limited invite code and user-controlled sharing settings.
- Digital Workbook with road selection and a live Weekly Architecture Review; some other tools are marked as coming soon.
- Max Pitch submissions, public pitch pages, voting, and judge review.
- Public Teacher Hub with applications, approval, and voting.
- Public pricing, sponsor, pitch, and community campaign pages.

### Accuracy and publication checks

1. **Describe AI as coaching support, not a guaranteed outcome.** Avoid claims that the app diagnoses, treats, or replaces a human educator, therapist, counselor, parent, or emergency service.
2. **Do not imply Obsidian integration.** The Genius Stack is an instructional workflow featuring third-party tools. The reviewed implementation does not show automatic vault access or syncing.
3. **Separate live features from roadmap items.** The Weekly Architecture Review is marked live; several other workbook tools are marked coming soon. Parent polls also include future-looking feature ideas, which should not be advertised as already delivered.
4. **Confirm prices and checkout before publishing.** Product configuration contains example and founding prices, but pricing, availability, payment-provider settings, and recurring billing can change. The repository notes that recurring subscriptions are not the same as the one-time checkout/founding-lock flow.
5. **Confirm Max Pitch round details.** Capacity, dates, eligibility, sponsor, and number of coaching matches are round-specific.
6. **Be precise about privacy.** The documented family design does not share raw kid chat content with parents and lets the young person control selected shared categories. Avoid broader claims such as “nothing is ever stored” or “all information is private” unless verified against the current privacy policy and deployment.
7. **Verify current operations.** Repository documentation describes an evolving beta. Check the live website and deployment before stating that every listed feature, email delivery, or checkout path is currently available to the public.

---

## Internal source pointers

These repository files informed this description:

- `backend/server.py` — Max, Maya, Miles, chat memory, family privacy, workbook, Max Pitch, Teacher Hub, and payment behavior.
- `backend/config.py` — configured tracks, subjects, personas, limits, and feature flags.
- `frontend/src/App.js` — product screens and public routes.
- `frontend/src/pages/GeniusStackPage.js` — user-facing Accelerator/Genius Stack walkthrough.
- `frontend/src/pages/ParentDashboard.js` — parent experience and family-sharing entry points.
- `frontend/src/pages/PricingPage.js` — product labels and displayed pricing copy.
- `memory/PRD.md` — product intent, shipped features, and documented roadmap/status history.

*This is a product-description draft based on repository documentation and code, not a live operational audit or legal/privacy review.*
