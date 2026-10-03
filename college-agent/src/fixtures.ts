import type {
  AgentJob,
  ChangeLine,
  Fact,
  FoundHit,
  PastMemo,
  Question,
  School,
  UploadSlot,
} from "./types";

export const STUDENT = {
  name: "Avery Chen",
  school: "Northline High School",
  place: "Northline, California",
  grade: "Senior · class of 2027",
  note: "Fictional student. Not a real applicant.",
};

export const DEMO_HITS: FoundHit[] = [
  {
    id: "gm-transcript",
    slot: "transcript",
    source: "Gmail",
    title: "Official transcript — Northline High",
    when: "Sep 15, 2026",
    from: "registrar@northline.example",
  },
  {
    id: "gm-sat",
    slot: "scores",
    source: "Gmail",
    title: "Your SAT score report is ready",
    when: "Aug 28, 2025",
    from: "collegeboard@score.example",
  },
  {
    id: "gm-ap",
    slot: "scores",
    source: "Gmail",
    title: "AP score report",
    when: "Jul 8, 2025",
    from: "collegeboard@score.example",
  },
  {
    id: "gm-robotics",
    slot: "activities",
    source: "Gmail",
    title: "Northline Robotics: captain confirmation",
    when: "May 2, 2026",
    from: "coach@northline.example",
  },
  {
    id: "gm-essay",
    slot: "essays",
    source: "Gmail",
    title: "Personal statement v4",
    when: "Sep 18, 2026",
    from: "avery.chen@mail.example",
  },
  {
    id: "drv-transcript",
    slot: "transcript",
    source: "Drive",
    title: "Avery_Chen_transcript_Northline.pdf",
    when: "Sep 15, 2026",
  },
  {
    id: "drv-activities",
    slot: "activities",
    source: "Drive",
    title: "Activities_and_awards_2026.docx",
    when: "Sep 20, 2026",
  },
  {
    id: "drv-awards",
    slot: "awards",
    source: "Drive",
    title: "Activities_and_awards_2026.docx",
    when: "Sep 20, 2026",
  },
  {
    id: "drv-essay",
    slot: "essays",
    source: "Drive",
    title: "Chen_personal_statement_v4.docx",
    when: "Sep 18, 2026",
  },
];

export const DEMO_FACTS: Fact[] = [
  {
    id: "gpa",
    label: "GPA and trend",
    value: "3.82 unweighted through junior year. 9th 3.61, 10th 3.74, 11th 3.96.",
    hint: "Rising three years running. Senior fall grades are not in this file.",
    provenance: {
      source: "Gmail",
      detail: "Official transcript — Northline High",
      when: "Sep 15, 2026",
      confidence: "high",
    },
    status: "unreviewed",
  },
  {
    id: "rigor",
    label: "Course rigor",
    value:
      "Six APs by the end of junior year: Calc BC, Physics C, CS A, Lang, US History, Chemistry. Senior year adds English Lit and a robotics research elective.",
    hint: "Counted from the course list on the transcript, not from a school profile.",
    provenance: {
      source: "Drive",
      detail: "Avery_Chen_transcript_Northline.pdf",
      when: "Sep 15, 2026",
      confidence: "high",
    },
    status: "unreviewed",
  },
  {
    id: "scores",
    label: "Scores",
    value: "SAT 1480 (740 Evidence-Based Reading and Writing, 740 Math), August 2025. AP Calc BC 5, AP CS A 5, AP Chemistry 4. No ACT on file.",
    hint: "Score-report emails only. A superscore was not computed.",
    provenance: {
      source: "Gmail",
      detail: "Your SAT score report is ready",
      when: "Aug 28, 2025",
      confidence: "high",
    },
    status: "unreviewed",
  },
  {
    id: "activities",
    label: "Activities",
    value:
      "Robotics team captain, 3 years. Hospital tutoring, 2 years, about 120 hours. Library makerspace teaching assistant, junior year.",
    hint: "Hours for tutoring are in the captain confirmation thread. Makerspace is named in the Drive doc.",
    provenance: {
      source: "Gmail",
      detail: "Northline Robotics: captain confirmation",
      when: "May 2, 2026",
      confidence: "high",
    },
    status: "unreviewed",
  },
  {
    id: "awards",
    label: "Awards",
    value:
      "Science Olympiad state medalist, 2025. National Honor Society. Northline robotics engineering award, 2026.",
    hint: "No photo of the medal was attached to the Drive doc.",
    provenance: {
      source: "Drive",
      detail: "Activities_and_awards_2026.docx",
      when: "Sep 20, 2026",
      confidence: "high",
    },
    status: "unreviewed",
  },
  {
    id: "major",
    label: "Intended major",
    value: "Mechanical engineering, with robotics as the through-line.",
    hint: "Inferred from the robotics captaincy and the AP mix. Avery has not written the major in a sentence we can quote.",
    provenance: {
      source: "Drive",
      detail: "Activities_and_awards_2026.docx",
      when: "Sep 20, 2026",
      confidence: "medium",
    },
    status: "unreviewed",
  },
];

