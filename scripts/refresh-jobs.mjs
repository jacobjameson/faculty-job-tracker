import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { load } from "cheerio";

const root = new URL("../", import.meta.url);
const catalogUrl = new URL("data/jobs.json", root);
const historyUrl = new URL("config/catalog-history.json", root);
const matchingUrl = new URL("config/matching.json", root);
const sourcesUrl = new URL("config/sources.json", root);
const reportUrl = new URL("data/refresh-report.json", root);
const rssUrl = new URL("public/jobs.xml", root);
const writeChanges = process.argv.includes("--write");
const today = new Date().toISOString().slice(0, 10);
const refreshedAt = new Date().toISOString();

const [catalog, history, matching, sourceConfig] = await Promise.all(
  [catalogUrl, historyUrl, matchingUrl, sourcesUrl].map(async (url) =>
    JSON.parse(await readFile(url, "utf8")),
  ),
);

const approvedHosts = new Set(
  sourceConfig.approved_sources.map((source) => source.allowed_hostname),
);

const SOURCE_META = {
  "aprecruit.berkeley.edu": {
    key: "Berkeley",
    institution: "University of California, Berkeley",
    school: "Academic unit listed in official posting",
    adapter: "ap-recruit",
  },
  "facultypositions.stanford.edu": {
    key: "Stanford",
    institution: "Stanford University",
    school: "School listed in official posting",
    adapter: "stanford",
  },
  "recruit.apo.ucla.edu": {
    key: "UCLA",
    institution: "University of California, Los Angeles",
    school: "Academic unit listed in official posting",
    adapter: "ap-recruit",
  },
  "usccareers.usc.edu": {
    key: "USC",
    institution: "University of Southern California",
    school: "School or division listed in official posting",
    adapter: "usc",
  },
  "academic.careers.columbia.edu": {
    key: "Columbia",
    institution: "Columbia University",
    school: "Academic unit listed in official posting",
    adapter: "columbia",
  },
  "careers.northwestern.edu": {
    key: "Northwestern",
    institution: "Northwestern University",
    school: "Academic unit listed in official posting",
    adapter: "northwestern",
  },
};

function clean(value = "") {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function assertAllowed(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || !approvedHosts.has(url.hostname)) {
    throw new Error(`Refusing unapproved source URL: ${url.href}`);
  }
  return url;
}

function normalizeUrl(rawUrl) {
  const url = assertAllowed(rawUrl);
  ["utm_source", "utm_medium", "utm_campaign", "page", "PAGE"].forEach((key) => {
    if (key.toLowerCase() === "page" && url.searchParams.get(key) === "HRS_APP_JBPST_FL") {
      return;
    }
    if (key.startsWith("utm_")) url.searchParams.delete(key);
  });
  url.hash = "";
  return url.href.replace(/\/$/, "");
}

class SourceSession {
  constructor() {
    this.cookies = new Map();
  }

  storeCookies(headers) {
    const values = headers.getSetCookie?.() ?? [];
    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }

