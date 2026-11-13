import { Actor, log } from 'apify';

const strip = (html) => (html ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
const iso = (v) => { if (v == null || v === '') return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString(); };
const isRemote = (...parts) => /\bremote\b|work from home|anywhere/i.test(parts.filter(Boolean).join(' '));

async function getJson(url) {
    for (let attempt = 1; ; attempt++) {
        const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ats-jobs-monitor (Apify Actor)' }, signal: AbortSignal.timeout(45_000) });
        if (res.status === 404) return null;
        if (res.ok) return res.json().catch(() => null); // a non-JSON page means no board here
        // Public APIs: honour server back-pressure instead of hammering.
        if (attempt >= 4 || ![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        await new Promise((r) => setTimeout(r, (Number(res.headers.get('retry-after')) || 2 ** attempt) * 1000));
    }
}

// Each fetcher returns null when the board does not exist, else an array of normalized jobs.
const ATS = {
    greenhouse: async (slug) => {
        const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
        return d?.jobs?.map((j) => ({
            id: String(j.id), title: j.title, company: j.company_name ?? slug,
            department: j.departments?.map((x) => x.name).join(', ') || null,
            location: j.location?.name ?? null, remote: isRemote(j.location?.name, j.title),
            employmentType: null, postedAt: iso(j.first_published), updatedAt: iso(j.updated_at),
            url: j.absolute_url, applyUrl: j.absolute_url, compensation: null, description: strip(j.content),
        })) ?? null;
    },
    lever: async (slug) => {
        const d = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        return Array.isArray(d) ? d.map((j) => ({
            id: j.id, title: j.text, company: slug,
            department: [j.categories?.department, j.categories?.team].filter(Boolean).join(' / ') || null,
            location: j.categories?.allLocations?.join('; ') || j.categories?.location || null,
            remote: j.workplaceType === 'remote' || isRemote(j.categories?.location),
            employmentType: j.categories?.commitment ?? null, postedAt: iso(j.createdAt), updatedAt: null,
            url: j.hostedUrl, applyUrl: j.applyUrl,
            compensation: j.salaryRange ? { min: j.salaryRange.min, max: j.salaryRange.max, currency: j.salaryRange.currency, interval: j.salaryRange.interval } : null,
            description: [j.descriptionPlain, ...(j.lists ?? []).map((l) => `${l.text}\n${strip(l.content)}`), j.additionalPlain].filter(Boolean).join('\n\n'),
        })) : null;
    },
    ashby: async (slug) => {
        const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
        return d?.jobs?.map((j) => ({
            id: j.id, title: j.title, company: slug,
            department: [j.department, j.team].filter(Boolean).join(' / ') || null,
            location: [j.location, ...(j.secondaryLocations ?? []).map((l) => l.location)].filter(Boolean).join('; ') || null,
            remote: j.isRemote === true || isRemote(j.location),
            employmentType: j.employmentType ?? null, postedAt: iso(j.publishedAt), updatedAt: null,
            url: j.jobUrl, applyUrl: j.applyUrl,
            compensation: j.compensation?.compensationTierSummary ? { summary: j.compensation.compensationTierSummary } : null,
            description: j.descriptionPlain ?? strip(j.descriptionHtml),
        })) ?? null;
    },
    smartrecruiters: async (slug) => {
        const out = [];
        for (let offset = 0; ; offset += 100) {
            const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100&offset=${offset}`);
            if (!d) return null;
            for (const j of d.content ?? []) {
                out.push({
                    id: j.id, title: j.name, company: j.company?.name ?? slug,
                    department: j.department?.label ?? j.function?.label ?? null,
                    location: j.location?.fullLocation ?? [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', ') ?? null,
                    remote: j.location?.remote === true,
                    employmentType: j.typeOfEmployment?.label ?? null, postedAt: iso(j.releasedDate), updatedAt: null,
                    url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`, applyUrl: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
                    compensation: null, description: null, _detail: j.ref,
                });
            }
            if (offset + 100 >= (d.totalFound ?? 0)) break;
        }
        // An unknown company answers 200 with zero postings, so an empty board is "not found" during auto-detect.
        return out.length ? out : null;
    },
    recruitee: async (slug) => {
        const d = await getJson(`https://${slug}.recruitee.com/api/offers/`).catch(() => null);
        return d?.offers?.map((j) => ({
            id: String(j.id), title: j.title, company: j.company_name ?? slug,
            department: j.department ?? null, location: j.location ?? [j.city, j.country].filter(Boolean).join(', ') ?? null,
            remote: j.remote === true || isRemote(j.location),
            employmentType: j.employment_type_code ?? null, postedAt: iso(j.published_at ?? j.created_at), updatedAt: iso(j.updated_at),
            url: j.careers_url, applyUrl: j.careers_apply_url ?? j.careers_url,
            compensation: j.salary?.min ? { min: Number(j.salary.min), max: Number(j.salary.max), currency: j.salary.currency, interval: j.salary.period } : null,
            description: strip([j.description, j.requirements].filter(Boolean).join('\n')),
        })) ?? null;
    },
};

