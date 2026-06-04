#!/usr/bin/env node
//
// One-shot rename helper for the ERC1155 → TRC1155 port.
//
// CRITICAL preserves (per TIP-1155 spec):
//   * `onERC1155Received` — function name kept, selector 0xf23a6e61 stays
//   * `onERC1155BatchReceived` — function name kept, selector 0xbc197c81 stays
// Unlike TIP-721 (which renamed `onERC721Received` → `onTRC721Received`),
// TIP-1155 explicitly keeps the existing receiver function names.
//
// Also preserves `BridgeERC20` (TRC20 PR territory; same product decision).
//
// Usage:
//   node scripts/rename-trc1155.js <path> [<path>...]

const fs = require('node:fs');
const path = require('node:path');

const PRESERVE = ['onERC1155Received', 'onERC1155BatchReceived', 'BridgeERC20'];

const REPLACEMENTS = [
  [/ERC1155(?![0-9])/g, 'TRC1155'],
  [/ERC-1155(?![0-9])/g, 'TRC-1155'],
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
