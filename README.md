# Joint Faculty Search

A two-person faculty-job dashboard for Jacob and Madison. The discovery queue contains positions relevant to at least one candidate; each candidate can save a position to a separate, private, browser-local tracker.

## Current behavior

- Curated opportunities from the two approved university sources
- Separate fit scores and fit explanations for Jacob and Madison
- Search, source filtering, candidate-specific ranking, and deadline sorting
- One-click addition to either private application sheet
- Confirmed removal from either private application sheet
- Status, notes, and requirement checklists saved in the current browser
- CSV export for private backup or import into Google Sheets
- RSS feed at `jobs.xml`

## Matching profiles

- **Jacob:** healthcare operations and delivery; causal inference and real-world evidence; decision modeling, reinforcement learning, and personalized medicine; health and public policy.
- **Madison:** responsible AI and algorithmic fairness; inequality and discrimination; computational methods and experiments; healthcare, lending, criminal justice, and education.
- **Eligibility:** assistant-professor searches and open-rank searches that accept assistant-level applicants only.

## Source boundary

The only approved sources are defined in `config/sources.json`:

1. UC Berkeley Academic Personnel Recruit
2. Stanford Faculty Positions

No aggregator or additional university website should be queried unless its URL is explicitly provided and added to the approved-source configuration.

## Privacy

Public job information is part of the site. Candidate decisions, notes, and checklist progress are stored in browser storage on the reviewing computer and are not included in the site source. Use the CSV export as a periodic backup.

GitHub Pages is a public website host. The URL may be obscure, but the page itself is not access-controlled. The site therefore contains only public job information; all private decisions and notes remain in browser storage.

## RSS and email alerts

The static RSS feed contains the same curated openings as the dashboard. An RSS-to-email service can subscribe to the deployed `jobs.xml` URL. The feed will gain new items when the source-refresh process updates the curated data; automated source collection and email delivery are the next phase.

## Next build step

Move the curated job records into a generated data file, add source-specific collectors, and schedule a GitHub Action to refresh only the approved sources. Stanford's search interface and Berkeley AP Recruit require separate collection adapters.

## GitHub Pages

The included workflow builds a static export and publishes it whenever `main` is pushed. After creating the GitHub repository, select **GitHub Actions** as the Pages source under repository settings. Tracker information remains browser-local and is never written to the repository.
