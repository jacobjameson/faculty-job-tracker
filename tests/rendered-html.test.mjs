import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(html, /18<!-- --> curated openings|18<\/strong><span>curated openings/);
  assert.match(html, /Faculty Positions in Industrial Engineering/);
  assert.match(html, /Health Policy \(Health Economist\)/);
  assert.match(html, /Education in a Rapidly Changing World/);
  assert.match(html, /Research Assistant Professor of Health Policy/);
  assert.match(html, /Health Behavior Data Analytics/);
  assert.match(html, /Not interested/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("publishes a valid RSS feed for the curated matches", async () => {
  const rss = await readFile(new URL("../public/jobs.xml", import.meta.url), "utf8");
  assert.match(rss, /<rss version="2\.0">/);
  assert.equal((rss.match(/<item>/g) ?? []).length, 18);
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

  const dashboard = await readFile(
    new URL("../app/JobDashboard.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(
    (dashboard.match(/^    id:/gm) ?? []).length,
    (dashboard.match(/^    start:/gm) ?? []).length,
    "every curated job must include a Fall 2027 start or a clearly labeled expectation",
  );
  const postingUrls = [...dashboard.matchAll(/sourceUrl:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );
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
  const dashboard = await readFile(
    new URL("../app/JobDashboard.tsx", import.meta.url),
    "utf8",
  );
  const historyText = await readFile(
    new URL("../config/catalog-history.json", import.meta.url),
    "utf8",
  );
  const history = JSON.parse(historyText);
  const currentIds = [...dashboard.matchAll(/^    id: "([^"]+)",$/gm)].map(
    (match) => match[1],
  );

  assert.equal(new Set(currentIds).size, currentIds.length, "catalog IDs must be unique");
  assert.deepEqual(
    history.job_ids.filter((jobId) => !currentIds.includes(jobId)),
    [],
    "a refresh must not silently remove a previously admitted job",
  );
});
