import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readCatalog() {
  return JSON.parse(await readFile(new URL("../data/jobs.json", import.meta.url), "utf8"));
}

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the faculty search dashboard", async () => {
  const catalog = await readCatalog();
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Joint Faculty Search<\/title>/i);
  assert.match(html, /Faculty opportunities/);
  assert.doesNotMatch(html, /One search\. Two research agendas\./);
  assert.match(html, /Jacob&#x27;s sheet/);
  assert.match(html, /Madison&#x27;s sheet/);
  assert.match(html, /Berkeley/);
  assert.match(html, /Stanford/);
  assert.match(html, /Matching criteria/i);
  assert.match(html, new RegExp(`${catalog.length}(?:<!-- -->)? curated openings|${catalog.length}<\\/strong><span>curated openings`));
  assert.match(html, /Faculty Positions in Industrial Engineering/);
  assert.match(html, /Health Policy \(Health Economist\)/);
  assert.match(html, /Education in a Rapidly Changing World/);
  assert.match(html, /Research Assistant Professor of Health Policy/);
  assert.match(html, /Health Behavior Data Analytics/);
  assert.match(html, /Not interested/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("publishes a valid RSS feed for the curated matches", async () => {
  const catalog = await readCatalog();
  const rss = await readFile(new URL("../public/jobs.xml", import.meta.url), "utf8");
  assert.match(rss, /<rss version="2\.0">/);
  assert.equal((rss.match(/<item>/g) ?? []).length, catalog.length);
  assert.doesNotMatch(rss, /JPF05397/);
});

test("restricts collection to the approved university sources", async () => {
  const sourceText = await readFile(
    new URL("../config/sources.json", import.meta.url),
    "utf8",
  );
  const sourceConfig = JSON.parse(sourceText);

  assert.deepEqual(
    sourceConfig.approved_sources.map((source) => source.allowed_hostname).sort(),
    [
      "academic.careers.columbia.edu",
      "aprecruit.berkeley.edu",
      "careers.northwestern.edu",
      "facultypositions.stanford.edu",
      "recruit.apo.ucla.edu",
      "usccareers.usc.edu",
    ],
  );

  const catalog = await readCatalog();
  assert.ok(catalog.every((job) => job.id && job.start));
  const postingUrls = catalog.map((job) => job.sourceUrl);
  const postingHosts = new Set(
    postingUrls.map((url) => new URL(url).hostname),
  );

  assert.deepEqual(
    [...postingHosts].sort(),
    [
      "aprecruit.berkeley.edu",
      "careers.northwestern.edu",
      "facultypositions.stanford.edu",
      "recruit.apo.ucla.edu",
      "usccareers.usc.edu",
    ],
  );
  assert.ok([...postingHosts].every((host) => sourceConfig.approved_sources.some(
    (source) => source.allowed_hostname === host,
  )));
});

test("keeps the job catalog append-only across refreshes", async () => {
  const catalog = await readCatalog();
  const historyText = await readFile(
    new URL("../config/catalog-history.json", import.meta.url),
    "utf8",
  );
  const history = JSON.parse(historyText);
  const currentIds = catalog.map((job) => job.id);

  assert.equal(new Set(currentIds).size, currentIds.length, "catalog IDs must be unique");
  assert.deepEqual(
    history.job_ids.filter((jobId) => !currentIds.includes(jobId)),
    [],
    "a refresh must not silently remove a previously admitted job",
  );
});

test("refresh automation uses stable IDs and the strict source allowlist", async () => {
  const catalog = await readCatalog();
  const sourceConfig = JSON.parse(await readFile(
    new URL("../config/sources.json", import.meta.url),
    "utf8",
  ));
  const refreshScript = await readFile(
    new URL("../scripts/refresh-jobs.mjs", import.meta.url),
    "utf8",
  );
  const approvedHosts = new Set(
    sourceConfig.approved_sources.map((source) => source.allowed_hostname),
  );

  assert.ok(catalog.every((job) => approvedHosts.has(new URL(job.sourceUrl).hostname)));
  assert.ok(catalog.every((job) => /^https:\/\//.test(job.sourceUrl)));
  assert.match(refreshScript, /assertAllowed/);
  assert.match(refreshScript, /policy: "append-only"/);
});