export const DEMO_UPLOADS: UploadSlot[] = [
  {
    id: "photos",
    label: "Activity and award photos",
    why: "Gmail and Drive named the Science Olympiad medal and the robotics award. Neither file included a photo. Google Photos was not opened, and the Picker is the only way photos come in.",
  },
  {
    id: "fall-grades",
    label: "Senior fall grade report",
    why: "The transcript on file stops at junior year. A search for a fall progress report in Gmail and Drive returned nothing.",
  },
];

export const QUESTIONS: Question[] = [
  {
    id: "geo",
    impact: "Moves 5 of 9 schools in the working set",
    prompt: "Would you apply outside the West Coast?",
    why: "Five of the nine schools in the working set are outside the West Coast. Lakemont is the only one of those five already on the list, and it is the only reach. Answering no takes that reach off and leaves the list without one. Answering yes keeps the reach and leaves the other four as candidates, not as silent adds.",
    choices: [
      {
        id: "leave",
        label: "Yes, I'll leave the West Coast",
        effect: "Lakemont stays the reach. The other four out-of-region schools stay candidates, not cards.",
      },
      {
        id: "stay",
        label: "West Coast only",
        effect: "Lakemont leaves the list. Balance becomes 0 reach, 2 stretch, 2 target, 1 fit.",
      },
      {
        id: "unsure",
        label: "Not sure yet",
        effect: "Nothing leaves. Geography confidence drops, and the ranges get wider.",
      },
    ],
  },
  {
    id: "cost",
    impact: "Re-tiers anything above the ceiling",
    prompt: "Is there a hard ceiling on net cost per year?",
    why: "Lakemont's example net-price band is $31k to $38k. Harbor Tech is $22k to $29k. A ceiling near $25k puts Lakemont above the plan and Harbor Tech on the edge. A ceiling near $15k leaves Sierra Pacific as the only school fully inside it. Until this is a number, the cost line on every card is a range with nothing to compare it to.",
    choices: [
      {
        id: "15",
        label: "Under $15k",
        effect: "Only Sierra Pacific sits fully inside the ceiling. The others get an above-ceiling flag.",
      },
      {
        id: "25",
        label: "About $25k",
        effect: "Lakemont is flagged above the ceiling. Harbor Tech is flagged as the edge case.",
      },
      {
        id: "none",
        label: "No ceiling yet",
        effect: "No school is flagged. Cost confidence stays low on purpose.",
      },
    ],
  },
  {
    id: "coop",
    impact: "Decides whether Tidewater is even a card",
    prompt: "Is a required co-op a must-have?",
    why: "Harbor Tech and Tidewater both require a co-op year. Tidewater is not on the list. If a co-op is a must-have, Tidewater is the decision waiting on Sunday's memo: a target under a $25k ceiling, farther from home than anything you already have. If a co-op is only nice, that card can wait and Harbor Tech is just one stretch among others.",
    choices: [
      {
        id: "must",
        label: "Must-have",
        effect: "Tidewater stays a Sunday decision. Harbor Tech's co-op is marked as a reason it is on the list.",
      },
      {
        id: "nice",
        label: "Nice to have",
        effect: "Tidewater stays off the list until you approve the card. It is no longer urgent.",
      },
      {
        id: "either",
        label: "Doesn't matter",
        effect: "Co-op stops influencing the order. The Tidewater card can be kept as the plan.",
      },
    ],
  },
];

