#!/usr/bin/env node
//
// scripts/test-counts.js
//
// Counts the `it(...)`-style test cases in every file under `test/`. Used by
// the parallel orchestrator to bin-pack files into roughly-equal buckets.
//
// Caching: results are written to `.parallel-cache/test-counts.json`. A file
// is re-scanned only when its mtime is newer than the cache. So:
//   - first run scans everything (~3-5 s for ~130 files)
//   - subsequent runs are sub-second unless source changed
//
// Why a custom counter instead of running mocha --dry-run:
//   - mocha --dry-run requires loading the hardhat runtime (slow, hits TRE),
//     and we want to count BEFORE any container starts
//   - regex-based counting is good enough — `it(` / `it.only(` / `it.skip(`
//     in the test body (we also strip line comments + block comments to avoid
//     false positives from documentation)
//
// Output (JSON):
//   {
//     "test/access/AccessControl.test.js": 12,
//     "test/access/manager/AccessManager.test.js": 706,
//     ...
//   }
//

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'test');
const CACHE_DIR = path.join(ROOT, '.parallel-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'test-counts.json');

function walkTestFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTestFiles(full, out);
    } else if (entry.isFile() && /\.test\.js$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Strip line + block comments to avoid counting `// it('foo'...)` etc.
// Also strip string literals so a string containing `it(` doesn't count.
function stripCommentsAndStrings(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    // // line comment
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    // /* block */
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // string literals — '..', ".." with escapes; backtick template strings
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        // template string interpolation — leave the ${ ... } substring
        // alone for regex purposes (rare in test bodies but be safe)
        if (quote === '`' && src[i] === '$' && src[i + 1] === '{') {
          // walk past ${...} keeping the inside
          out += '`';
          i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) out += src[i];
            i++;
          }
          out += '`';
          continue;
        }
        i++;
      }
      // intentionally don't emit string contents — but emit a sentinel so
      // identifiers don't run together (e.g. it'foo'it -> it it)
      out += '"_"';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Matches it(...), it.skip(...), it.only(...), with optional whitespace.
// Does NOT match `xit(`, `pit(`, `describe(`, etc. The `\b` boundary keeps
// us from matching helper methods that happen to end in `...it(`.
const TEST_RX = /\bit(?:\.(?:skip|only))?\s*\(/g;

function countTests(filepath) {
  const src = fs.readFileSync(filepath, 'utf8');
  const clean = stripCommentsAndStrings(src);
  let n = 0;
  while (TEST_RX.exec(clean) !== null) n++;
  return n;
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function main() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cache = readCache();
  const files = walkTestFiles(TEST_DIR);
  const counts = {};
  let rescanned = 0;
  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    const mtime = fs.statSync(abs).mtimeMs;
    const cached = cache[rel];
    if (cached && cached.mtimeMs === mtime) {
      counts[rel] = cached.count;
    } else {
      counts[rel] = countTests(abs);
      rescanned++;
    }
    cache[rel] = { mtimeMs: mtime, count: counts[rel] };
  }
  // Drop entries for files that no longer exist
  const keep = new Set(Object.keys(counts));
  for (const k of Object.keys(cache)) if (!keep.has(k)) delete cache[k];

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  process.stderr.write(
    `test-counts: ${files.length} files scanned (${rescanned} re-parsed, ${files.length - rescanned} from cache)\n`,
  );
  process.stdout.write(JSON.stringify(counts));
}

main();
