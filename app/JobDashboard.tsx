"use client";

import { useEffect, useMemo, useState } from "react";

import jobCatalog from "@/data/jobs.json";
import refreshData from "@/data/refresh-report.json";

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
const refreshReport = refreshData as {
  refreshed_at: string;
  approved_sources: number;
  successful_sources: number;
  source_errors: number;
  sources: Array<{
    source: Job["source"];
    status: "ok" | "partial" | "error";
    discovered: number;
    matched: number;
    error?: string;
    warning?: string;
  }>;
};
const observedAt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date(refreshReport.refreshed_at));

const jobs: Job[] = jobCatalog as unknown as Job[];

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
        <div><strong>{refreshReport.successful_sources}/{refreshReport.approved_sources}</strong><span>sources checked · {observedAt}</span></div>
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

          <details className={`refresh-status ${refreshReport.source_errors ? "has-errors" : ""}`}>
            <summary>
              Latest source check: {refreshReport.source_errors
                ? `${refreshReport.source_errors} source needs attention`
                : "all sources reached"}
            </summary>
            <div className="source-status-grid">
              {refreshReport.sources.map((item) => (
                <div key={item.source} className={item.status}>
                  <strong>{item.source}</strong>
                  <span>{item.status === "error" ? "Could not check" : `${item.discovered} listings scanned · ${item.matched} retained matches`}</span>
                  {item.error || item.warning ? <small>{item.error || item.warning}</small> : null}
                </div>
              ))}
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
