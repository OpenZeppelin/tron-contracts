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

// --- closure-aware bin-packing (used for the peer exposed-wrapper batches) --
// Resolve a Solidity source's transitive import closure (size) so a set of
// files can be grouped into passes that each stay under the tron-solc wasm
// ceiling. Self-tuning: tracks corpus growth without hand-maintained splits.
const _binPack = (() => {
  const fs = require('fs');
  const path = require('path');
  const ROOT = __dirname;
  const REMAP = fs
    .readFileSync(path.join(ROOT, 'remappings.txt'), 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split('='));
  const resolveImport = (from, spec) => {
    for (const [p, t] of REMAP) if (spec.startsWith(p)) return path.join(ROOT, t, spec.slice(p.length));
    if (spec.startsWith('.')) return path.resolve(path.dirname(from), spec);
    return path.join(ROOT, 'node_modules', spec);
  };
  const IMPORT_RE = /import\s+(?:[^"';]*\sfrom\s+)?["']([^"']+)["']/g;
  const cache = new Map();
  const closure = file => {
    const key = path.normalize(file);
    if (cache.has(key)) return cache.get(key);
    const seen = new Set();
    const stack = [key];
    while (stack.length) {
      const f = path.normalize(stack.pop());
      if (seen.has(f) || !fs.existsSync(f)) continue;
      seen.add(f);
      let src;
      try {
        src = fs.readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      let m;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(src)) !== null) stack.push(resolveImport(f, m[1]));
    }
    cache.set(key, seen);
    return seen;
  };
  // Greedy first-fit: returns array of file-groups, each group's UNION closure
  // <= threshold (a group with a single over-threshold file is kept as-is).
  return (files, threshold) => {
    const withCl = files
      .map(f => ({ f, cl: closure(f) }))
      .sort((a, b) => b.cl.size - a.cl.size);
    const bins = [];
    for (const { f, cl } of withCl) {
      let placed = false;
      for (const bin of bins) {
        const union = new Set(bin.cl);
        for (const x of cl) union.add(x);
        if (union.size <= threshold) {
          bin.files.push(f);
          bin.cl = union;
          placed = true;
          break;
        }
      }
      if (!placed) bins.push({ files: [f], cl: new Set(cl) });
    }
    return bins.map(b => b.files);
  };
})();

module.exports = [
  { name: '01-utils', dirs: ['contracts/utils'] },
  { name: '02-interfaces', dirs: ['contracts/interfaces'] },
  // Peer-import exposed wrappers. In PEER mode (`transpile.sh -q`) the stateless
  // library/interface code (Math, Clones, Checkpoints, ...) is NOT emitted
  // locally — it is imported from `@openzeppelin/tron-contracts`. hardhat-exposed
  // still generates `$`-wrappers for those peer imports, but places them under a
  // SEPARATE `contracts-exposed/$_/<peer-path>/` subtree (its convention for
  // out-of-sources files). The `dirs:` auto-pairing only mirrors
  // `contracts/<x>` -> `contracts-exposed/<x>`, so it never reaches `$_`, and
  // those wrappers (`$Math`, `$Clones`, `$Checkpoints`, ...) would never compile
  // -> the test suite fails to find them. Compile them here, split per peer
  // subsystem to stay under the tron-solc wasm ceiling. (No-op until the
  // wrappers exist, i.e. after `npm run exposed:regen`.)
  ...(() => {
    const fs = require('fs');
    const path = require('path');
    const base = path.join(__dirname, 'contracts-exposed/$_');
    if (!fs.existsSync(base)) return [];
    // Walk down to the `.../contracts` dir (peer layout: $_/<pkg>/contracts/...).
    let contractsDir = null;
    const stack = [base];
    while (stack.length) {
      const d = stack.pop();
      if (path.basename(d) === 'contracts' && fs.statSync(d).isDirectory()) {
        contractsDir = d;
        break;
      }
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) stack.push(path.join(d, e.name));
      }
    }
    if (!contractsDir) {
      // Fallback: one batch for the whole subtree.
      return [{ name: '02b-exposed-peer', include: ['contracts-exposed/$_/**/*.sol'] }];
    }
    const rel = path.relative(__dirname, contractsDir);
    const out = [];
    for (const sub of fs
      .readdirSync(contractsDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()) {
      // Collect this subsystem's wrapper files, then closure-bin-pack them so a
      // heavy subsystem (e.g. utils, whose crypto+math closure is ~113 sources)
      // is split across passes that each stay under the wasm ceiling.
      const files = [];
      (function walk(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) walk(p);
          else if (e.name.endsWith('.sol')) files.push(p);
        }
      })(path.join(contractsDir, sub));
      const groups = _binPack(files, 80);
      groups.forEach((grp, i) => {
        const suffix = groups.length > 1 ? `-${String(i + 1).padStart(2, '0')}` : '';
        out.push({
          name: `02b-exposed-peer-${sub.toLowerCase()}${suffix}`,
          include: grp.map(f => path.relative(__dirname, f)),
        });
      });
    }
    return out;
  })(),
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
  // hardhat-exposed `initializers: true` emits a `*WithInit` constructor
  // variant for every initializable contract. Upstream that lands in a single
  // `contracts/mocks/WithInit.sol`, but its import closure is the ENTIRE corpus
  // (~190 contracts → ~300 sources), which blows the tron-solc 0.8.26 wasm
  // memory ceiling in one pass. `scripts/upgradeable/split-withinit.js` splits
  // it into closure-bounded `contracts/mocks/withinit/WithInit_NN.sol` files;
  // each compiles as its own pass here. Run LAST so all their dependencies are
  // already warm in the shared compile cache. (No-op until the splitter runs.)
  ...(() => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, 'contracts/mocks/withinit');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.sol'))
      .sort()
      .map(f => ({
        name: `15-mocks-withinit-${f.replace(/^WithInit_(\d+)\.sol$/, '$1')}`,
        include: [`contracts/mocks/withinit/${f}`],
      }));
  })(),
];
