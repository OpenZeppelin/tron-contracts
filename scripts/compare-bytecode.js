#!/usr/bin/env node
//
// scripts/compare-bytecode.js
//
// Drift detector for the LZ -> in-house compile migration. Walks an
// artifacts tree, records sha256(bytecode) for every contract, and
// either writes the snapshot to disk (--snapshot <path>) or diffs the
// current tree against a prior snapshot (--compare <path>).
//
// Used at three points in the Phase 1 migration:
//   * Step 1.1  -- capture LZ-pipeline baseline with --snapshot
//   * Step 1.12 -- compare single-Counter compile against the baseline
//   * Step 1.13 -- compare full batched compile against the baseline
//
// We hash `bytecode` (the creation bytecode). `deployedBytecode` would
// be a stronger check but it's identical when `bytecode` matches for
// our use case. Metadata-section drift (last 53 bytes of deployed
// bytecode = ipfs hash + solc version) is excluded by hashing the raw
// `bytecode` field as Hardhat emits it -- IR-pipeline solc embeds the
// metadata at the same offset across runs, so the hash is stable.
//

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function listJsonContracts(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'build-info') continue;
        stack.push(p);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.dbg.json')) {
        out.push(p);
      }
    }
  }
  return out;
}

function snapshot(dir) {
  const result = {};
  for (const f of listJsonContracts(dir)) {
    let j;
    try {
      j = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      continue;
    }
    if (!j || typeof j.bytecode !== 'string' || !j.bytecode.startsWith('0x')) continue;
    const rel = path.relative(dir, f);
    result[rel] = crypto.createHash('sha256').update(j.bytecode).digest('hex');
  }
  return result;
}

function compare(prev, cur) {
  const prevKeys = new Set(Object.keys(prev));
  const curKeys = new Set(Object.keys(cur));
  const added = [...curKeys].filter(k => !prevKeys.has(k));
  const removed = [...prevKeys].filter(k => !curKeys.has(k));
  const changed = [...prevKeys].filter(k => curKeys.has(k) && prev[k] !== cur[k]);
  const unchanged = [...prevKeys].filter(k => curKeys.has(k) && prev[k] === cur[k]);
  return { added, removed, changed, unchanged };
}

function main() {
  const args = process.argv.slice(2);
  const dir = args[args.indexOf('--dir') + 1] || 'artifacts-tron';
  const snapPath = args[args.indexOf('--snapshot') + 1];
  const cmpPath = args[args.indexOf('--compare') + 1];

  if (args.includes('--snapshot') && snapPath) {
    const s = snapshot(dir);
    fs.writeFileSync(snapPath, JSON.stringify(s, null, 2));
    console.log(`snapshot: ${Object.keys(s).length} contracts -> ${snapPath}`);
    return;
  }
  if (args.includes('--compare') && cmpPath) {
    if (!fs.existsSync(cmpPath)) {
      console.error(`compare: snapshot not found at ${cmpPath}`);
      process.exit(2);
    }
    const prev = JSON.parse(fs.readFileSync(cmpPath, 'utf8'));
    const cur = snapshot(dir);
    const { added, removed, changed, unchanged } = compare(prev, cur);
    console.log(`unchanged: ${unchanged.length}`);
    console.log(`added:     ${added.length}`);
    console.log(`removed:   ${removed.length}`);
    console.log(`changed:   ${changed.length}`);
    if (added.length) console.log('  ADDED:\n   ' + added.join('\n   '));
    if (removed.length) console.log('  REMOVED:\n   ' + removed.join('\n   '));
    if (changed.length) console.log('  CHANGED:\n   ' + changed.join('\n   '));
    const failed = added.length + removed.length + changed.length;
    process.exit(failed === 0 ? 0 : 1);
  }
  console.error('usage: compare-bytecode.js --dir <path> --snapshot <out> | --compare <prev>');
  process.exit(2);
}

main();
