"use client";

import { useEffect, useMemo, useState } from "react";

type Person = "jacob" | "madison";
type Stage = "Interested" | "Researching" | "Applying" | "Submitted" | "Passed";

type Job = {
  id: string;
  institution: string;
  school: string;
  department: string;
  title: string;
  rank: string;
  location: string;
  source: "Berkeley" | "Stanford" | "UCLA" | "USC" | "Columbia" | "Northwestern";
  sourceUrl: string;
  opened: string;
  start: string;
  deadline: string | null;
  reviewDate?: string;
  summary: string;
  tags: string[];
  fit: Record<Person, number>;
  fitReason: Record<Person, string>;
  requirements: string[];
  note?: string;
};

type TrackerEntry = {
  jobId: string;
  stage: Stage;
  notes: string;
  completed: number[];
  savedAt: string;
};

type TrackerState = Record<Person, TrackerEntry[]>;

const STORAGE_KEY = "joint-faculty-search-v1";
const DISMISSED_KEY = "joint-faculty-search-dismissed-v1";
const observedAt = "August 7, 2026";

const jobs: Job[] = [
  {
    id: "stanford-pharmacoepidemiology",
    institution: "Stanford University",
    school: "School of Medicine",
    department: "Epidemiology & Population Health / Anesthesiology",
    title: "Assistant, Associate, or Full Professor — Pharmacoepidemiology",
    rank: "Open rank · tenure, medical, or research line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/pharmacoepidemiology-assistant-associate-or-full-professor-stanford-university-california-united-states",
    opened: "2026-06-26",
    start: "Not stated · verify Fall 2027 timing",
    deadline: null,
    summary:
      "Real-world evidence search emphasizing large healthcare databases, causal inference, comparative effectiveness, and quantitative methods.",
    tags: ["Real-world evidence", "Causal inference", "Health data", "Comparative effectiveness"],
    fit: { jacob: 98, madison: 55 },
    fitReason: {
      jacob: "Near-direct overlap with causal inference, real-world healthcare data, effectiveness, and health services research.",
      madison: "Strong quantitative setting, but the substantive focus is medication safety and pharmacoepidemiology rather than algorithmic fairness.",
    },
    requirements: [
      "Cover letter describing research interests, methodological or clinical experience, and fit with both departments",
      "Curriculum vitae",
      "Brief research statement",
      "Brief teaching and mentoring statement",
      "Up to three representative publications",
      "Names and contact information for at least three referees",
    ],
    note: "The official posting does not state a start date or deadline. Kept in the broad catalog; verify Fall 2027 timing and current status before applying.",
  },
  {
    id: "stanford-sspire",
    institution: "Stanford University",
    school: "School of Medicine",
    department: "Surgery — S-SPIRE Center",
    title: "Assistant, Associate, or Full Professor — Surgery Policy Improvement Research & Education",
    rank: "Open rank · tenure, medical, or research line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/assistant-associate-or-full-professor-stanford-surgery-policy-improvement-research-education-s-spire-center-stanford-university-california-united-states",
    opened: "2026-06-25",
    start: "Not stated · verify Fall 2027 timing",
    deadline: null,
    summary:
      "AI-enabled surgical policy and outcomes search focused on decision-making, patient outcomes, implementation, and multidisciplinary collaboration.",
    tags: ["Healthcare operations", "AI", "Decision-making", "Outcomes"],
    fit: { jacob: 92, madison: 84 },
    fitReason: {
      jacob: "Direct healthcare-delivery and decision-improvement fit with an operations and outcomes orientation.",
      madison: "Strong AI application context with high-stakes decisions, although fairness is not named explicitly.",
    },
    requirements: [
      "Curriculum vitae",
      "Brief letter outlining interests",
      "Names of three references; references will not be contacted without approval",
      "PhD in an AI-related quantitative field for tenure-line and non-tenure research-line applicants",
    ],
    note: "The official posting does not state a start date or deadline. Kept in the broad catalog; verify Fall 2027 timing and current status before applying.",
  },
  {
    id: "stanford-495011",
    institution: "Stanford University",
    school: "School of Medicine",
    department: "Health Policy",
    title: "Assistant, Associate, or Full Professor of Health Policy (Health Economist)",
    rank: "Open rank · tenure or medical line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/assistant-associate-or-full-professor-of-health-policy-health-economist-stanford-university-california-united-states",
    opened: "2026-07-24",
    start: "Not stated · likely Fall 2027 cycle",
    deadline: "2026-10-25",
    summary:
      "Health economics search spanning health systems, delivery, payment, digital health, AI, population health, and related policy areas.",
    tags: ["Health policy", "Health systems", "Economics", "AI & digital health"],
    fit: { jacob: 90, madison: 68 },
    fitReason: {
      jacob: "Direct overlap with healthcare delivery, health systems, and operations-oriented policy research.",
      madison: "The call explicitly includes artificial intelligence and digital health, although it is centered on health economics.",
    },
    requirements: [
      "Curriculum vitae",
      "One research paper, published or unpublished",
      "Letter describing research interests and teaching experience",
      "Three references: letters for assistant-level candidates; names and emails may be used for senior candidates",
    ],
    note: "The official posting does not print a start date. Its 2026 application deadline makes Fall 2027 plausible, so it remains visible with a verification flag.",
  },
  {
    id: "stanford-gse-rapid-change",
    institution: "Stanford University",
    school: "Graduate School of Education",
    department: "Graduate School of Education",
    title: "Open Rank Faculty — Education in a Rapidly Changing World",
    rank: "Open rank · university tenure line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/open-rank-faculty-position-social-sciences-humanities-of-education-in-a-rapidly-changing-world-stanford-university-california-united-states",
    opened: "2026-08-04",
    start: "Not stated · likely Fall 2027 cycle",
    deadline: "2026-10-15",
    summary:
      "Broad social-science search focused on education amid inequality, polarization, technological innovation, and societal change.",
    tags: ["Education", "Technology", "Inequality", "Social science"],
    fit: { jacob: 35, madison: 84 },
    fitReason: {
      jacob: "Only a secondary fit unless health-policy methods are paired with a central education question.",
      madison: "Strong overlap with AI in education, inequality, institutions, and technology-driven social change.",
    },
    requirements: [
      "Brief cover letter",
      "Combined research and teaching statement, no more than three pages",
      "Curriculum vitae",
      "Three scholarly publications or well-developed papers",
      "Names of three references; letters are requested on submission for non-tenured applicants",
    ],
    note: "The official posting does not print a start date. Its 2026 application deadline makes Fall 2027 plausible, so it remains visible with a verification flag.",
  },
  {
    id: "stanford-communication",
    institution: "Stanford University",
    school: "School of Humanities & Sciences",
    department: "Communication",
    title: "Assistant Professor in Communication — Media and Politics",
    rank: "Assistant Professor · university tenure line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/assistant-professor-in-communication-stanford-university-california-united-states",
    opened: "2026-06-26",
    start: "September 1, 2027",
    deadline: "2026-12-01",
    reviewDate: "2026-10-01",
    summary:
      "Media-and-politics search welcoming data and information science, political economy, polarization, and computational or experimental methods.",
    tags: ["Computational social science", "Media", "Politics", "Data science"],
    fit: { jacob: 25, madison: 96 },
    fitReason: {
      jacob: "Limited substantive overlap unless the research connects health information, platforms, or public policy.",
      madison: "Excellent fit for computational social science on algorithms, information systems, platforms, politics, and fairness.",
    },
    requirements: [
      "Cover letter",
      "Curriculum vitae including complete publication list",
      "Combined research and teaching statement, maximum three single-spaced pages",
      "Expected research-program summary, maximum 300 words",
      "Contact information for at least three recommendation letters",
    ],
  },
  {
    id: "berkeley-JPF05488",
    institution: "University of California, Berkeley",
    school: "College of Letters & Science — Social Sciences",
    department: "Demography",
    title: "Assistant Professor — Open Field — Demography",
    rank: "Assistant Professor · tenure track",
    location: "Berkeley, CA",
    source: "Berkeley",
    sourceUrl: "https://aprecruit.berkeley.edu/JPF05488",
    opened: "2026-08-03",
    start: "July 1, 2027",
    deadline: "2026-10-15",
    summary:
      "Open-field search naming computational demography, economic demography, health and aging, migration, and population dynamics.",
    tags: ["Computational social science", "Health", "Population", "Methods"],
    fit: { jacob: 72, madison: 76 },
    fitReason: {
      jacob: "Plausible fit through health, aging, causal methods, and quantitative population research.",
      madison: "Plausible fit through computational methods, inequality, and population-level policy questions.",
    },
    requirements: [
      "Curriculum vitae",
      "Cover letter",
      "Teaching, mentoring, and service statement, approximately 500–1,000 words",
      "Research statement, approximately 500–1,000 words",
      "Authorization to Release Information form",
      "Three published or unpublished scholarly works, preferably first- or single-authored",
      "Three letters of reference",
    ],
  },
  {
    id: "berkeley-JPF05420",
    institution: "University of California, Berkeley",
    school: "Haas School of Business",
    department: "Marketing",
    title: "Assistant Professor — Quantitative Marketing",
    rank: "Assistant Professor · tenure track",
    location: "Berkeley, CA",
    source: "Berkeley",
    sourceUrl: "https://aprecruit.berkeley.edu/JPF05420",
    opened: "2026-07-21",
    start: "July 1, 2027",
    deadline: "2026-09-15",
    summary:
      "Quantitative marketing search emphasizing analytics, industrial organization, digital marketing, and empirical or analytical methods.",
    tags: ["Business school", "Analytics", "Digital markets", "Quantitative methods"],
    fit: { jacob: 45, madison: 75 },
    fitReason: {
      jacob: "Methods could transfer with a healthcare-market framing, but the marketing home is indirect.",
      madison: "A credible computational and digital-market fit for platform, lending, or algorithmic-decision research.",
    },
    requirements: [
      "Curriculum vitae",
      "Job market paper",
      "Research statement",
      "Teaching and mentoring statement",
      "Authorization to Release Information form",
      "Three letters of reference for new PhD/postdoc applicants",
      "Optional: teaching evaluations, cover letter, and up to two additional research papers",
    ],
  },
  {
    id: "berkeley-JPF05417",
    institution: "University of California, Berkeley",
    school: "Haas School of Business",
    department: "Management of Organizations",
    title: "Assistant Professor — Organizations, Entrepreneurship and Innovation",
    rank: "Assistant Professor · tenure track",
    location: "Berkeley, CA",
    source: "Berkeley",
    sourceUrl: "https://aprecruit.berkeley.edu/JPF05417",
    opened: "2026-07-21",
    start: "July 1, 2027",
    deadline: "2026-09-15",
    summary:
      "Search for research on entrepreneurship or innovation, especially mechanisms shaping behavior, organizations, performance, and inequality.",
    tags: ["Business school", "Organizations", "Innovation", "Inequality"],
    fit: { jacob: 55, madison: 67 },
    fitReason: {
      jacob: "A possible organizational home for healthcare operations, but entrepreneurship or innovation must be central.",
      madison: "A possible home for AI, inequality, and organizational decision-making if framed around innovation.",
    },
    requirements: [
      "Curriculum vitae",
      "Job market paper",
      "Research statement",
      "Teaching and mentoring statement",
      "Authorization to Release Information form",
      "Three letters of reference for new PhD/postdoc applicants",
      "Optional: teaching evaluations, cover letter, and up to two additional research papers",
    ],
  },
  {
    id: "berkeley-JPF05416",
    institution: "University of California, Berkeley",
    school: "College of Letters & Science — Social Sciences",
    department: "Sociology",
    title: "Assistant Professor — Open Field — Sociology",
    rank: "Assistant Professor · tenure track",
    location: "Berkeley, CA",
    source: "Berkeley",
    sourceUrl: "https://aprecruit.berkeley.edu/JPF05416",
    opened: "2026-07-10",
    start: "July 1, 2027",
    deadline: "2026-09-01",
    summary:
      "Open-field sociology search with no restriction on specialization.",
    tags: ["Computational social science", "Organizations", "Inequality", "Open field"],
    fit: { jacob: 38, madison: 82 },
    fitReason: {
      jacob: "An indirect fit through organizations, health systems, or applied quantitative sociology.",
      madison: "Open-field search is compatible with computational social science, algorithmic fairness, and inequality research.",
    },
    requirements: [
      "Curriculum vitae",
      "Cover letter",
      "Research statement",
      "Teaching and mentoring statement",
      "Optional service statement",
      "Three writing samples",
      "Three letters of reference",
      "Authorization to Release Information form",
    ],
  },
  {
    id: "stanford-political-science-open",
    institution: "Stanford University",
    school: "School of Humanities & Sciences",
    department: "Political Science",
    title: "Open Field, Open Rank Faculty Position in Political Science",
    rank: "Open rank · university tenure line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/open-field-open-rank-faculty-position-in-political-science-stanford-university-california-united-states",
    opened: "2026-07-06",
    start: "September 1, 2027",
    deadline: "2026-11-01",
    reviewDate: "2026-09-01",
    summary:
      "Open-field political-science search. Assistant-level applications are due November 1; review begins September 1.",
    tags: ["Policy", "Computational social science", "Open field", "Methods"],
    fit: { jacob: 35, madison: 74 },
    fitReason: {
      jacob: "An indirect fit unless the health-policy work is clearly anchored in political science.",
      madison: "Open-field scope can accommodate algorithms, governance, fairness, and computational political science.",
    },
    requirements: [
      "Cover letter",
      "Curriculum vitae including publication list",
      "Combined research and teaching statement, maximum three single-spaced pages",
      "Teaching evaluations",
      "PhD-program transcripts",
      "Writing sample",
      "Three letters of recommendation",
    ],
  },
  {
    id: "berkeley-JPF05408",
    institution: "University of California, Berkeley",
    school: "College of Letters & Science — Social Sciences",
    department: "Political Science",
    title: "Assistant Professor — American Politics or Public Law",
    rank: "Assistant Professor · tenure track",
    location: "Berkeley, CA",
    source: "Berkeley",
    sourceUrl: "https://aprecruit.berkeley.edu/JPF05408",
    opened: "2026-07-28",
    start: "July 1, 2027",
    deadline: "2026-09-08",
    summary:
      "Political-science search with preference for scholars working in American politics or public law.",
    tags: ["Policy", "Public law", "American politics", "Institutions"],
    fit: { jacob: 30, madison: 68 },
    fitReason: {
      jacob: "An indirect fit because the preferred fields are American politics and public law.",
      madison: "Algorithmic governance and fairness could fit public law or American politics if framed institutionally.",
    },
    requirements: [
      "Curriculum vitae",
      "Cover letter",
      "Research statement",
      "Teaching and mentoring statement",
      "Two writing samples",
      "Service statement",
      "Authorization Release form",
      "Three letters of reference",
    ],
  },
  {
    id: "berkeley-JPF05422",
    institution: "University of California, Berkeley",
    school: "Haas School of Business",
    department: "Finance",
    title: "Assistant Professor — Finance",
    rank: "Assistant Professor · tenure track",
    location: "Berkeley, CA",
    source: "Berkeley",
    sourceUrl: "https://aprecruit.berkeley.edu/JPF05422",
    opened: "2026-07-27",
    start: "July 1, 2027",
    deadline: "2026-11-18",
    summary:
      "Broad finance search covering banking, credit, mortgages, insurance, regulation, financial markets, and empirical or theoretical work.",
    tags: ["Business school", "Finance", "Lending", "Regulation"],
    fit: { jacob: 25, madison: 88 },
    fitReason: {
      jacob: "Outside the primary healthcare-operations market unless the work has a strong health-finance angle.",
      madison: "Strong match for the fintech-lending audit, algorithmic discrimination, credit decisions, and financial regulation.",
    },
    requirements: [
      "Curriculum vitae",
      "Job market paper",
      "Research statement",
      "Teaching and mentoring statement",
      "Authorization to Release Information form",
      "Three letters of reference for new PhD/postdoc applicants",
      "Optional: teaching evaluations, cover letter, and up to two additional research papers",
    ],
  },
  {
    id: "ucla-JPF11179",
    institution: "University of California, Los Angeles",
    school: "UCLA School of Law",
    department: "Law",
    title: "Tenure-Track Assistant Professor of Law — Open Field",
    rank: "Assistant Professor · tenure track",
    location: "Los Angeles, CA",
    source: "UCLA",
    sourceUrl: "https://recruit.apo.ucla.edu/JPF11179",
    opened: "2026-07-23",
    start: "July 1, 2027",
    deadline: "2027-01-01",
    reviewDate: "2026-08-23",
    summary:
      "Entry-level, open-field law search accepting JD, PhD, or equivalent candidates for a July 2027 appointment.",
    tags: ["AI governance", "Public law", "Algorithmic fairness", "Open field"],
    fit: { jacob: 30, madison: 88 },
    fitReason: {
      jacob: "A secondary fit through health and public policy, but the law-school market is not the primary disciplinary home.",
      madison: "A strong substantive match for algorithmic accountability, discrimination, and AI governance; the posting explicitly accepts PhD candidates.",
    },
    requirements: [
      "Curriculum vitae including reference contact information",
      "Cover letter",
      "Statement of current research and teaching interests",
      "Job-talk paper or manuscript",
      "UCLA Mission Statement",
      "Reference-check authorization release form",
    ],
  },
  {
    id: "usc-REQ20173456",
    institution: "University of Southern California",
    school: "Sol Price School of Public Policy / Schaeffer Institute",
    department: "Health Policy & Management",
    title: "Research Assistant Professor of Health Policy & Management",
    rank: "Research Assistant Professor · contract/grant-funded research line",
    location: "Los Angeles, CA",
    source: "USC",
    sourceUrl:
      "https://usccareers.usc.edu/job/los-angeles/research-assistant-professor-of-health-policy-and-management/1209/98163986400",
    opened: "2026-07-23",
    start: "Not stated · verify Fall 2027 timing",
    deadline: null,
    summary:
      "Schaeffer-based health-policy and health-economics role covering healthcare value, access, quality, spending, delivery, insurance, and medical innovation.",
    tags: ["Health policy", "Health economics", "Healthcare delivery", "Public policy"],
    fit: { jacob: 96, madison: 48 },
    fitReason: {
      jacob: "Near-direct substantive fit for health policy, healthcare delivery, real-world evidence, and policy-relevant quantitative research.",
      madison: "A possible healthcare setting for algorithmic-fairness work, but AI and computational methods are not named in the posting.",
    },
    requirements: [
      "Letter of interest",
      "Curriculum vitae",
      "List of three references",
      "PhD in health policy, economics, public policy, or a related field",
      "Evidence of grant funding and publication in leading journals",
    ],
    note: "This is a research-line, primarily contract- and grant-funded appointment rather than a conventional tenure-track position. The posting gives no start date or fixed deadline; applications continue until filled.",
  },
  {
    id: "usc-REQ20174817",
    institution: "University of Southern California",
    school: "Keck School of Medicine",
    department: "Population & Public Health Sciences — Health Behavior Research",
    title: "Assistant Professor — Health Behavior Data Analytics",
    rank: "Assistant Professor · posting describes tenure track",
    location: "Los Angeles, CA",
    source: "USC",
    sourceUrl:
      "https://usccareers.usc.edu/job/los-angeles/assistant-professor-of-clinical-population-and-public-health-sciences/1209/96857551280",
    opened: "2026-06-24",
    start: "Not stated · source currently unavailable",
    deadline: null,
    summary:
      "Computational public-health search using large digital and behavioral data, experiments or quasi-experiments, networks, NLP, computer vision, and machine learning.",
    tags: ["Public health", "Computational social science", "Digital platforms", "Causal methods"],
    fit: { jacob: 72, madison: 82 },
    fitReason: {
      jacob: "Credible methodological and public-health fit through quasi-experimental designs and large health datasets, though the substance centers on digital health behavior.",
      madison: "Strong computational-social-science fit through digital platforms, experiments, networks, NLP, and machine learning in a high-stakes health setting.",
    },
    requirements: [
      "Curriculum vitae",
      "Research statement",
      "Brief summary of research accomplishments and future goals",
      "Contact information for three references",
      "PhD or equivalent in public health, social and behavioral sciences, or a related discipline",
    ],
    note: "USC's official job URL returned 404 on August 7, 2026 after the role had been posted June 24. Preserved under the append-only policy so a temporary or early source removal cannot erase it; verify availability before preparing materials.",
  },
  {
    id: "northwestern-54185",
    institution: "Northwestern University",
    school: "McCormick School of Engineering",
    department: "Industrial Engineering & Management Sciences",
    title: "Faculty Positions in Industrial Engineering & Management Sciences — 2 Positions",
    rank: "One Assistant Professor · one open-rank · tenure track",
    location: "Evanston, IL",
    source: "Northwestern",
    sourceUrl:
      "https://careers.northwestern.edu/psc/hrnu_er/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId=54185&PostingSeq=1",
    opened: "2026-08-07",
    start: "Expected Fall 2027 · posting does not state date",
    deadline: "2026-11-16",
    reviewDate: "2026-10-16",
    summary:
      "Two tenure-line searches spanning optimization, AI and machine learning, data-driven decision-making, financial engineering, and healthcare operations.",
    tags: ["Healthcare operations", "Optimization", "AI and ML", "Engineering"],
    fit: { jacob: 99, madison: 88 },
    fitReason: {
      jacob: "Near-direct match for healthcare operations, simulation and optimization, data-driven decision-making, and interdisciplinary health systems research.",
      madison: "Strong methodological match through AI, machine learning, and data-driven decisions, with room for responsible-AI and fairness applications.",
    },
    requirements: [
      "Cover letter",
      "Curriculum vitae",
      "Research statement",
      "Teaching statement",
      "One job-talk-related research paper",
      "Contact information for three references",
    ],
    note: "The posting does not print a start date. It is included as an expected Fall 2027 search based on its October–November 2026 review cycle; verify timing with IEMS before applying.",
  },
  {
    id: "northwestern-53835",
    institution: "Northwestern University",
    school: "Kellogg School of Management",
    department: "Northwestern Innovation Institute / open Kellogg department",
    title: "Assistant or Untenured Associate Professor — AI and Innovation",
    rank: "Assistant or untenured Associate Professor · tenure track",
    location: "Evanston, IL",
    source: "Northwestern",
    sourceUrl:
      "https://careers.northwestern.edu/psc/hrnu_er/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Action=U&FOCUS=Applicant&JobOpeningId=53835&Page=HRS_APP_JBPST_FL&PostingSeq=1&SiteId=1&page=HRS_APP_JBPST_FL",
    opened: "2026-08-07",
    start: "2027–28 academic year",
    deadline: null,
    reviewDate: "2026-08-03",
    summary:
      "Kellogg-wide search for scholars studying how AI changes innovation, knowledge production, scientific discovery, organizational decisions, or networks.",
    tags: ["Business school", "AI", "Organizations", "Innovation"],
    fit: { jacob: 60, madison: 97 },
    fitReason: {
      jacob: "A plausible methods and decision-science fit if framed around AI-enabled healthcare organizations or operational innovation.",
      madison: "Near-direct overlap with responsible AI, organizational decision-making, networks, and the institutional consequences of algorithms.",
    },
    requirements: [
      "Curriculum vitae",
      "Copies of research papers",
      "Three letters of recommendation",
      "Approved dissertation proposal or representative dissertation-progress paper for candidates completing a doctorate",
      "Applications are reviewed on a rolling basis; the August 3 full-consideration date has passed",
    ],
    note: "Still listed as open and reviewed on a rolling basis, but the August 3 full-consideration date has passed. Verify before investing substantial effort.",
  },
  {
    id: "stanford-comparative-politics",
    institution: "Stanford University",
    school: "School of Humanities & Sciences",
    department: "Political Science",
    title: "Open Rank Faculty Position — Comparative Politics",
    rank: "Open rank · university tenure line",
    location: "Stanford, CA",
    source: "Stanford",
    sourceUrl:
      "https://facultypositions.stanford.edu/jobs/comparative-politics-open-rank-faculty-position-in-political-science-stanford-university-california-united-states-e90f6365-53c2-4dcb-8a1a-a5f1b07235c8",
    opened: "2026-07-06",
    start: "September 1, 2027",
    deadline: "2026-11-01",
    reviewDate: "2026-09-01",
    summary:
      "Open-rank comparative-politics search accepting assistant-level candidates for a September 2027 appointment.",
    tags: ["Policy", "Institutions", "Comparative politics", "AI governance"],
    fit: { jacob: 25, madison: 70 },
    fitReason: {
      jacob: "An indirect fit unless the health-policy agenda is explicitly comparative and institutionally grounded.",
      madison: "A plausible home for comparative work on algorithmic governance, discrimination, and public-sector AI across institutions.",
    },
    requirements: [
      "Cover letter",
      "Curriculum vitae including publication list",
      "Combined research and teaching statement, maximum three single-spaced pages",
      "Teaching evaluations",
      "PhD-program transcripts",
      "Writing sample",
      "Three letters of recommendation",
    ],
  },
];

