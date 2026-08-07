# Joint Faculty Search

A two-person faculty-job dashboard for Jacob and Madison. The discovery queue contains positions relevant to at least one candidate; each candidate can save a position to a separate, private, browser-local tracker.

Live dashboard: <https://jacobjameson.com/faculty-job-tracker/>

## Current behavior

- Broad opportunities from the six approved university sources
- Separate fit scores and fit explanations for Jacob and Madison
- Search, source filtering, candidate-specific ranking, and deadline sorting
- One-click addition to either private application sheet
- Confirmed removal from either private application sheet
- Persistent “Not interested” dismissal with a reversible hidden-jobs view
- Status, notes, and requirement checklists saved in the current browser
- CSV export for private backup or import into Google Sheets
- RSS feed at `jobs.xml`
- Daily automated refresh with a source-by-source audit report

## Matching profiles

- **Jacob:** healthcare operations and delivery; causal inference and real-world evidence; decision modeling, reinforcement learning, and personalized medicine; health and public policy.
- **Madison:** responsible AI and algorithmic fairness; inequality and discrimination; computational methods and experiments; healthcare, lending, criminal justice, and education.
- **Eligibility:** assistant-professor searches and open-rank searches that accept assistant-level applicants. Automated additions require an explicit Fall 2027 or 2027–28 start. Earlier manually reviewed roles with unstated timing remain visible with a verification warning so the append-only policy does not silently erase them.

## Loss-resistant refresh policy

- Collection is broad first; fit scores and user feedback organize the results afterward.
- `config/catalog-history.json` is append-only. Tests fail if a refresh silently removes a previously admitted source ID.
- A source page that temporarily disappears or omits a date is flagged for verification rather than deleted.
- Only an explicit “Not interested” choice hides a job in the browser. Hidden jobs remain recoverable from the dashboard.
- When a university confirms that a posting closed, the durable design is to archive it with a status instead of erasing its record.

## Source boundary

The only approved sources are defined in `config/sources.json`:

1. UC Berkeley Academic Personnel Recruit
2. Stanford Faculty Positions
3. UCLA Academic Recruit
4. USC Faculty Careers
5. Columbia Academic Search and Recruiting
6. Northwestern Careers

No aggregator or additional university website should be queried unless its URL is explicitly provided and added to the approved-source configuration.

## Privacy

Public job information is part of the site. Candidate decisions, notes, and checklist progress are stored in browser storage on the reviewing computer and are not included in the site source. Use the CSV export as a periodic backup.

GitHub Pages is a public website host. The URL may be obscure, but the page itself is not access-controlled. The site therefore contains only public job information; all private decisions and notes remain in browser storage.

## RSS and email alerts

The RSS feed contains the same openings as the dashboard:

<https://jacobjameson.com/faculty-job-tracker/jobs.xml>

To receive email, create a free Feedrabbit subscription at <https://feedrabbit.com/> using that feed URL, then confirm the verification email. Each of you can subscribe independently. Feedrabbit sends mail when the feed gains a new stable job ID; no email addresses or credentials are stored in this repository.

## Automated refresh

GitHub Actions runs `.github/workflows/refresh-jobs.yml` every day at **15:15 UTC** (8:15 a.m. Pacific during daylight time, 7:15 a.m. during standard time). It:

1. Scans only the six approved hostnames in `config/sources.json`.
2. Keeps only assistant-professor and assistant-eligible open-rank searches matching at least one profile and explicitly stating a Fall 2027 or 2027–28 start.
3. Appends newly admitted jobs without deleting or replacing earlier jobs.
4. Regenerates the RSS feed and `data/refresh-report.json`.
5. Runs lint, tests, and both production builds before committing data and deploying Pages.

To refresh immediately, open the repository's **Actions** tab, choose **Refresh jobs and deploy dashboard**, and select **Run workflow**. Routine daily updates require no action.

The dashboard shows the latest source status. A blocked source is reported visibly and leaves the existing catalog untouched; it is never interpreted as “zero jobs.” Columbia currently returns a Cloudflare challenge to automated requests, so that source may show as needing attention until its site permits the scheduled runner.

Local commands:

```bash
npm run refresh:jobs:dry  # inspect proposed additions without changing files
npm run refresh:jobs      # append matches and update RSS/report
```

## GitHub Pages

The deployment workflow publishes a static export whenever `main` is pushed. The scheduled refresh workflow also deploys after a successful collection and validation run. Tracker information remains browser-local and is never written to the repository.
