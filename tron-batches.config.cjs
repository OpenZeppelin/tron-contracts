//
// scripts/tron-batches.js
//
// Single source of truth for the batched tron-solc compile.
//
// Each entry's `dirs` are scanned recursively at runtime; every `.sol`
// file's basename becomes a tron-solc allowlist entry for that batch's
// pass. Imports are resolved transitively, so a batch's effective
// compile set = its leaves + their import closure (which may pull in
// files belonging to *other* batches' directories — that's expected
// and fine, it just means some files are re-compiled across passes;
// the cache between passes deduplicates the work).
//
// `extraLeaves` is a list of bare basenames (no .sol) added explicitly
// — used for sources that don't fit the directory grouping (e.g. the
// spike's root-level Counter.sol).
//
// The order matters:
//   - Foundational batches go first (utils, interfaces) so later
//     batches' imports already have a warm Hardhat cache.
//   - The heaviest single batch (governance) lives near the end so an
//     OOM there fails the run AFTER everything else has succeeded —
//     easier to triage.
//
// If a batch's closure exceeds the tron-solc 0.8.26 wasm memory
// ceiling (empirically somewhere ≥ 91 files, < 226 files for the OZ
// v5.6.1 corpus), split it into two by carving out a sub-directory.
//

module.exports = [
  { name: '01-utils', dirs: ['contracts/utils'] },
  { name: '02-interfaces', dirs: ['contracts/interfaces'] },
  { name: '03-access', dirs: ['contracts/access'] },
  {
    name: '04-token-trc20',
    dirs: ['contracts/token/TRC20', 'contracts/token/common'],
  },
  {
    name: '05-token-nft-erc6909',
    dirs: ['contracts/token/TRC721', 'contracts/token/TRC1155', 'contracts/token/ERC6909'],
  },
  {
    name: '06-finance-metatx-proxy-vendor',
    dirs: ['contracts/finance', 'contracts/metatx', 'contracts/proxy', 'contracts/vendor'],
  },
  { name: '07-governance', dirs: ['contracts/governance'] },
  {
    name: '08-account-crosschain',
    dirs: ['contracts/account', 'contracts/crosschain'],
  },
  { name: '09-spike', dirs: [], extraLeaves: ['Counter'] },
  // Top-level mocks, split into sub-batches to stay under the tron-solc
  // 0.8.26 wasm memory ceiling. The non-upgradeable corpus compiles all ~34
  // top-level mocks in ONE pass, but the transpiled (upgradeable) variant
  // inflates each mock with ERC-7201 namespaced-storage accessors plus a
  // generated `*WithInit` constructor variant, so the single-pass closure
  // OOMs ("memory access out of bounds"). Chunked dynamically so it tracks
  // the mock set; lower CHUNK if a pass still OOMs in the upgradeable build.
  // (In the non-upgradeable repo this just runs as a few cheap passes.)
  ...(() => {
    const fs = require('fs');
    const path = require('path');
    const root = path.join(__dirname, 'contracts/mocks');
    if (!fs.existsSync(root)) return [{ name: '10-mocks-base', dirs: [] }];
    const leaves = fs
      .readdirSync(root)
      .filter(f => f.endsWith('.sol'))
      .map(f => f.replace(/\.sol$/, ''))
      .sort();
    const CHUNK = 12;
    const out = [];
    for (let i = 0; i < leaves.length; i += CHUNK) {
      out.push({
        name: `10-mocks-base-${String(i / CHUNK + 1).padStart(2, '0')}`,
        dirs: [],
        extraLeaves: leaves.slice(i, i + CHUNK),
      });
    }
    return out;
  })(),
  { name: '11-mocks-token', dirs: ['contracts/mocks/token'] },
  { name: '12-mocks-governance', dirs: ['contracts/mocks/governance'] },
  { name: '13-mocks-proxy-crosschain', dirs: ['contracts/mocks/proxy', 'contracts/mocks/crosschain', 'contracts/mocks/utils', 'contracts/mocks/compound'] },
  { name: '14-mocks-docs', dirs: ['contracts/mocks/docs'] },
];
