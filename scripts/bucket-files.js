#!/usr/bin/env node
//
// scripts/bucket-files.js
//
// Splits test files across N worker buckets so each bucket has roughly the
// same total WEIGHT. A single file is NEVER split across workers — test
// ordering inside a file matters (loadFixture, shared describe state, etc.).
//
// Weight model — prefer real elapsed time, fall back to it() count:
//
//   1. Read .parallel-cache/file-timings.json (written by
//      scripts/mocha-file-timings-reporter.js → merged by
//      scripts/merge-file-timings.js after each parallel run).
//   2. For each test file:
//        - If there's a recorded elapsed time, use it as the weight.
//        - Else, fall back to (it()-count × FALLBACK_MS_PER_TEST).
//      This lets first runs (no cache) still produce sensible buckets.
//
//   The hybrid weight is in MILLISECONDS so the two sources are
//   comparable. Without this, a unit-test file with 153 fast tests would
//   end up in the same bucket as a 50-test Governor file with 7-contract
//   fixtures — wall time differs by ~10x. The LPT algorithm only
//   minimizes makespan if the weights actually reflect cost.
//
// Algorithm — LPT (Longest Processing Time first):
//   1. sort files by weight, descending
//   2. for each file, assign to the bucket with the lowest running total
// This is the standard greedy approximation for makespan-minimizing bin
// packing; in practice it gets within ~5% of optimal and runs in O(N log W).
//
// Usage:
//   node scripts/bucket-files.js <workers>
//
//   Reads `test/**/*.test.js` counts from scripts/test-counts.js,
//   merges with file-timings cache, then prints buckets as TSV to
//   stdout — one line per bucket, files separated by spaces.
//
//   Columns: bucket_index, total_weight_ms, space-separated file list.
//   Trailing newline included. (Column 2 is now MS, not test count, but
//   the consumer in run-tests-parallel.sh only displays it — no parsing.)
//

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.parallel-cache');
const TIMINGS_FILE = path.join(CACHE_DIR, 'file-timings.json');

// Calibrated from typical TRE test behaviour: a "median" test takes
// ~250-400 ms wall time (deploy-heavy fixtures pull the mean up). Using
// 300 ms as the count→ms fallback so the first run (no timing cache)
// produces a bucket spread that's at least in the right ballpark. After
// the first run completes the canonical file-timings.json takes over
// and this constant stops mattering.
const FALLBACK_MS_PER_TEST = 300;

const WORKERS = Math.max(1, parseInt(process.argv[2], 10) || 1);

// 1. Counts: how many it() per file. Always available (cheap to compute
//    from source) — used as fallback for files we've never timed.
const counts = JSON.parse(
  spawnSync(process.execPath, [path.join(__dirname, 'test-counts.js')], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).stdout,
);

// 2. Timings: real wall-clock ms per file from prior runs, if any.
let timings = {};
try {
  timings = JSON.parse(fs.readFileSync(TIMINGS_FILE, 'utf8')) || {};
} catch {
  /* no cache yet — first run will populate it */
}

// 3. Build the weight map. Source preference: real timing → count × ms.
//    Files with 0 tests AND 0 timing get weight=1 so they still go to a
//    bucket (don't get dropped) but don't skew the spread.
const weights = {};
let timedCount = 0;
let countedCount = 0;
for (const [file, n] of Object.entries(counts)) {
  const realMs = timings[file];
  if (realMs != null && realMs > 0) {
    weights[file] = realMs;
    timedCount++;
  } else if (n > 0) {
    weights[file] = n * FALLBACK_MS_PER_TEST;
    countedCount++;
  } else {
    weights[file] = 1;
  }
}

// 4. LPT — sort files by weight descending; assign each to the lightest bucket.
const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);
const buckets = Array.from({ length: WORKERS }, () => ({ files: [], total: 0 }));
for (const [file, w] of entries) {
  let lightest = 0;
  for (let i = 1; i < WORKERS; i++) {
    if (buckets[i].total < buckets[lightest].total) lightest = i;
  }
  buckets[lightest].files.push(file);
  buckets[lightest].total += w;
}

// 5. Sort each bucket's files by name for reproducibility — the assignment
//    order is determined by LPT but within a bucket file order is purely
//    cosmetic (mocha sorts them itself when given a file list).
for (const b of buckets) b.files.sort();

for (let i = 0; i < WORKERS; i++) {
  process.stdout.write(`${i}\t${buckets[i].total}\t${buckets[i].files.join(' ')}\n`);
}

// Stderr diagnostic: shows whether bucketing is informed by real data.
// "<X timed, <Y> counted, <Z> empty" + "spread: a, b, c (max/min ratio)".
const spread = buckets.map(b => b.total);
const maxW = Math.max(...spread);
const minW = Math.min(...spread.filter(w => w > 0)) || 1;
const ratio = (maxW / minW).toFixed(2);
const empty = entries.length - timedCount - countedCount;
process.stderr.write(
  `bucket spread (ms): ${spread.join(', ')} ` +
    `[max/min=${ratio}, ` +
    `${timedCount} timed, ${countedCount} count-fallback, ${empty} empty]\n`,
);
