#!/usr/bin/env node
//
// One-shot rename helper for the ERC20 → TRC20 port. Walks the
// passed paths, rewrites identifiers + standard-name comments,
// preserves files whose ERC* identifier does NOT refer to
// ERC20/ERC4626 (ERC1363, ERC2612, ERC6093, ERC7674, etc. are left
// alone by the `(?![0-9])` lookahead — those numbers don't start
// with `20`/`4626`).
//
// Usage:
//   node scripts/rename-trc20.js <path> [<path>...]

const fs = require('node:fs');
const path = require('node:path');

// Identifiers explicitly preserved despite matching the generic rules
// (per the rename's product decisions). Stashed behind a placeholder
// so the generic ERC20 → TRC20 sweep doesn't clobber them, then
// restored after.
const PRESERVE = ['BridgeERC20'];

const REPLACEMENTS = [
  [/ERC4626(?![0-9])/g, 'TRC4626'],
  [/ERC-4626(?![0-9])/g, 'TRC-4626'],
  [/ERC20(?![0-9])/g, 'TRC20'],
  [/ERC-20(?![0-9])/g, 'TRC-20'],
];

function rewrite(filePath) {
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before;
  PRESERVE.forEach((name, i) => {
    after = after.split(name).join('__PRESERVE_TRC_' + i + '__');
  });
  for (const [re, rep] of REPLACEMENTS) after = after.replace(re, rep);
  PRESERVE.forEach((name, i) => {
    after = after.split('__PRESERVE_TRC_' + i + '__').join(name);
  });
  if (after !== before) {
    fs.writeFileSync(filePath, after);
    return true;
  }
  return false;
}

function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) walk(path.join(p, e));
    return;
  }
  if (!st.isFile()) return;
  if (!/\.(sol|js|ts|cjs|mjs|json|adoc|md)$/.test(p)) return;
  if (rewrite(p)) console.log('rewrote', p);
}

for (const arg of process.argv.slice(2)) walk(arg);
