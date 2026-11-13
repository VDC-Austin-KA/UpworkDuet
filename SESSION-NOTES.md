# Session notes — 2026-11-13

Carried over from a Claude Code session so work can continue from this repo.

## Goal
Launch something that earns real, verifiable revenue with as little owner involvement as possible. Revenue so far: $0.

## What exists now

### Upwork: Google Sheets / Apps Script catalog listing
`_listings/google-sheets-apps-script/` holds paste-ready content for every step of the Project Catalog form
(title, category, tags, three tiers at $60 / $150 / $350, requirements, description, FAQ) and a 4:3 gallery image.
The owner was stuck on a step of this form; which step is unknown. The limits listed in section 7 of `LISTING.md`
are from memory and unverified.

### Apify: `ats-jobs-monitor` actor
`apify/ats-jobs-monitor/` is the source. It returns open jobs from Greenhouse, Lever, Ashby, SmartRecruiters and
Recruitee through their public job-board APIs (no proxies), with title/location/date filters and an
"only new jobs since last run" mode.

- Built and run successfully on Apify (build 1.0.1; 15 jobs from 3 companies in ~3 s, ~$0.0001 platform cost).
- Still private and unpriced. Two owner-only steps remain, both on the actor's Publication page in Apify Console:
  1. enter payout billing info (Apify refuses pricing without it);
  2. set pay-per-event pricing, event `job-result` at $0.001, then publish.
- Deploy changes with `apify push` from the actor folder.
- Workable was removed: its widget API did not return jobs reliably in testing.

## Ruled out, and why
- **Google Trends actor** — highest demand gap on Apify Store, but beating Google's rate limits needs session/proxy
  rotation, which is bot-check circumvention. Not built.
- **Open-source bounties** — no open, uncontested bounties of $100+ found.
- **Navisworks clash-report tool** — a free competitor already covers it.
- **Recount (offline dictation app) via Microsoft Store** — route is viable (free individual account, free MSIX
  signing) but the app source is not on GitHub, so nothing could be built from a cloud session.

## Next steps
1. Owner: Apify payout info, pricing, publish.
2. Owner: finish the Upwork listing with `LISTING.md`; report the step and error text if it still blocks.
3. After publishing: watch the actor's users and run stats, then add platforms or adjust price based on real usage.
