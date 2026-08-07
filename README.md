# Joint Faculty Search

A two-person faculty-job dashboard for Jacob and Madison. The discovery queue contains positions relevant to at least one candidate; each candidate can save a position to a separate, private, browser-local tracker.

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

## Matching profiles

- **Jacob:** healthcare operations and delivery; causal inference and real-world evidence; decision modeling, reinforcement learning, and personalized medicine; health and public policy.
- **Madison:** responsible AI and algorithmic fairness; inequality and discrimination; computational methods and experiments; healthcare, lending, criminal justice, and education.
- **Eligibility:** assistant-professor searches and open-rank searches that accept assistant-level applicants. Confirmed Fall 2027 starts are labeled; plausible 2027-cycle roles remain visible with a verification warning when the source omits the start date.

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

The static RSS feed contains the same curated openings as the dashboard. An RSS-to-email service can subscribe to the deployed `jobs.xml` URL. The feed will gain new items when the source-refresh process updates the curated data; automated source collection and email delivery are the next phase.

## Next build step

Move the job records into a generated data file, add source-specific collectors, and schedule a GitHub Action to merge new results from only the approved sources. The merge must preserve `catalog-history.json`, emit an audit report, and archive confirmed closures rather than replacing the catalog wholesale.

## GitHub Pages

The included workflow builds a static export and publishes it whenever `main` is pushed. After creating the GitHub repository, select **GitHub Actions** as the Pages source under repository settings. Tracker information remains browser-local and is never written to the repository.
