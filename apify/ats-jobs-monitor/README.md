# ATS Jobs Scraper & Monitor

Pull every open job from company career pages hosted on **Greenhouse, Lever, Ashby, SmartRecruiters and Recruitee**, in one consistent format. Paste a list of careers URLs or company names and get structured jobs back, or schedule it and receive only the jobs posted since the last run.

It reads each platform's official public job-board API, so runs are fast, need no proxies, and do not break when a careers page is redesigned.

## What you can do with it

- **Job boards and aggregators:** keep listings for hundreds of companies in sync.
- **Recruiters and sales teams:** see who is hiring for which roles as a buying signal.
- **Job seekers:** watch a list of target companies and get only new, matching roles.
- **Market research:** track hiring by department, location and remote share over time.

## Input

| Field | What it does |
|---|---|
| **Companies** | Careers URL (`boards.greenhouse.io/stripe`), `platform:name` (`ashby:ramp`), or just the name used in the careers URL (`notion`); the platform is then detected automatically. |
| **Job title must contain / must not contain** | Keyword filters on the title. |
| **Location must contain** | Keyword filter on location, e.g. `London`, `Remote`. |
| **Remote jobs only** | Keep only jobs the employer marks as remote. |
| **Posted within the last N days** | Date filter. |
| **Only jobs not returned by earlier runs** | Turns the Actor into a new-jobs feed. Use with a schedule. |
| **Monitor name** | Separate memories for separate feeds. |
| **Include full job description** | Turn off for lighter output. |
| **Max jobs per company** | Cap per company. |

```json
{
  "companies": ["https://boards.greenhouse.io/stripe", "jobs.ashbyhq.com/ramp", "notion"],
  "titleKeywords": ["engineer"],
  "locationKeywords": ["remote", "new york"],
  "onlyNewJobs": true
}
```

## Output

One item per job:

```json
{
  "ats": "ashby",
  "companySlug": "ramp",
  "id": "34413f8d-26bf-4bbc-8ade-eb309a0e2245",
  "title": "Software Engineer, Security, Cloud",
  "company": "ramp",
  "department": "Engineering / Backend",
  "location": "New York, NY (HQ); Remote (US)",
  "remote": true,
  "employmentType": "FullTime",
  "postedAt": "2026-04-07T17:12:35.753Z",
  "updatedAt": null,
  "url": "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245",
  "applyUrl": "https://jobs.ashbyhq.com/ramp/34413f8d-26bf-4bbc-8ade-eb309a0e2245/application",
  "compensation": { "summary": "$180K – $250K" },
  "description": "Plain-text job description…",
  "scrapedAt": "2026-11-13T22:27:00.000Z"
}
```

`compensation`, `employmentType`, `department` and `updatedAt` are filled when the platform publishes them and are `null` otherwise. A per-company summary of the run (open jobs found, jobs returned, companies not found) is saved under the `SUMMARY` key of the run's key-value store.

## Pricing

Pay per job returned. Jobs removed by your filters, companies that are not found and jobs skipped by "only new jobs" cost nothing.

## Monitoring new jobs

1. Turn on **Only jobs not returned by earlier runs**.
2. Create a schedule (hourly or daily).
3. Connect the dataset to Slack, email, Google Sheets, Zapier, Make or n8n using Apify integrations.

The first run returns everything currently open that matches your filters; later runs return only additions.

## Limits

- Covers companies that use one of the five supported platforms. A company that hosts jobs elsewhere is reported as not found.
- "Remote" reflects what the employer entered and can be missing on platforms without a remote flag.
- Use the exact company name from the careers URL; SmartRecruiters names are case-sensitive (`BoschGroup`).