export const SCHOOLS: School[] = [
  {
    id: "lakemont",
    name: "Lakemont University",
    place: "Large Midwest city · about 30k students",
    tier: "reach",
    range: [12, 24],
    cost: [31, 38],
    grad: "91% finish in six years",
    earn: "$96k median, mechanical engineering",
    coast: "other",
    coop: false,
    why: ["Engineering college with a paid co-op option, not a requirement", "City campus, which matches the robotics travel schedule"],
    notFit: ["Example net price sits above a $25k ceiling", "Intro lectures run past 200 students"],
    sources: [
      { source: "example self-reports", detail: "n=188 engineering applicants", when: "fixture", confidence: "medium" },
      { source: "example net-price band", detail: "not a live Scorecard call", when: "fixture", confidence: "medium" },
    ],
    onList: true,
  },
  {
    id: "harbor",
    name: "Harbor Tech Institute",
    place: "Mid-size coastal city · about 9k students",
    tier: "stretch",
    range: [28, 42],
    cost: [22, 29],
    grad: "84% finish in six years",
    earn: "$88k median, mechanical engineering",
    coast: "west",
    coop: true,
    why: ["Required co-op year with named engineering employers", "Project studios from the first term"],
    notFit: ["Net price is at the top of a $25k ceiling", "Campus is described as quiet and heavily STEM"],
    sources: [
      { source: "example self-reports", detail: "n=241", when: "fixture", confidence: "medium" },
      { source: "example net-price band", detail: "not a live Scorecard call", when: "fixture", confidence: "medium" },
    ],
    onList: true,
  },
  {
    id: "bayfront",
    name: "Bayfront Polytechnic",
    place: "Coastal suburb · about 14k students",
    tier: "stretch",
    range: [30, 46],
    cost: [18, 24],
    grad: "80% finish in six years",
    earn: "$83k median, mechanical engineering",
    coast: "west",
    coop: false,
    why: ["Lab-first first year", "Inside the $25k band on the example net price"],
    notFit: ["Only 97 example self-reports for this major", "Major admission is after year one, not at entry"],
    sources: [
      { source: "example self-reports", detail: "n=97", when: "fixture", confidence: "low" },
      { source: "example net-price band", detail: "not a live Scorecard call", when: "fixture", confidence: "medium" },
    ],
    onList: true,
  },
  {
    id: "cascade",
    name: "Cascade State University",
    place: "College town · about 24k students",
    tier: "target",
    range: [50, 66],
    cost: [15, 19],
    grad: "78% finish in six years",
    earn: "$74k median, mechanical engineering",
    coast: "west",
    coop: false,
    why: ["Inside a $25k ceiling after the Oct 1 band update", "Club and shop culture lines up with robotics"],
    notFit: ["Weaker direct employer pipeline than Harbor Tech"],
    sources: [
      { source: "example net-price refresh", detail: "band moved from $16–21k on Oct 1", when: "Oct 1, 2026", confidence: "medium" },
      { source: "example self-reports", detail: "n=312", when: "fixture", confidence: "high" },
    ],
    onList: true,
  },
  {
    id: "ridgeview",
    name: "Ridgeview College",
    place: "Rural campus · about 2,100 students",
    tier: "target",
    proposedTier: "stretch",
    range: [48, 64],
    cost: [19, 25],
    grad: "88% finish in six years",
    earn: "$68k median, mechanical engineering",
    coast: "west",
    coop: false,
    why: ["Average class near 16", "Four-year graduation is the highest on the list"],
    notFit: ["Rural setting, and the activities file leans toward a city shop", "Thin alumni network in engineering employers"],
    sources: [
      { source: "example admit profile", detail: "Oct 1 refresh proposes stretch", when: "Oct 1, 2026", confidence: "low" },
      { source: "example self-reports", detail: "n=64", when: "fixture", confidence: "low" },
    ],
    onList: true,
  },
  {
    id: "sierra",
    name: "Sierra Pacific University",
    place: "Suburb two hours from Northline · about 18k students",
    tier: "fit",
    range: [74, 88],
    cost: [12, 16],
    grad: "72% finish in six years",
    earn: "$70k median, mechanical engineering",
    coast: "west",
    coop: false,
    why: ["Lowest example net price on the list", "Close enough for the shop internship Avery already has"],
    notFit: ["Six-year graduation is the weakest on the list"],
    sources: [
      { source: "example self-reports", detail: "n=276", when: "fixture", confidence: "high" },
      { source: "example net-price band", detail: "not a live Scorecard call", when: "fixture", confidence: "high" },
    ],
    onList: true,
  },
  {
    id: "tidewater",
    name: "Tidewater Institute",
    place: "East Coast port city · about 6k students",
    tier: "target",
    range: [52, 68],
    cost: [14, 20],
    grad: "86% finish in six years",
    earn: "$84k median, mechanical engineering",
    coast: "other",
    coop: true,
    why: ["Required co-op, which is the open question", "Example net price sits under a $25k ceiling"],
    notFit: ["Farther from Northline than any school already on the list"],
    sources: [
      { source: "example program page", detail: "co-op is required, not optional", when: "fixture", confidence: "medium" },
      { source: "example net-price band", detail: "not a live Scorecard call", when: "fixture", confidence: "medium" },
    ],
    onList: false,
    suggested: true,
  },
];

