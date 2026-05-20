#!/usr/bin/env node
//
// scripts/merge-file-timings.js
//
// Called by run-tests-parallel.sh after all workers finish. Reads each
// worker's per-file timings JSON (.parallel-cache/file-timings-w<N>.json)
// written by scripts/mocha-file-timings-reporter.js, and merges them
// into the canonical .parallel-cache/file-timings.json that
// scripts/bucket-files.js consumes on the next run.
//
// Merge strategy: each file lives in exactly one bucket per run, so the
// merge is a simple object-spread. If two workers somehow report the
// same file (manual override of bucket assignment, retry, etc.), take
// the larger value — the longer run is the more conservative estimate
// for bucket-weighting purposes.
//
// We DO NOT preserve old timings for files no longer in the test tree;
// stale entries are dropped. Old timings for files that ARE in the tree
// but didn't run this iteration (e.g. user passed a subset to the parallel
// script) ARE preserved — they're still the best estimate we have.
//
// Usage: node scripts/merge-file-timings.js <num-workers>
//

const fs = require('node:fs');
const path = require('node:path');

const WORKERS = parseInt(process.argv[2], 10) || 0;
if (WORKERS <= 0) {
  process.stderr.write('merge-file-timings: workers count required\n');
  process.exit(0); // non-fatal — bucketing falls back to test counts
}

const CACHE_DIR = path.resolve(__dirname, '..', '.parallel-cache');
const CANONICAL = path.join(CACHE_DIR, 'file-timings.json');

// Load existing canonical so we preserve timings for files not exercised
// by the current run (e.g. user ran `npm run test:parallel test/utils/`).
let merged = {};
try {
  merged = JSON.parse(fs.readFileSync(CANONICAL, 'utf8')) || {};
} catch {
  /* first run — no canonical yet */
}

let workersWithData = 0;
let entriesIngested = 0;
for (let i = 0; i < WORKERS; i++) {
  const p = path.join(CACHE_DIR, `file-timings-w${i}.json`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    // Worker crashed before writing, or reporter not invoked — skip.
    continue;
  }
  workersWithData++;
  for (const [file, ms] of Object.entries(data)) {
    if (!Number.isFinite(ms) || ms < 0) continue;
    // Keep the LARGER value if both workers reported the same file
    // (unlikely under LPT bucketing, but defensive against manual
    // bucket overrides or test-list overlap).
    const prev = merged[file];
    if (prev == null || ms > prev) merged[file] = Math.round(ms);
    entriesIngested++;
  }
  // Clean up per-worker file after successful merge.
  fs.unlinkSync(p);
}

fs.writeFileSync(CANONICAL, JSON.stringify(merged, null, 2));
process.stderr.write(
  `merge-file-timings: ${workersWithData}/${WORKERS} workers had data, ` +
    `${entriesIngested} entries ingested, canonical now ${Object.keys(merged).length} files.\n`,
);