const emptyTrackers: TrackerState = { jacob: [], madison: [] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function daysUntil(value: string) {
  const now = new Date();
  const target = new Date(`${value}T23:59:59`);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function JobDashboard() {
  const [trackers, setTrackers] = useState<TrackerState>(emptyTrackers);
  const [dismissedJobIds, setDismissedJobIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeView, setActiveView] = useState<"jobs" | Person>("jobs");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"All" | Job["source"]>("All");
  const [fitFor, setFitFor] = useState<"both" | Person>("both");
  const [sort, setSort] = useState<"deadline" | "fit" | "newest">("deadline");
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as TrackerState;
          setTrackers({
            jacob: Array.isArray(parsed.jacob)
              ? parsed.jacob.filter((entry) => jobs.some((job) => job.id === entry.jobId))
              : [],
            madison: Array.isArray(parsed.madison)
              ? parsed.madison.filter((entry) => jobs.some((job) => job.id === entry.jobId))
              : [],
          });
        } catch {
          setTrackers(emptyTrackers);
        }
      }
      const dismissed = window.localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        try {
          const parsed = JSON.parse(dismissed) as string[];
          setDismissedJobIds(
            Array.isArray(parsed)
              ? parsed.filter((jobId) => jobs.some((job) => job.id === jobId))
              : [],
          );
        } catch {
          setDismissedJobIds([]);
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trackers));
  }, [trackers, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedJobIds));
  }, [dismissedJobIds, hydrated]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...jobs]
      .filter((job) =>
        showHidden ? dismissedJobIds.includes(job.id) : !dismissedJobIds.includes(job.id),
      )
      .filter((job) => source === "All" || job.source === source)
      .filter((job) => {
        if (!normalizedQuery) return true;
        return [
          job.title,
          job.institution,
          job.school,
          job.department,
          job.summary,
          ...job.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sort === "deadline") {
          return (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31");
        }
        if (sort === "newest") return b.opened.localeCompare(a.opened);
        const scoreA = fitFor === "both" ? Math.max(a.fit.jacob, a.fit.madison) : a.fit[fitFor];
        const scoreB = fitFor === "both" ? Math.max(b.fit.jacob, b.fit.madison) : b.fit[fitFor];
        return scoreB - scoreA;
      });
  }, [dismissedJobIds, fitFor, query, showHidden, sort, source]);

  const nextThirty = jobs.filter((job) => {
    if (!job.deadline) return false;
    const remaining = daysUntil(job.deadline);
    return remaining >= 0 && remaining <= 30;
  }).length;

  function isTracked(person: Person, jobId: string) {
    return trackers[person].some((entry) => entry.jobId === jobId);
  }

  function addToTracker(person: Person, jobId: string) {
    if (isTracked(person, jobId)) {
      setActiveView(person);
      return;
    }
    setTrackers((current) => ({
      ...current,
      [person]: [
        ...current[person],
        {
          jobId,
          stage: "Interested",
          notes: "",
          completed: [],
          savedAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function updateEntry(person: Person, jobId: string, patch: Partial<TrackerEntry>) {
    setTrackers((current) => ({
      ...current,
      [person]: current[person].map((entry) =>
        entry.jobId === jobId ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function removeFromTracker(person: Person, jobId: string) {
    setTrackers((current) => ({
      ...current,
      [person]: current[person].filter((entry) => entry.jobId !== jobId),
    }));
  }

  function dismissJob(jobId: string) {
    setDismissedJobIds((current) =>
      current.includes(jobId) ? current : [...current, jobId],
    );
  }

  function restoreJob(jobId: string) {
    setDismissedJobIds((current) => current.filter((item) => item !== jobId));
  }

  function exportTracker(person: Person) {
    const rows = trackers[person].map((entry) => {
      const job = jobs.find((item) => item.id === entry.jobId)!;
      return [
        person === "jacob" ? "Jacob" : "Madison",
        entry.stage,
        job.institution,
        job.school,
        job.department,
        job.title,
        job.rank,
        job.start,
        job.deadline ?? "Not stated",
        job.sourceUrl,
        job.requirements.join(" | "),
        entry.notes,
      ];
    });
    const header = [
      "Candidate",
      "Status",
      "Institution",
      "School",
      "Department",
      "Position",
      "Rank",
      "Start",
      "Deadline",
      "Posting URL",
      "Requirements",
      "Notes",
    ];
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${person}-faculty-applications.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Joint Faculty Search home">
          <span className="brand-mark">J+M</span>
          <span>Joint Faculty Search</span>
        </a>
        <nav aria-label="Dashboard views">
          <button aria-current={activeView === "jobs" ? "page" : undefined} className={activeView === "jobs" ? "nav-active" : ""} onClick={() => setActiveView("jobs")}>
            Opportunities <span>{jobs.length}</span>
          </button>
          <button aria-current={activeView === "jacob" ? "page" : undefined} className={activeView === "jacob" ? "nav-active" : ""} onClick={() => setActiveView("jacob")}>
            Jacob&apos;s sheet <span>{trackers.jacob.length}</span>
          </button>
          <button aria-current={activeView === "madison" ? "page" : undefined} className={activeView === "madison" ? "nav-active" : ""} onClick={() => setActiveView("madison")}>
            Madison&apos;s sheet <span>{trackers.madison.length}</span>
          </button>
        </nav>
      </header>

      <section className="metrics" id="top" aria-label="Search summary">
        <div><strong>{jobs.length}</strong><span>curated openings</span></div>
        <div><strong>{nextThirty}</strong><span>due within 30 days</span></div>
        <div><strong>{trackers.jacob.length + trackers.madison.length}</strong><span>saved applications</span></div>
        <div><strong>6</strong><span>sources · reviewed {observedAt}</span></div>
      </section>

      {activeView === "jobs" ? (
        <section className="content-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Opportunity queue</p>
              <h1>Faculty opportunities</h1>
              <p>A broad, append-only catalog of assistant-professor and assistant-eligible open-rank searches with a credible match to either profile.</p>
            </div>
            <div className="result-tools">
              <p className="result-count">{filteredJobs.length} shown</p>
              {dismissedJobIds.length ? (
                <button className="hidden-toggle" onClick={() => setShowHidden((current) => !current)}>
                  {showHidden ? "Back to opportunities" : `Hidden jobs (${dismissedJobIds.length})`}
                </button>
              ) : null}
            </div>
          </div>

          <details className="profile-criteria">
            <summary>Matching criteria</summary>
            <div className="criteria-grid">
              <div>
                <strong>Jacob</strong>
                <span>Healthcare operations and delivery · causal inference and real-world evidence · decision modeling, reinforcement learning, and personalized medicine · health and public policy</span>
              </div>
              <div>
                <strong>Madison</strong>
                <span>Responsible AI and algorithmic fairness · inequality and discrimination · computational methods and experiments · healthcare, lending, criminal justice, and education</span>
              </div>
              <div>
                <strong>Eligibility</strong>
                <span>Assistant Professor, or an open-rank search accepting assistant-level applicants. Confirmed Fall 2027 roles are labeled; plausible 2027-cycle roles stay visible with a verification flag when the posting omits its start date.</span>
              </div>
            </div>
          </details>

          <div className="filters">
            <label className="search-field">
              <span>Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="School, field, method, or keyword"
              />
            </label>
            <label>
              <span>Source</span>
              <select value={source} onChange={(event) => setSource(event.target.value as typeof source)}>
                <option>All</option>
                <option>Berkeley</option>
                <option>Stanford</option>
                <option>UCLA</option>
                <option>USC</option>
                <option>Columbia</option>
                <option>Northwestern</option>
              </select>
            </label>
            <label>
              <span>Score for</span>
              <select value={fitFor} onChange={(event) => setFitFor(event.target.value as typeof fitFor)}>
                <option value="both">Best of either</option>
                <option value="jacob">Jacob</option>
                <option value="madison">Madison</option>
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="deadline">Deadline</option>
                <option value="fit">Fit score</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>

          <div className="job-list">
            {!filteredJobs.length ? (
              <div className="no-results">
                <h3>{showHidden ? "No hidden jobs" : "No matching Fall 2027 roles"}</h3>
                <p>{showHidden ? "Dismissed jobs will appear here." : "This approved source does not currently have an eligible match."}</p>
              </div>
            ) : null}
            {filteredJobs.map((job) => {
              const remaining = job.deadline ? daysUntil(job.deadline) : null;
              const urgency = remaining === null ? "later" : remaining <= 30 ? "urgent" : remaining <= 60 ? "soon" : "later";
              return (
                <article className="job-card" key={job.id}>
                  <div className="job-main">
                    <div className="job-source-row">
                      <span className={`source-badge ${job.source.toLowerCase()}`}>{job.source}</span>
                      <span>{job.school}</span>
                    </div>
                    <h3>{job.title}</h3>
                    <p className="department">{job.department} · {job.location}</p>
                    <p className="summary">{job.summary}</p>
                    <div className="tags">
                      {job.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    {job.note ? <p className="eligibility-note">{job.note}</p> : null}
                    <details>
                      <summary>Fit and application requirements</summary>
                      <div className="details-grid">
                        <div>
                          <h4>Why it surfaced</h4>
                          <p><strong>Jacob:</strong> {job.fitReason.jacob}</p>
                          <p><strong>Madison:</strong> {job.fitReason.madison}</p>
                        </div>
                        <div>
                          <h4>Application materials</h4>
                          <ul>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                        </div>
                      </div>
                    </details>
                  </div>

                  <aside className="job-side">
                    <div className="deadline-block">
                      <span className={`deadline-dot ${urgency}`} />
                      <div>
                        <span>Deadline</span>
                        <strong>{job.deadline ? formatDate(job.deadline) : "Not stated"}</strong>
                        <small>{remaining === null ? "Verify on original posting" : remaining >= 0 ? `${remaining} days remaining` : "Deadline passed"}</small>
                      </div>
                    </div>
                    <p className="start-date"><span>Starts</span><strong>{job.start}</strong></p>
                    {job.reviewDate ? <p className="review-date">Priority review {formatDate(job.reviewDate)}</p> : null}
                    <div className="fit-scores">
                      <div><span>Jacob fit</span><strong>{job.fit.jacob}</strong></div>
                      <div><span>Madison fit</span><strong>{job.fit.madison}</strong></div>
                    </div>
                    <div className="card-actions">
                      {showHidden ? (
                        <button className="restore-button" onClick={() => restoreJob(job.id)}>
                          Restore to opportunities
                        </button>
                      ) : (
                        <>
                          <button
                            className={isTracked("jacob", job.id) ? "added jacob" : "add-button jacob"}
                            onClick={() => addToTracker("jacob", job.id)}
                          >
                            {isTracked("jacob", job.id) ? "View Jacob's sheet" : "+ Add for Jacob"}
                          </button>
                          <button
                            className={isTracked("madison", job.id) ? "added madison" : "add-button madison"}
                            onClick={() => addToTracker("madison", job.id)}
                          >
                            {isTracked("madison", job.id) ? "View Madison's sheet" : "+ Add for Madison"}
                          </button>
                          <button className="dismiss-button" onClick={() => dismissJob(job.id)}>
                            Not interested
                          </button>
                        </>
                      )}
                      <a href={job.sourceUrl} target="_blank" rel="noreferrer">Open original posting ↗</a>
                    </div>
                  </aside>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <TrackerSheet
          person={activeView}
          entries={trackers[activeView]}
          onUpdate={updateEntry}
          onRemove={removeFromTracker}
          onExport={exportTracker}
          onBrowse={() => setActiveView("jobs")}
        />
      )}

      <footer>
        <p>Job information should be verified against the original posting before submission.</p>
        <p>Tracker data stays in this browser. <a href="jobs.xml">RSS feed</a> · Export CSV backups regularly.</p>
      </footer>
    </main>
  );
}

function TrackerSheet({
  person,
  entries,
  onUpdate,
  onRemove,
  onExport,
  onBrowse,
}: {
  person: Person;
  entries: TrackerEntry[];
  onUpdate: (person: Person, jobId: string, patch: Partial<TrackerEntry>) => void;
  onRemove: (person: Person, jobId: string) => void;
  onExport: (person: Person) => void;
  onBrowse: () => void;
}) {
  const name = person === "jacob" ? "Jacob" : "Madison";
  const personJobs = entries
    .map((entry) => ({ entry, job: jobs.find((job) => job.id === entry.jobId)! }))
    .sort((a, b) => (a.job.deadline ?? "9999-12-31").localeCompare(b.job.deadline ?? "9999-12-31"));

  return (
    <section className="content-shell tracker-shell">
      <div className="section-heading tracker-heading">
        <div>
          <p className="eyebrow">Private application sheet</p>
          <h2>{name}&apos;s applications</h2>
          <p>Track decisions, work through requirements, and export a private backup whenever you like.</p>
        </div>
        <button className="export-button" onClick={() => onExport(person)} disabled={!entries.length}>
          Export CSV
        </button>
      </div>

      <div className="privacy-callout">
        <strong>Stored locally</strong>
        <span>This sheet is saved only in this browser. It is not included in the public job dashboard.</span>
      </div>

      {!personJobs.length ? (
        <div className="empty-state">
          <span>{name.slice(0, 1)}</span>
          <h3>No applications saved yet</h3>
          <p>Return to the opportunity queue and add promising positions to {name}&apos;s sheet.</p>
          <button onClick={onBrowse}>Browse opportunities</button>
        </div>
      ) : (
        <div className="tracker-list">
          {personJobs.map(({ entry, job }) => (
            <article className="tracker-card" key={entry.jobId}>
              <div className="tracker-card-top">
                <div>
                  <span className={`source-badge ${job.source.toLowerCase()}`}>{job.source}</span>
                  <h3>{job.title}</h3>
                  <p>{job.institution} · {job.department}</p>
                </div>
                <div className="tracker-deadline">
                  <span>Deadline</span>
                  <strong>{job.deadline ? formatDate(job.deadline) : "Not stated"}</strong>
                  <small>Starts {job.start}</small>
                </div>
              </div>

              <div className="tracker-grid">
                <label>
                  <span>Application status</span>
                  <select
                    value={entry.stage}
                    onChange={(event) => onUpdate(person, job.id, { stage: event.target.value as Stage })}
                  >
                    <option>Interested</option>
                    <option>Researching</option>
                    <option>Applying</option>
                    <option>Submitted</option>
                    <option>Passed</option>
                  </select>
                </label>
                <label>
                  <span>Private notes</span>
                  <textarea
                    value={entry.notes}
                    onChange={(event) => onUpdate(person, job.id, { notes: event.target.value })}
                    placeholder="Fit, contacts, tailoring ideas, or questions…"
                  />
                </label>
              </div>

              <div className="requirements-panel">
                <div className="requirements-title">
                  <h4>Application requirements</h4>
                  <span>{entry.completed.length}/{job.requirements.length} complete</span>
                </div>
                <div className="checklist">
                  {job.requirements.map((requirement, index) => {
                    const checked = entry.completed.includes(index);
                    return (
                      <label key={requirement} className={checked ? "checked" : ""}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const completed = checked
                              ? entry.completed.filter((item) => item !== index)
                              : [...entry.completed, index];
                            onUpdate(person, job.id, { completed });
                          }}
                        />
                        <span>{requirement}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="tracker-actions">
                <a className="posting-link" href={job.sourceUrl} target="_blank" rel="noreferrer">
                  Verify on original posting ↗
                </a>
                <button
                  className="remove-button"
                  onClick={() => {
                    if (window.confirm(`Remove this job from ${name}'s sheet? Notes and checklist progress will be deleted.`)) {
                      onRemove(person, job.id);
                    }
                  }}
                >
                  Remove from {name}&apos;s sheet
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
