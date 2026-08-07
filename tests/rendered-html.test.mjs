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
  assert.match(html, /12<!-- --> curated openings|12<\/strong><span>curated openings/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("publishes a valid RSS feed for the curated matches", async () => {
  const rss = await readFile(new URL("../public/jobs.xml", import.meta.url), "utf8");
  assert.match(rss, /<rss version="2\.0">/);
  assert.equal((rss.match(/<item>/g) ?? []).length, 12);
  assert.doesNotMatch(rss, /JPF05397/);
});

test("restricts collection to the two approved sources", async () => {
  const sourceText = await readFile(
    new URL("../config/sources.json", import.meta.url),
    "utf8",
  );
  const sourceConfig = JSON.parse(sourceText);

  assert.deepEqual(
    sourceConfig.approved_sources.map((source) => source.allowed_hostname).sort(),
    ["aprecruit.berkeley.edu", "facultypositions.stanford.edu"],
  );

  const dashboard = await readFile(
    new URL("../app/JobDashboard.tsx", import.meta.url),
    "utf8",
  );
  const postingUrls = dashboard.match(/https:\/\/[^"\s]+/g) ?? [];
  const postingHosts = new Set(
    postingUrls
      .filter((url) => url.includes("/JPF") || url.includes("/jobs/"))
      .map((url) => new URL(url).hostname),
  );

  assert.deepEqual(
    [...postingHosts].sort(),
    ["aprecruit.berkeley.edu", "facultypositions.stanford.edu"],
  );
});
