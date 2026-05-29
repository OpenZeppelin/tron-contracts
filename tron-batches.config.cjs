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
  // Mocks split across batches to stay under the tron-solc 0.8.26 wasm
  // memory ceiling. Top-level + utils is the safest fit; everything
  // domain-specific lives in its own pass.
  {
    name: '10-mocks-base',
    dirs: [],
    extraLeaves: (() => {
      const fs = require('fs');
      const path = require('path');
      // tron-batches.config.cjs lives at the project root, so the
      // top-level mocks dir is `__dirname/contracts/mocks`. (This file
      // used to live under scripts/, which is why the prior version
      // had `__dirname/..` — the path bumped by one level when we
      // promoted it to the consumer-config layer.)
      const root = path.join(__dirname, 'contracts/mocks');
      if (!fs.existsSync(root)) return [];
      return fs.readdirSync(root)
        .filter(f => f.endsWith('.sol'))
        .map(f => f.replace(/\.sol$/, ''));
    })(),
  },
  { name: '11-mocks-token', dirs: ['contracts/mocks/token'] },
  { name: '12-mocks-governance', dirs: ['contracts/mocks/governance'] },
  { name: '13-mocks-proxy-crosschain', dirs: ['contracts/mocks/proxy', 'contracts/mocks/crosschain', 'contracts/mocks/utils', 'contracts/mocks/compound'] },
  { name: '14-mocks-docs', dirs: ['contracts/mocks/docs'] },
];