  async get(rawUrl) {
    let current = assertAllowed(rawUrl);
    for (let redirectCount = 0; redirectCount < 8; redirectCount += 1) {
      const response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(45_000),
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Jacob-Madison-Faculty-Job-Tracker/1.0",
          ...(this.cookies.size
            ? { cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; ") }
            : {}),
        },
      });
      this.storeCookies(response.headers);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error(`Redirect without location from ${current.href}`);
        current = assertAllowed(new URL(location, current).href);
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${current.href}`);
      const html = await response.text();
      if (!html.trim()) throw new Error(`Empty response from ${current.href}`);
      return { html, url: current.href };
    }
    throw new Error(`Too many redirects from ${rawUrl}`);
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function uniqueListings(listings) {
  const seen = new Set();
  return listings.filter((listing) => {
    const key = normalizeUrl(listing.url);
    if (seen.has(key)) return false;
    seen.add(key);
    listing.url = key;
    return true;
  });
}

async function discoverApRecruit(source, session) {
  const { html } = await session.get(source.listing_url);
  const $ = load(html);
  return uniqueListings(
    $('a[href*="/JPF"]')
      .map((_, element) => {
        const anchor = $(element);
        const row = anchor.closest("tr");
        const title = clean(row.find("td.name .name").first().text())
          || clean(anchor.attr("aria-label")?.replace(/^More information about [^:]+:\s*/, ""))
          || clean(anchor.text());
        return {
          url: new URL(anchor.attr("href"), source.listing_url).href,
          title,
          department: clean(row.attr("data-search")?.split("|").at(-1)),
        };
      })
      .get()
      .filter((listing) => listing.title),
  );
}

async function discoverStanford(source, session) {
  // Stanford's public search page currently presents an AWS WAF challenge to
  // non-browser clients. Its robots.txt explicitly publishes this same-host
  // sitemap, so use that for complete URL discovery and let detail-page access
  // determine whether a listing can be safely admitted.
  const sitemapUrl = new URL("/sitemap.xml", source.listing_url).href;
  const { html } = await session.get(sitemapUrl);
  const $ = load(html);
  return uniqueListings(
    $("url")
      .map((_, element) => {
        const href = clean($(element).find("loc").text());
        if (!href || !href.includes("/jobs/") || /\/jobs\/(?:search)?$/.test(href)) return null;
        const slug = new URL(href).pathname.split("/").filter(Boolean).at(-1) || "";
        const title = slug
          .replace(/-(?:stanford-university|va-palo-alto-health-care-system).*$/i, "")
          .split("-")
          .filter(Boolean)
          .map((word) => ["ai", "us", "va"].includes(word) ? word.toUpperCase() : word)
          .join(" ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase());
        return {
          url: href,
          title,
          openedText: clean($(element).find("lastmod").text()),
        };
      })
      .get()
      .filter(Boolean),
  );
}

async function discoverUsc(source, session) {
  const first = await session.get(source.listing_url);
  const firstPage = load(first.html);
  const totalPages = Number(firstPage("#search-results").attr("data-total-pages") || 1);
  const pages = [first.html];
  for (let page = 2; page <= totalPages; page += 1) {
    const pageUrl = new URL(`/category/faculty-jobs/1209/40020/1/${page}`, source.listing_url);
    pages.push((await session.get(pageUrl.href)).html);
  }
  const listings = [];
  for (const html of pages) {
    const $ = load(html);
    $("#search-results a[data-job-id]").each((_, element) => {
      const anchor = $(element);
      const title = clean(anchor.find("h2").text());
      const href = anchor.attr("href");
      if (title && href) listings.push({ url: new URL(href, source.listing_url).href, title });
    });
  }
  return uniqueListings(listings);
}

async function discoverNorthwestern(source, session) {
  const { html } = await session.get(source.listing_url);
  const $ = load(html);
  const listings = [];
  $("li.ps_grid-row").each((_, element) => {
    const row = $(element);
    const title = clean(row.find('span[id^="SCH_JOB_TITLE"]').first().text());
    const sourceId = clean(
      row.find('span[id^="HRS_APP_JBSCH_I_HRS_JOB_OPENING_ID"]').first().text(),
    );
    if (!title || !/^\d+$/.test(sourceId)) return;
    const department = clean(
      row.find('span[id^="HRS_APP_JBSCH_I_HRS_DEPT_DESCR"]').first().text(),
    );
    const location = clean(row.find('span[id^="LOCATION"]').first().text());
    const openedText = clean(row.find('span[id^="SCH_OPENED"]').first().text());
    listings.push({
      title,
      department,
      location,
      openedText,
      sourceId,
      url: `https://careers.northwestern.edu/psc/hrnu_er/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1&JobOpeningId=${sourceId}&PostingSeq=1`,
    });
  });
  return uniqueListings(listings);
}

