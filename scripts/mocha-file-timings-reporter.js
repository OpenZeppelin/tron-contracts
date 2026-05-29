//
// scripts/mocha-file-timings-reporter.js
//
// Custom mocha reporter that:
//   1. Delegates to the standard Spec reporter so the user sees identical
//      live output to before — no behaviour change in either the serial
//      `npm test` flow or the per-worker stream in `npm run test:parallel`.
//   2. Records the cumulative wall-clock duration of every test, grouped
//      by the source FILE the test was defined in. Writes the result as
//      a JSON map of `{ "<relative path>": <ms> }` to the path given by
//      the `MOCHA_TIMINGS_OUT` env var.
//
// Used by scripts/bucket-files.js to weight files by real elapsed time
// instead of `it()` count — fixing the unfair-bucketing problem where a
// 153-case unit-test file would end up in the same bucket as a 50-case
// Governor file with 7-contract fixtures (per-test cost differs by ~10x).
//
// The reporter is OFF unless MOCHA_TIMINGS_OUT is set, so it has no
// impact on environments where bucket reweighting isn't wanted.
//
// Flush strategy: incremental + signal-safe.
//
//   Earlier versions only wrote on `runner.on('end')`. Any worker that
//   crashed, hit an OOM, or was killed by the parallel-runner's `trap
//   cleanup` (SIGTERM) dropped ALL its per-file timings on the floor.
//   The canonical `.parallel-cache/file-timings.json` reflected this:
//   only 4 of 131 files had real timings, the other 127 fell back to
//   `count × 300ms` estimates — wildly wrong for fixture-heavy Governor
//   files vs unit-test loops, producing imbalanced parallel buckets
//   where the slowest worker defined wall-clock time.
//
//   New strategy: write on every `test end` / `hook end` (debounced
//   ~1 s so we don't dominate runtime with JSON serialization), AND on
//   SIGINT/SIGTERM/exit. Writes go through a tmp+rename atomic so a
//   half-written file can't be read mid-update by the next run.
//

const fs = require('node:fs');
const path = require('node:path');
const { reporters } = require('mocha');

class FileTimingsReporter extends reporters.Spec {
  constructor(runner, options) {
    super(runner, options);

    const out = process.env.MOCHA_TIMINGS_OUT;
    if (!out) return;

    // Cumulative ms per file. test.duration is mocha-measured wall
    // time for the test body (excludes hook time). Hook time attaches
    // to the parent suite's source file so heavy `before` blocks count
    // toward the file's weight, since they're real cost on next run.
    const timings = {};
    let dirty = false;
    let flushTimer = null;
    let flushedOnce = false;

    const writeNow = () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (!dirty) return;
      try {
        fs.mkdirSync(path.dirname(out), { recursive: true });
        // Atomic write: tmp + rename. merge-file-timings.js (the
        // consumer) reads this file; a half-written body would
        // throw JSON.parse and orphan the worker's data.
        const tmp = out + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(timings, null, 2));
        fs.renameSync(tmp, out);
        dirty = false;
        flushedOnce = true;
      } catch (e) {
        process.stderr.write(`[file-timings-reporter] write failed: ${e.message}\n`);
      }
    };

    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(writeNow, 1000);
      // Don't keep the event loop alive just for the flush timer —
      // 'exit' handler below will still run a final synchronous
      // flush, so a pending timer here isn't load-bearing.
      if (typeof flushTimer.unref === 'function') flushTimer.unref();
    };

    const bumpFile = (file, ms) => {
      if (!file || !Number.isFinite(ms) || ms < 0) return;
      const rel = path.relative(process.cwd(), file);
      timings[rel] = (timings[rel] || 0) + ms;
      dirty = true;
      scheduleFlush();
    };

    runner.on('test end', test => bumpFile(test.file, test.duration || 0));
    // Hook durations attach to the hook's parent suite; mocha stores
    // the source file on the suite itself.
    runner.on('hook end', hook => bumpFile(hook.file || (hook.parent && hook.parent.file), hook.duration || 0));
    runner.on('end', writeNow);

    // Catch interrupted/crashed runs so timings survive.
    //
    //   SIGINT  — Ctrl-C in serial runs.
    //   SIGTERM — what scripts/run-tests-parallel.sh's `trap cleanup`
    //             sends on script exit, and what `docker stop` /
    //             timeout-induced kills produce.
    //   exit    — last-resort hook for orderly exits (process.exit,
    //             event-loop drain). Does NOT fire on uncaught signals
    //             without an explicit re-raise; that's why we have
    //             signal handlers above.
    //
    // After the synchronous flush in a signal handler we re-raise
    // by calling process.exit with the conventional 128+signal code,
    // matching what Node would have done without a handler. Mocha
    // doesn't register its own SIGINT/SIGTERM handlers in the test
    // CLI path, so we don't need to coordinate with anything else.
    const onSignal = (signal, code) => () => {
      writeNow();
      // Avoid double-exit if multiple signals fire.
      try {
        process.exit(code);
      } catch {
        /* */
      }
    };
    process.once('SIGINT', onSignal('SIGINT', 130));
    process.once('SIGTERM', onSignal('SIGTERM', 143));
    process.on('exit', () => {
      // Only flush if we somehow missed prior writes — `writeNow`
      // is no-op when !dirty.
      if (!flushedOnce || dirty) writeNow();
    });
  }
}

module.exports = FileTimingsReporter;