export const OFF_LIST_NOTE =
  "Four more out-of-region schools sit in the working set and are not on the list: Redcedar University, Kingsmill College, Easton School of Engineering, and Northwater Institute. They move only if the West Coast answer changes. They are not given cards until a decision says so.";

export const JOBS: AgentJob[] = [
  { id: "j1", label: "Gmail, portal mail", result: "1 new message: Bayfront applicant portal, Sep 30." },
  { id: "j2", label: "Drive, fall grades", result: "No senior fall progress report." },
  { id: "j3", label: "Net-price bands", result: "Cascade engineering band moved to $15–19k." },
  { id: "j4", label: "Deadline calendar", result: "Harbor Tech Early Action closes Nov 1." },
  { id: "j5", label: "Admit profile", result: "Ridgeview proposed target → stretch. Not applied." },
  { id: "j6", label: "Essay draft", result: "Personal statement v4 is 392 words of a ~650 word draft." },
  { id: "j7", label: "Recommenders", result: "1 of 2 requests sent. Bayfront portal still shows one open." },
  { id: "j8", label: "Scholarship window", result: "Scholarship X closed Sep 15. Avery is not eligible." },
  { id: "j9", label: "Co-op candidates", result: "Tidewater matches a required co-op and the cost band." },
  { id: "j10", label: "Aid letters", result: "No award PDFs. Nothing to compare yet." },
  { id: "j11", label: "List balance", result: "1 reach · 2 stretch · 2 target · 1 fit, before decisions." },
  { id: "j12", label: "Student memo", result: "Drafted for Sunday 7:00am." },
  { id: "j13", label: "Parent memo", result: "Drafted as a separate copy. Cost first." },
  { id: "j14", label: "Decision queue", result: "2 cards. Nothing submitted." },
];

