// Site copy — produced by the persuasion judge-panel workflow (scarcity,
// authority, identity, parent-trust lenses → synthesized), then tightened by an
// adversarial review. Edit copy here; components render from this single source.
//
// NOTE: the program is standardized to TEN Saturdays / ten milestones, matching
// the dated schedule (Jul 25 – Sep 26 = 10 Saturdays). Milestone 09 ("Polish,
// test & ship") is an assumed step before demo day — adjust if the real
// curriculum differs.

export const content = {
  meta: {
    title: "Code Share Academy — An AI + Coding Accelerator for Grades 6–8",
    description:
      "A 10-week online cohort where kids in grades 6–8 go from total beginner to shipping a real AI project that's entirely their own. Built on Claude Max, included free. Taught by founders who ship. First class free, then $25/class.",
  },

  nav: {
    links: [
      { label: "What they build", target: "#build" },
      { label: "Claude Max", target: "#claude-max" },
      { label: "Curriculum", target: "#curriculum" },
      { label: "Instructors", target: "#instructors" },
      { label: "Details", target: "#specs" },
    ],
    cta: { label: "Apply free →", target: "/apply" },
  },

  hero: {
    eyebrow: "AI + coding accelerator · grades 6–8 · starts Sat, Jul 25",
    headline_html:
      'Most kids will only ever <em>use</em> AI.<br/>Yours is going to <span class="g">build with it</span>.',
    subhead:
      "In 10 weeks your kid goes from never writing a line of code to shipping a real, working AI project that is entirely theirs — one they dreamed up, built with their own hands, and can explain end to end. Ten Saturdays, live on Zoom. Taught by founders who ship AI products for a living, not someone reading off a slide.",
    primary_cta: { label: "Claim a free first class", target: "/apply" },
    secondary_cta: { label: "See the 10 milestones", target: "#curriculum" },
    urgency_microcopy:
      "First class free. Then $25 a class, pay as you go. Seats are limited and filling now.",
  },

  stats: [
    { value: 10, suffix: "-week", label: "cohort, beginner to shipped" },
    { value: 1, prefix: "#", suffix: "", label: "TiE Global Pitch — 1st place" },
    { value: 200, prefix: "$", suffix: "/mo", label: "Claude Max — included free" },
    { value: 100, suffix: "%", label: "of proceeds fund a nonprofit" },
  ],

  sections: [
    {
      id: "window",
      kind: "window-quote",
      eyebrow: "Why now",
      heading_html:
        "There's a line forming right now. Most people can't see it yet.",
      body: "On one side: the kids who type a question into a chatbot and copy the answer. On the other: the kids who know what's happening underneath, and can bend these tools to an idea in their own head. The first group is already enormous, and that skill will be worth about as much as knowing how to use a search engine. The second group is small. It's the one that gets noticed. The earlier a kid crosses from user to builder, the bigger the head start, and it compounds every year. A 7th grader who ships an AI project now is years ahead of classmates who pick it up in college.",
      microcopy: "No prior coding required. Just a kid who wants to make something.",
    },
    {
      id: "accelerator",
      kind: "accelerator",
      eyebrow: "The model",
      heading_html: 'A startup accelerator, <span class="g">built for kids</span>.',
      body: "Think less after-school class, more the room where founders get made. Real accelerators hand people with a spark serious tools and a deadline, then stand back while they build. We do exactly that for an eleven-year-old. Your kid gets the same AI professionals build with, a real deadline, instructors who actually ship, and one job: make something real and put it into the world. The showcase in week ten is their demo day. They stand behind a thing they built and explain how it works, because they actually know.",
      microcopy: "“I made this, and I understand it.” That feeling is the whole point.",
    },
    {
      id: "build",
      kind: "build",
      eyebrow: "The outcome",
      heading_html:
        'They leave with a project. Not a certificate — <span class="g">a real, working thing</span>.',
      body: "A passion project they chose: a chatbot for a game they love, a tool that sorts their trading cards, an app that quizzes their little sister on spelling — whatever lights them up. Not a copy of the teacher's screen. Not a template with the names swapped out. They design it, build it, break it, fix it, and ship it. By the end it works, it's live, and it's theirs. A kid who can point to a real thing they built and walk you through every decision inside it has something almost no other applicant has. It's the difference between “I took a coding class” and “I built this, here's the link, ask me anything.”",
      microcopy: "Beginner in week 1. Shipping by week 10.",
    },
    {
      id: "claude-max",
      kind: "claude-max",
      eyebrow: "The tools they get",
      heading_html: 'They build on Claude Max. <span class="g">The real one.</span>',
      body: "Every student builds on Claude Max — the ~$200-a-month AI that working professional developers use to ship real software today. It's not a watered-down kids' version; it's the real thing. For the entire cohort, it's included free. That alone is worth more than the classes cost, and it means your kid learns to build the way real builders build. Most adults haven't touched what your kid will use on day one.",
      microcopy: "Nothing to install. Everything runs in the browser.",
    },
    {
      id: "curriculum",
      kind: "curriculum",
      eyebrow: "The path",
      heading_html: 'Ten milestones. Total beginner to <span class="g">shipped builder</span>.',
      body: "Not a syllabus — a build path. No busywork. Every Saturday moves your kid one concrete step closer to a project that's live and theirs. Beginners are genuinely welcome. That's who this is built for.",
      microcopy: "",
      weeks: [
        { n: "01", t: "Welcome to the AI age", d: "what's actually happening, and why building beats watching" },
        { n: "02", t: "How computers actually think", d: "the real mental model, not magic" },
        { n: "03", t: "Real code — intro to Python", d: "writing their first lines that run" },
        { n: "04", t: "Prompt to product", d: "building working software by describing what you want" },
        { n: "05", t: "What is machine learning?", d: "teaching a computer from examples, hands-on" },
        { n: "06", t: "Inside the chatbot", d: "opening up the thing everyone uses and few understand" },
        { n: "07", t: "Build your project · part 1", d: "their own idea, scoped and off the ground" },
        { n: "08", t: "Build your project · part 2", d: "make it work, make it real" },
        { n: "09", t: "Polish, test & ship", d: "final fixes, then make it live and demo-ready" },
        { n: "10", t: "Showcase & your future", d: "demo day, and where this road goes next", last: true },
      ],
    },
    {
      id: "payoff",
      kind: "payoff",
      eyebrow: "Two versions of next spring",
      heading_html: 'Same kid. <span class="g">Two very different springs.</span>',
      body: "In one, your kid spent the summer the way most kids did, using AI to answer homework, a little bored by it. In the other, your kid spent ten Saturdays building, and walks into the next school year with a finished AI project they can explain to anyone: a teacher, an admissions reader, a room full of adults. The kids who can build and explain what they built stand out — on college applications, in interviews, in every room they walk into for the next decade. One of those kids gets noticed. Both versions start with the same Saturday. Only one of them shows up.",
      microcopy: "Every cohort that passes is one your kid watches from the wrong side of that line.",
    },
    {
      id: "instructors",
      kind: "instructors",
      eyebrow: "Who you learn from",
      heading_html:
        'You don’t learn to build from people who only <span class="g">read about building</span>.',
      body: "Code Share Academy is taught by 1st-place winners of the TiE Global Pitch Competition — the founders behind duggai.com, where they ship a real AI product the rest of the week. There's a difference between a tutor who learned the syntax and a builder who has shipped something real, watched it break in front of users, and fixed it. When a 7th grader asks “but what happens when the AI gets it wrong?”, the answer comes from someone who has handled exactly that in production. And when a kid watches an actual founder solve a problem live, they stop believing people like them don't build things like this.",
      microcopy: "Every dollar you pay funds a local nonprofit. The seat does double duty.",
      teachers: [
        { initials: "AN", name: "Ashish Naik", role: "founder · instructor" },
        { initials: "AG", name: "Arnav Gollapally", role: "founder · instructor" },
        { initials: "SD", name: "Shaurya Duggal", role: "founder · instructor" },
      ],
      sources: [
        { label: "GeekWire", href: "https://www.geekwire.com/2026/students-pitch-startups-in-regional-tie-young-entrepreneurs-finals-vying-to-three-peat-in-global-contest/" },
        { label: "TiE Seattle", href: "https://www.linkedin.com/posts/tie-seattle_tyeseattle-tyeglobal-duggai-activity-7473807275753623552-PwHP" },
        { label: "duggai.com", href: "https://duggai.com" },
      ],
    },
    {
      id: "specs",
      kind: "specs",
      eyebrow: "The format",
      heading_html: 'Ten Saturdays. One hour each. <span class="g">Fully online.</span>',
      body: "The pay-as-you-go part is deliberate. We're confident enough in week one to give it to you free, and confident enough in the rest that we never ask you to commit up front. Your kid stays because the class is worth showing up for, not because you pre-paid.",
      microcopy: "",
      specs: [
        { k: "Who", v: "Grades 6–8", s: "beginners welcome — most start with zero code" },
        { k: "When", v: "10 Saturdays", s: "Jul 25 – Sep 26 · 11:30–12:30 PT" },
        { k: "Where", v: "Online", s: "live on Zoom · nothing to install" },
        { k: "Cost", v: "1st class free", s: "then $25/class · pay as you go" },
        { k: "Tools", v: "Browser-based", s: "Scratch · Replit · Claude Max (+ ChatGPT & Gemini)" },
        { k: "Seats", v: "Limited", s: "small cohort, real attention for every kid" },
      ],
    },
    {
      id: "fomo",
      kind: "fomo",
      eyebrow: "What “filling now” actually means",
      heading_html: "This is a live cohort. Not a video library you binge whenever.",
      body: "We teach 10 Saturdays in a row, as one group moving together, and that format has a hard ceiling on how many kids we take. We're holding a seat in a room, and rooms have a back wall. When the seats are gone, they're gone until the next cohort, which won't be the same dates, the same group, or necessarily the same price. “Is my kid behind already?” No. That's the point of starting now. The kids who feel behind on AI are exactly who we want, because the window to be early hasn't closed yet. Waiting one more cohort is the only thing that actually puts them behind.",
      microcopy: "Limited seats. Once this cohort fills, the next start date is later in the year.",
    },
  ],

  cta_band: {
    headline_html:
      'Give your kid the <span class="g">free first class</span>. Decide from there.',
    subhead:
      "The cohort starts July 25 and runs ten Saturdays through September 26, 11:30–12:30 PT, live on Zoom. Come to the first one free. Watch your kid build something real in an hour, on the real tools, around founders who build for a living. If it's not for them, you've lost a Saturday morning. If it is, they've started something that pays off for years.",
    primary_cta: { label: "Claim your free first class", target: "/apply" },
    urgency: "Seats are limited and filling now. The cohort starts July 25 and runs once like this.",
    phone: "(425) 677-5903",
  },

  footer: {
    left: "© 2026 Code Share Academy — learn to build, not just use.",
    right: "online · grades 6–8 · seattle",
  },
};
