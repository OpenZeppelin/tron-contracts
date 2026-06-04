#!/usr/bin/env node
//
// One-shot rename helper for the ERC721 → TRC721 port.
//
// Matches `ERC721` (and its `IERC721…` companions) using a `(?![0-9])`
// lookahead so EIP numbers starting with the same digits (none in
// practice) are safe. Skips the `ERC1363`/`ERC2309`/`ERC2981`/`ERC4906`
// family of EIP-numbered identifiers because no TIP equivalent exists
// for them — they stay as ERC. `BridgeERC20` is also preserved (lives
// on the TRC20 PR; same product-decision pattern).
//
// Usage:
//   node scripts/rename-trc721.js <path> [<path>...]

const fs = require('node:fs');
const path = require('node:path');

const PRESERVE = ['BridgeERC20'];

const REPLACEMENTS = [
  // `ERC-721` first (would otherwise be matched after the hyphenless
  // rule). Order matters only because both rules write distinct
  // outputs.
  [/ERC721(?![0-9])/g, 'TRC721'],
  [/ERC-721(?![0-9])/g, 'TRC-721'],
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
