---
'openzeppelin-tron-solidity': patch
---

TVM compile-pipeline and build-infra adjustments.

- `hardhat-exposed` is gated behind `SKIP_EXPOSED`, its `outDir` moved to
  `contracts/exposed`, the tron compiler `target` set to
  `tron-when-network-tron` (so `--network hardhat` falls through to stock solc
  for wrapper generation), and an `exposed:regen` script added; the generated
  tree is gitignored (regenerated, not committed).
- Mocha timeout raised to 600s (TVM deploys are slow), solc `metadata` pinned
  (`bytecodeHash: ipfs`, `useLiteralContent: true`) so bytecode stays
  reproducible, `warnings.default` relaxed to `warn` (tron-solc treats `chain`
  as a builtin symbol on the crosschain contracts), `defaultNetwork: tre`, and
  `.env` loading via `dotenv`.
- Pin `dotenv`, `mocha`, `solc`, and `tronweb`.
- Add `scripts/mocha-file-timings-reporter.js` (per-file wall-time weighting for
  parallel-test buckets) and `scripts/compare-bytecode.js` (compile-migration
  drift detector).