const URL_PATTERNS = [
    ['greenhouse', /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([\w-]+)/i],
    ['lever', /jobs(?:\.eu)?\.lever\.co\/([\w-]+)/i],
    ['ashby', /jobs\.ashbyhq\.com\/([\w.%-]+)/i],
    ['smartrecruiters', /(?:jobs|careers)\.smartrecruiters\.com\/([\w-]+)/i],
    ['recruitee', /([\w-]+)\.recruitee\.com/i],
];

// Accepts a careers URL, "ats:slug", or a bare slug (probed against every platform).
function resolve(entry) {
    for (const [ats, re] of URL_PATTERNS) { const m = entry.match(re); if (m) return [{ ats, slug: decodeURIComponent(m[1]) }]; }
    const m = entry.match(/^(\w+)\s*:\s*([\w.-]+)$/);
    if (m && ATS[m[1].toLowerCase()]) return [{ ats: m[1].toLowerCase(), slug: m[2] }];
    if (/^[\w.-]+$/.test(entry)) return Object.keys(ATS).map((ats) => ({ ats, slug: entry.toLowerCase() }));
    return [];
}

await Actor.init();
const input = (await Actor.getInput()) ?? {};
const companies = (input.companies ?? []).map((c) => String(c).trim()).filter(Boolean);
if (!companies.length) await Actor.fail('Input "companies" must list at least one company or careers-page URL.');

const lower = (list) => (list ?? []).map((s) => String(s).toLowerCase().trim()).filter(Boolean);
const titleKw = lower(input.titleKeywords); const titleEx = lower(input.excludeTitleKeywords); const locKw = lower(input.locationKeywords);
const cutoff = input.postedWithinDays ? Date.now() - input.postedWithinDays * 864e5 : null;
const keep = (j) => (!titleKw.length || titleKw.some((k) => j.title?.toLowerCase().includes(k)))
    && !titleEx.some((k) => j.title?.toLowerCase().includes(k))
    && (!locKw.length || locKw.some((k) => (j.location ?? '').toLowerCase().includes(k)) || (j.remote && locKw.includes('remote')))
    && (!input.remoteOnly || j.remote)
    && (!cutoff || (j.postedAt && Date.parse(j.postedAt) >= cutoff));

// "Only new jobs" remembers what earlier runs returned, in a named store that survives between runs.
const store = input.onlyNewJobs ? await Actor.openKeyValueStore(`ats-jobs-seen-${(input.monitorName || 'default').replace(/[^\w-]/g, '-')}`) : null;
const seen = new Set((await store?.getValue('SEEN')) ?? []);
const scrapedAt = new Date().toISOString();
let total = 0; let stop = false; const summary = [];

for (const entry of companies) {
    if (stop) break;
    const candidates = resolve(entry);
    if (!candidates.length) { log.warning(`Skipping "${entry}": not a recognised careers URL, ats:slug or company slug.`); summary.push({ entry, error: 'unrecognised' }); continue; }
    let found = false;
    for (const { ats, slug } of candidates) {
        let jobs;
        try { jobs = await ATS[ats](slug); } catch (err) { log.warning(`${ats}:${slug} failed: ${err.message}`); summary.push({ entry, ats, error: err.message }); continue; }
        if (!jobs) continue;
        found = true;
        let matched = jobs.filter(keep).filter((j) => !seen.has(`${ats}:${slug}:${j.id}`));
        if (input.maxJobsPerCompany) matched = matched.slice(0, input.maxJobsPerCompany);
        for (const j of matched) {
            if (j._detail && input.includeDescription !== false) {
                const d = await getJson(j._detail).catch(() => null);
                const s = d?.jobAd?.sections ?? {};
                j.description = strip(['companyDescription', 'jobDescription', 'qualifications', 'additionalInformation'].map((k) => s[k]?.text).filter(Boolean).join('\n'));
            }
            delete j._detail;
            if (input.includeDescription === false) delete j.description;
            const charge = await Actor.pushData({ ats, companySlug: slug, ...j, scrapedAt }, 'job-result').catch(async () => { await Actor.pushData({ ats, companySlug: slug, ...j, scrapedAt }); return null; });
            seen.add(`${ats}:${slug}:${j.id}`); total++;
            if (charge?.eventChargeLimitReached) { log.warning('Maximum charge for this run reached; stopping early.'); stop = true; break; }
        }
        log.info(`${ats}:${slug} — ${jobs.length} open jobs, ${matched.length} returned`);
        summary.push({ entry, ats, slug, openJobs: jobs.length, returned: matched.length });
        break;
    }
    if (!found && !summary.some((s) => s.entry === entry)) { log.warning(`No public job board found for "${entry}".`); summary.push({ entry, error: 'no job board found' }); }
}

await store?.setValue('SEEN', [...seen]);
await Actor.setValue('SUMMARY', { scrapedAt, totalJobs: total, companies: summary });
await Actor.exit(`Finished: ${total} jobs from ${summary.filter((s) => s.ats && !s.error).length} of ${companies.length} companies.`);
