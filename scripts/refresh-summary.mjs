import { readFile } from "node:fs/promises";

const report = JSON.parse(await readFile(new URL("../data/refresh-report.json", import.meta.url), "utf8"));

console.log("## Faculty job refresh");
console.log("");
console.log(`Checked ${report.successful_sources}/${report.approved_sources} approved sources. Added ${report.jobs_added} job(s); catalog now contains ${report.total_jobs_after}.`);
console.log("");
console.log("| Source | Status | Discovered | Matches | Added |");
console.log("|---|---:|---:|---:|---:|");
for (const source of report.sources) {
  console.log(`| ${source.source} | ${source.status} | ${source.discovered} | ${source.matched} | ${source.added} |`);
}

const notices = report.sources.filter((source) => source.error || source.warning);
if (notices.length) {
  console.log("");
  console.log("### Source notices");
  for (const source of notices) {
    console.log(`- **${source.source}:** ${source.error || source.warning}`);
  }
}

if (report.added_jobs.length) {
  console.log("");
  console.log("### New matches");
  for (const job of report.added_jobs) {
    console.log(`- [${job.source} — ${job.title}](${job.url}) (Jacob ${job.fit.jacob}, Madison ${job.fit.madison}; ${job.start})`);
  }
}