async function discoverColumbia(source, session) {
  const { html } = await session.get(source.listing_url);
  if (/cf-mitigated|Just a moment/i.test(html)) {
    throw new Error("Columbia returned a Cloudflare browser challenge");
  }
  const $ = load(html);
  return uniqueListings(
    $('a[href*="/jobs/"], a[href*="/positions/"]')
      .map((_, element) => {
        const anchor = $(element);
        const container = anchor.closest("article, li, tr, [class*='job'], [class*='position']");
        const title = clean(container.find("h2, h3, h4").first().text()) || clean(anchor.text());
        return { url: new URL(anchor.attr("href"), source.listing_url).href, title };
      })
      .get()
      .filter((listing) => listing.title),
  );
}

function titleEligible(title) {
  const normalized = title.toLowerCase();
  const included = matching.eligibility.include_title_patterns.some((term) => normalized.includes(term));
  const excluded = matching.eligibility.exclude_title_patterns.some((term) => normalized.includes(term));
  return included && !excluded;
}

function scoreProfile(text, profileName, context) {
  const normalized = text.toLowerCase();
  const normalizedContext = context.toLowerCase();
  const matches = matching.profiles[profileName].filter((concept) =>
    concept.terms.some((term) => normalized.includes(term)),
  );
  const schoolBonus = matching.school_signals.some((term) => normalizedContext.includes(term)) ? 5 : 0;
  const directBonus = matches.some((concept) =>
    concept.terms.some((term) => normalizedContext.includes(term)),
  ) ? 10 : 0;
  return {
    score: matches.length
      ? Math.min(99, 25 + schoolBonus + directBonus + matches.reduce((sum, concept) => sum + concept.weight, 0))
      : 0,
    matches,
  };
}

function parseDate(value) {
  if (!value) return null;
  const cleaned = value.replace(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+/i, "");
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function dateNearLabel(text, labels) {
  const labelPattern = labels.join("|");
  const monthPattern = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  const match = text.match(
    new RegExp(`(?:${labelPattern})[^A-Za-z0-9]{0,35}(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+)?(${monthPattern}\\s+\\d{1,2},?\\s+20\\d{2})`, "i"),
  );
  return parseDate(match?.[1]);
}

function extractOpened(text, listing) {
  return dateNearLabel(text, ["open date", "opening at", "posted date", "posted"])
    || parseDate(listing.openedText)
    || today;
}

function extractDeadline(text) {
  return dateNearLabel(text, [
    "final date",
    "closing at",
    "received no later than",
    "full consideration by",
    "materials should be received by",
    "applications? due",
    "deadline",
  ]);
}

function extractReviewDate(text) {
  return dateNearLabel(text, ["review begins?", "review of applications will begin", "initial review", "next review date"]);
}

function extractStart(text) {
  const explicit = text.match(
    /(?:anticipated start|appointment (?:is )?expected to begin|start(?:ing)?(?: date)?|beginning)[^A-Za-z0-9]{0,45}((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2027)/i,
  );
  if (explicit) return explicit[1].replace(/(\d),\s*/, "$1, ");
  if (/2027\s*(?:[–-]\s*28|[–-]\s*2028) academic year|academic year 2027\s*(?:[–-]\s*28|[–-]\s*2028)/i.test(text)) return "2027–28 academic year";
  if (/(?:fall|autumn)\s+2027/i.test(text)) return "Fall 2027";
  return matching.cycle.default_start_label;
}

function wrongCycle(text) {
  const has2027 = /(?:fall|autumn|july|september)\s+2027|2027\s*(?:[–-]\s*28|[–-]\s*2028) academic year|academic year 2027\s*(?:[–-]\s*28|[–-]\s*2028)/i.test(text);
  return !has2027 && /(?:fall|autumn|july|september)\s+2026|2026[–-]27 academic year/i.test(text);
}

function extractRequirements(text) {
  const checks = [
    ["Curriculum vitae", /curriculum vit(?:a|ae)|\bCV\b/i],
    ["Cover letter", /cover letter|letter of interest/i],
    ["Research statement", /research statement|statement of research/i],
    ["Teaching statement", /teaching statement|statement of teaching/i],
    ["Writing sample or research paper", /writing sample|research paper|job market paper/i],
    ["Reference letters or reference contact information", /letters? of (?:recommendation|reference)|three references|contact information for .* references/i],
    ["Teaching evaluations", /teaching evaluations/i],
    ["Graduate transcript", /transcripts?/i],
    ["Representative publications", /representative publications|representative manuscripts|scholarly publications/i],
  ];
  const requirements = checks.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  return requirements.length ? requirements : ["Review the official posting for application materials"];
}

function extractSourceId(meta, listing, $, html) {
  if (listing.sourceId) return listing.sourceId;
  const url = new URL(listing.url);
  const apId = url.pathname.match(/\b(JPF\d+)\b/i)?.[1];
  if (apId) return apId.toUpperCase();
  if (meta.key === "USC") {
    return $("meta[name='job-ats-req-id']").attr("content")
      || html.match(/"identifier"\s*:\s*"([^"]+)"/)?.[1]
      || url.pathname.split("/").filter(Boolean).at(-1);
  }
  if (meta.key === "Stanford") {
    const numeric = html.match(/facultypositions\.stanford\.edu\/cw\/en-us\/job\/(\d+)/i)?.[1];
    if (numeric) return numeric;
  }
  return createHash("sha256").update(normalizeUrl(listing.url)).digest("hex").slice(0, 12);
}

function relevantSummary(text, concepts) {
  const terms = concepts.flatMap((concept) => concept.terms);
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 420);
  const selected = sentences.filter((sentence) =>
    terms.some((term) => sentence.toLowerCase().includes(term)),
  ).slice(0, 2);
  const summary = clean(selected.join(" ") || sentences[0] || text.slice(0, 360));
  return summary.length > 420 ? `${summary.slice(0, 417)}…` : summary;
}