export const STUDENT_CHANGES: ChangeLine[] = [
  {
    mark: "Deadline",
    text: "Harbor Tech Early Action closes November 1, 29 days from Sunday. The supplement draft is 392 words, about 60% of the version you were aiming at.",
    provenance: "Harbor Tech calendar · checked Oct 2 · essay file Sep 18",
  },
  {
    mark: "Portal",
    text: "Bayfront sent “Your applicant portal” on Sep 30. One recommender request is still open. Nothing in that thread was submitted for you.",
    provenance: "Gmail · “Your applicant portal” · Sep 30, 2026",
  },
  {
    mark: "Aid",
    text: "Cascade State's example engineering net-price band moved from $16–21k to $15–19k after the Oct 1 refresh.",
    provenance: "example net-price refresh · Oct 1, 2026 · medium confidence",
  },
  {
    mark: "Admit data",
    text: "Ridgeview's new example admit profile would place a record like yours in stretch rather than target. The list has not moved.",
    provenance: "example admit profile · Oct 1, 2026 · n=64 · low confidence",
  },
];

export const PARENT_CHANGES: ChangeLine[] = [
  {
    mark: "Aid",
    text: "Cascade State's example net price for engineering dropped to $15–19k per year. That is inside a $25k ceiling. Lakemont is still $31–38k, which is not.",
    provenance: "example net-price refresh · Oct 1, 2026",
  },
  {
    mark: "Ceiling",
    text: "With a $25k ceiling, 7 of the 9 schools in the working set still fit. Lakemont does not. Harbor Tech ($22–29k) straddles the line.",
    provenance: "example bands · ceiling comes from the cost question, or stays unmarked",
  },
  {
    mark: "Deadline",
    text: "Harbor Tech Early Action is November 1. Early Action here is not binding. No application has been submitted.",
    provenance: "Harbor Tech calendar · checked Oct 2",
  },
  {
    mark: "Portal",
    text: "Bayfront's portal email on Sep 30 is waiting on a second recommender. That is a signature from a teacher, not a fee.",
    provenance: "Gmail · “Your applicant portal” · Sep 30, 2026",
  },
];

export const PAST_MEMOS: PastMemo[] = [
  {
    id: "w37",
    date: "Sep 27, 2026",
    title: "Week 37 · no decisions",
    summary:
      "Logged the August SAT at 1480 and checked that no school on the list required a subject test. List unchanged. 11 jobs, 0 cards.",
  },
  {
    id: "w36",
    date: "Sep 20, 2026",
    title: "Week 36 · Sierra Pacific added",
    summary:
      "The activities file named a shop internship two hours from Northline. Sierra Pacific was proposed as a fit on cost and distance. You approved the add. Balance became 1–2–2–1.",
  },
  {
    id: "w35",
    date: "Sep 13, 2026",
    title: "Week 35 · first dossier",
    summary:
      "First read of the transcript, the SAT mail, and the activities doc. Six claims, six schools. Major left at medium confidence because it was inferred.",
  },
];

export const ROSTER_OTHERS: {
  name: string;
  balance: [number, number, number, number];
  confidence: number;
  status: string;
  tone: "ok" | "warn" | "bad";
  gain: string;
}[] = [
  {
    name: "Jordan Kim",
    balance: [3, 1, 0, 0],
    confidence: 0.42,
    status: "No target or fit",
    tone: "bad",
    gain: "Is there a region you will not leave?",
  },
  {
    name: "Priya Shah",
    balance: [1, 1, 2, 2],
    confidence: 0.81,
    status: "Ready to review",
    tone: "ok",
    gain: "No open question",
  },
  {
    name: "Luis Ortega",
    balance: [0, 1, 2, 3],
    confidence: 0.38,
    status: "Profile still thin",
    tone: "warn",
    gain: "What did the junior-year grades actually do?",
  },
  {
    name: "Ava Brooks",
    balance: [2, 2, 1, 1],
    confidence: 0.58,
    status: "Cost band missing",
    tone: "warn",
    gain: "Has anyone run a net price calculator?",
  },
];
