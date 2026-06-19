//
// fv/harness-batches.config.cjs
//
// Batch definitions for `npm run compile:harnesses`, consumed by the
// `tron:compile-batches` task via the BATCHES env override (see
// hardhat.config.js `tre.compiler.batchesPath`).
//
// The default `tron-batches.config.cjs` allowlists `contracts/` basenames, so
// running it with SRC=./fv/harnesses would still compile the contracts corpus
// and never the harnesses. This config allowlists the `fv/harnesses` basenames
// instead, so the batched tron-solc compile actually builds the FV harnesses
// (plus their `../patched/**` import closure, resolved transitively).
//
// The harnesses are split by subsystem so each tron-solc pass stays under the
// 0.8.26 wasm memory ceiling (the union closure of all harnesses is ~85
// sources — close to the empirical limit; per-subsystem passes keep each one
// comfortably below it, with the inter-pass cache deduplicating shared
// imports). If a future harness pushes a pass over the ceiling, carve its
// file(s) into a new entry.
module.exports = [
  {
    name: 'harnesses-access',
    dirs: [],
    extraLeaves: [
      'AccessControlHarness',
      'AccessControlDefaultAdminRulesHarness',
      'AccessManagedHarness',
      'AccessManagerHarness',
      'OwnableHarness',
      'Ownable2StepHarness',
    ],
  },
  {
    name: 'harnesses-token',
    dirs: [],
    extraLeaves: [
      'TRC20PermitHarness',
      'TRC20WrapperHarness',
      'TRC20FlashMintHarness',
      'TRC721Harness',
      'TRC721ReceiverHarness',
      'TRC3156FlashBorrowerHarness',
    ],
  },
  {
    name: 'harnesses-utils',
    dirs: [],
    extraLeaves: [
      'DoubleEndedQueueHarness',
      'EnumerableMapHarness',
      'EnumerableSetHarness',
      'NoncesHarness',
      'PausableHarness',
      'InitializableHarness',
      'TimelockControllerHarness',
    ],
  },
];