function deriveAcademicUnit(meta, listing, $, text) {
  let school = meta.school;
  let department = listing.department || "See official posting";
  const listingSchool = listing.department?.match(/(?:^|\/)\s*(school of [^/]+)$/i)?.[1];
  if (listingSchool) {
    school = clean(listingSchool).replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  if (meta.key === "USC") {
    try {
      const structured = JSON.parse($("script[type='application/ld+json']").first().text());
      school = clean(structured?.hiringOrganization?.name) || school;
    } catch {
      // Keep the source default when USC's structured data is absent.
    }
  }
  const departmentMatch = text.match(/Department of ([A-Z][A-Za-z& ,/\-]{3,100})/);
  if (department === "See official posting" && departmentMatch) {
    department = clean(departmentMatch[1].split(/ invites| seeks| at |\./)[0]);
  }
  const schoolMatch = text.match(/(?:Stanford University |USC )?(School of [A-Z][A-Za-z& /\-]{3,60}?)(?=\s+(?:at|invites|seeks|has|is|and the)\b|[.,])/);
  if (school === meta.school && schoolMatch) school = clean(schoolMatch[1]);
  return { school, department };
}

function deriveLocation(meta, listing, $, text) {
  if (listing.location) return listing.location.replace("Illinois", "IL");
  if (meta.key === "Berkeley") return "Berkeley, CA";
  if (meta.key === "UCLA" || meta.key === "USC") return "Los Angeles, CA";
  if (meta.key === "Stanford") return "Stanford, CA";
  if (meta.key === "Columbia") return "New York, NY";
  const structuredLocation = clean($("[itemprop='jobLocation'], .job-location").first().text());
  return structuredLocation || (text.includes("Chicago") ? "Chicago, IL" : "Evanston, IL");
}

function normalizeExistingUrl(rawUrl) {
  try {
    return normalizeUrl(rawUrl);
  } catch {
    return rawUrl;
  }
}

function makeJob(meta, listing, detail) {
  const $ = load(detail.html);
  $("script, style, nav, footer, header").remove();
  const focusedText = clean(
    $(".ats-description, [id*='HRS_SCH_PSTDSC_DESCRLONG'], main, .job-description, article").first().text()
      || $("body").text(),
  );
  const combinedText = clean(`${listing.title}. ${listing.department || ""}. ${focusedText}`);
  const analysisText = combinedText.replace(/(?:equal opportunity|affirmative action employer)[\s\S]*$/i, "");
  const context = clean(`${listing.title}. ${listing.department || ""}.`);
  const jacob = scoreProfile(analysisText, "jacob", context);
  const madison = scoreProfile(analysisText, "madison", context);
  if (Math.max(jacob.score, madison.score) < matching.minimum_fit_score) return null;
  if (wrongCycle(analysisText)) return null;

  const opened = extractOpened(combinedText, listing);
  const explicitTarget = /2027|2027[–-]28/i.test(analysisText);
  if (opened < matching.cycle.earliest_posting_date && !explicitTarget) return null;

  const sourceId = extractSourceId(meta, listing, $, detail.html);
  const unit = deriveAcademicUnit(meta, listing, $, combinedText);
  const matchedConcepts = [...new Map(
    [...jacob.matches, ...madison.matches].map((concept) => [concept.label, concept]),
  ).values()];
  const tags = matchedConcepts.map((concept) => concept.label).slice(0, 4);
  const autoNote = `Automatically discovered from the approved ${meta.key} source on ${today}. Dates and requirements are extracted conservatively; verify the official posting before applying.`;

  return {
    id: `${meta.key.toLowerCase()}-${sourceId}`,
    institution: meta.institution,
    school: unit.school,
    department: unit.department,
    title: listing.title,
    rank: /open[ -]?rank/i.test(listing.title)
      ? "Open rank · accepts assistant-level applicants"
      : /research assistant professor/i.test(listing.title)
        ? "Research Assistant Professor"
        : "Assistant Professor or assistant-eligible search",
    location: deriveLocation(meta, listing, $, combinedText),
    source: meta.key,
    sourceUrl: normalizeUrl(detail.url),
    opened,
    start: extractStart(analysisText),
    deadline: extractDeadline(analysisText),
    ...(extractReviewDate(analysisText) ? { reviewDate: extractReviewDate(analysisText) } : {}),
    summary: relevantSummary(analysisText, matchedConcepts),
    tags: tags.length ? tags : ["Broad interdisciplinary fit"],
    fit: { jacob: jacob.score, madison: madison.score },
    fitReason: {
      jacob: jacob.matches.length
        ? `Automated match on ${jacob.matches.map((concept) => concept.label.toLowerCase()).join(", ")}.`
        : "Secondary fit through the department or interdisciplinary scope; review before applying.",
      madison: madison.matches.length
        ? `Automated match on ${madison.matches.map((concept) => concept.label.toLowerCase()).join(", ")}.`
        : "Secondary fit through the department or interdisciplinary scope; review before applying.",
    },
    requirements: extractRequirements(combinedText),
    note: autoNote,
  };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function rssDocument(jobs) {
  const items = jobs.map((job) => {
    const publicationDate = new Date(`${job.opened}T12:00:00Z`);
    const fitLabel = job.fit.jacob >= 75 && job.fit.madison >= 75
      ? "Strong fit for Jacob and Madison."
      : job.fit.jacob >= job.fit.madison
        ? "Strongest fit: Jacob."
        : "Strongest fit: Madison.";
    return `    <item>
      <title>${xmlEscape(`${job.institution} — ${job.title}`)}</title>
      <link>${xmlEscape(job.sourceUrl)}</link>
      <guid isPermaLink="false">${xmlEscape(job.id)}</guid>
      <pubDate>${publicationDate.toUTCString()}</pubDate>
      <description>${xmlEscape(`${job.summary} ${fitLabel}`)}</description>
    </item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Jacob + Madison Faculty Job Matches</title>
    <link>https://jacobjameson.com/faculty-job-tracker/</link>
    <description>Broad assistant-professor and assistant-eligible open-rank matches for the Fall 2027 cycle from six approved university sources. Unstated start dates are flagged for verification.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(refreshedAt).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

const existingById = new Map(catalog.map((job) => [job.id, job]));
const existingByUrl = new Map(catalog.map((job) => [normalizeExistingUrl(job.sourceUrl), job]));
const addedJobs = [];
const sourceReports = [];

for (const source of sourceConfig.approved_sources) {
  const meta = SOURCE_META[source.allowed_hostname];
  const session = new SourceSession();
  const sourceReport = {
    source: meta.key,
    listing_url: source.listing_url,
    status: "ok",
    discovered: 0,
    eligible_titles: 0,
    evaluated: 0,
    matched: 0,
    added: 0,
  };
  try {
    const adapter = {
      "ap-recruit": discoverApRecruit,
      stanford: discoverStanford,
      usc: discoverUsc,
      northwestern: discoverNorthwestern,
      columbia: discoverColumbia,
    }[meta.adapter];
    const listings = await adapter(source, session);
    sourceReport.discovered = listings.length;
    const eligibleListings = listings.filter((listing) => titleEligible(listing.title));
    sourceReport.eligible_titles = eligibleListings.length;

    const detailConcurrency = meta.key === "Northwestern" ? 1 : 6;
    const evaluated = await mapLimit(eligibleListings, detailConcurrency, async (listing) => {
      const normalizedListingUrl = normalizeUrl(listing.url);
      const existing = existingByUrl.get(normalizedListingUrl)
        || (listing.sourceId ? existingById.get(`${meta.key.toLowerCase()}-${listing.sourceId}`) : null);
      sourceReport.evaluated += 1;
      if (existing) {
        sourceReport.matched += 1;
        return null;
      }
      try {
        const detail = await session.get(listing.url);
        const job = makeJob(meta, listing, detail);
        if (job) sourceReport.matched += 1;
        return job;
      } catch {
        sourceReport.detail_errors = (sourceReport.detail_errors || 0) + 1;
        return null;
      }
    });

    for (const job of evaluated.filter(Boolean)) {
      if (existingById.has(job.id) || existingByUrl.has(normalizeExistingUrl(job.sourceUrl))) continue;
      existingById.set(job.id, job);
      existingByUrl.set(normalizeExistingUrl(job.sourceUrl), job);
      catalog.push(job);
      addedJobs.push(job);
      sourceReport.added += 1;
    }
  } catch (error) {
    sourceReport.status = "error";
    sourceReport.error = error instanceof Error ? error.message : String(error);
  }
  if (sourceReport.status === "ok" && sourceReport.detail_errors) {
    sourceReport.status = "partial";
    sourceReport.warning = `${sourceReport.detail_errors} eligible detail page(s) could not be read`;
  }
  sourceReports.push(sourceReport);
}

const successfulSources = sourceReports.filter((source) => source.status !== "error").length;
if (successfulSources === 0) throw new Error("Every approved source failed; catalog was not changed");

const historicalIds = new Set(history.job_ids);
for (const job of catalog) historicalIds.add(job.id);
history.job_ids = [...historicalIds];

const report = {
  refreshed_at: refreshedAt,
  mode: writeChanges ? "write" : "dry-run",
  policy: "append-only",
  approved_sources: sourceReports.length,
  successful_sources: successfulSources,
  source_errors: sourceReports.filter((source) => source.status === "error").length,
  source_warnings: sourceReports.filter((source) => source.status === "partial").length,
  existing_jobs_before: catalog.length - addedJobs.length,
  jobs_added: addedJobs.length,
  total_jobs_after: catalog.length,
  added_job_ids: addedJobs.map((job) => job.id),
  added_jobs: addedJobs.map((job) => ({
    id: job.id,
    title: job.title,
    source: job.source,
    fit: job.fit,
    start: job.start,
    url: job.sourceUrl,
  })),
  sources: sourceReports,
};

if (writeChanges) {
  await Promise.all([
    writeFile(catalogUrl, `${JSON.stringify(catalog, null, 2)}\n`),
    writeFile(historyUrl, `${JSON.stringify(history, null, 2)}\n`),
    writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(rssUrl, rssDocument(catalog)),
  ]);
}

console.log(JSON.stringify(report, null, 2));
