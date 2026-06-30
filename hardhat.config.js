//
// hardhat.config.cjs
//
// Tron-only Hardhat config. Single compile pipeline (tron-solc 0.8.26
// via @openzeppelin/hardhat-tron), single network (a local java-tron
// container, `tre`), no fallback to standard solc / EDR. Tests
// written against this project assume the tron stack is up — they
// don't probe network type and don't skip on non-tron.
//
// evmVersion is "cancun" because 0.8.26 + cancun is what TRON's
// Democritus hardfork (post-GreatVoyage 4.7) targets. MCOPY is the
// only opcode that distinguishes cancun from shanghai output, and the
// `tronbox/tre:dev` image used here implements it.
//

/// ENVVAR
// - COMPILER:      compiler version (default: tron-solc 0.8.26)
// - SRC:           contracts folder to compile (default: contracts)
// - RUNS:          number of optimization runs (default: 200)
// - IR:            enable IR compilation (default: false)
// - COVERAGE:      enable coverage report (default: false)
// - GAS:           enable gas report (default: false)
// - COINMARKETCAP: coinmarketcap api key for USD value in gas report
// - CI:            output gas report to file instead of stdout

const fs = require('fs');
const path = require('path');

// Load .env into process.env before yargs reads it via `.env('')`, so
// the ENVVAR knobs above can be set from a local .env file.
require('dotenv').config();

const { argv } = require('yargs/yargs')()
  .env('')
  .options({
    // Compilation settings
    compiler: {
      alias: 'compileVersion',
      type: 'string',
      default: '0.8.26',
    },
    src: {
      alias: 'source',
      type: 'string',
      default: 'contracts',
    },
    runs: {
      alias: 'optimizationRuns',
      type: 'number',
      default: 200,
    },
    // viaIR enables the 0.8.26 `require(cond, CustomError())` overload
    // used throughout OZ v5.x.
    ir: {
      alias: 'enableIR',
      type: 'boolean',
      default: true,
    },
    evm: {
      alias: 'evmVersion',
      type: 'string',
      default: 'cancun',
    },
    // Extra modules
    coverage: {
      type: 'boolean',
      default: false,
    },
    gas: {
      alias: 'enableGasReport',
      type: 'boolean',
      default: false,
    },
    coinmarketcap: {
      alias: 'coinmarketcapApiKey',
      type: 'string',
    },
  });

const TRE_PRIVATE_KEY = '0xdd23ca549a97cb330b011aebb674730df8b14acaee42d211ab45692699ab8ba5';

require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-ethers');
// hardhat-exposed generates `$<ContractName>` external wrappers under
// `contracts/exposed/` (configured below) that expose every internal
// function as external. Tests use these to probe internal state
// (e.g. `token.$_mint(...)`).
//
// Wrapper `$<X>.sol` files are committed to git so the default tron
// pipeline never invokes stock solc. The opt-in `npm run exposed:regen`
// script (the only place stock solc runs) regenerates the wrappers
// when an underlying contract changes — its `artifacts/`+`cache/`
// output is wiped immediately so no stock-solc bytecode survives.
if (!process.env.SKIP_EXPOSED) {
  require('hardhat-exposed');
}
require('hardhat-gas-reporter');
require('hardhat-ignore-warnings');
require('solidity-coverage');
require('solidity-docgen');

// @openzeppelin/hardhat-tron bundles:
//   - tron-solc compile pipeline (extendConfig + subtask hooks)
//   - hre.tre.* runtime helpers (TronWeb wrapper, cheatcodes, etc.)
//   - hre.ethers.* override that routes deploys through TronWeb
//   - TRE docker lifecycle (auto-up/teardown around tasks)
//   - `tron:compile-batches` task
//
// Loaded from a local file: dep during the in-house validation
// phase. We'll switch to a published npm version once the package
// API stabilises.
require('@openzeppelin/hardhat-tron');

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    // Under coverage we compile with STOCK solc on the in-process Hardhat EVM
    // (see the defaultNetwork gate below), NOT tron-solc. solidity-coverage's
    // statement-hit attribution only works on the LEGACY (non-IR) pipeline, but
    // our contracts use the `require(cond, CustomError())` overload which only
    // compiles in legacy on solc >= 0.8.27 — so bump the coverage compile to
    // 0.8.28 and turn viaIR OFF. The TVM deploy pipeline is untouched (still
    // tron-solc 0.8.26 + viaIR on its tron network).
    version: argv.coverage ? '0.8.28' : argv.compiler,
    settings: {
      optimizer: {
        enabled: true,
        runs: argv.runs,
      },
      evmVersion: argv.evm,
      viaIR: argv.coverage ? false : argv.ir,
      outputSelection: { '*': { '*': ['storageLayout'] } },
      // `useLiteralContent: true` embeds source code as literal text
      // into each contract's metadata JSON (instead of just URL refs),
      // making metadata self-contained for verification (Sourcify,
      // Etherscan). Made explicit so bytecode stays reproducible.
      // Removing this flag shifts the metadata IPFS hash baked into the
      // tail of every contract's bytecode, so existing deployments would
      // mismatch on verification.
      metadata: { bytecodeHash: 'ipfs', useLiteralContent: true },
    },
  },
  // @openzeppelin/hardhat-tron config block. See the package README
  // for the full schema. Single source of truth for compiler version
  // + settings is `solidity` above — there is no parallel
  // `tronSolc.compilers` array.
  tre: {
    // Auto-up the TRE container around `hardhat test` / `hardhat node`.
    // Compile does NOT auto-spawn (the package default; see
    // tre.autoStartOnCompile) — solc is local and doesn't need TRE.
    autoStart: true,
    image: 'tronbox/tre:dev',
    // Bind-mount the patched FullNode.jar built by
    // `npm run tre:build-jar`. Without it, time-warp + snapshot/revert
    // degrade to real-time waits (the stock image's jar lacks those
    // surfaces). The path is host-relative.
    jarPath: './tre/FullNode.jar',

    compiler: {
      // `tron-when-network-tron` activates the tron-solc pipeline
      // ONLY when the active network has `tron: true` (i.e. `tre`).
      // Under `--network hardhat`, the compile falls through to
      // stock solc, which is what `npm run exposed:regen` needs to
      // generate `$<X>` wrappers via hardhat-exposed.
      target: 'tron-when-network-tron',

      // Glob allowlist for plain `hardhat compile --network tre`.
      // The full OZ corpus is too large for a single tron-solc 0.8.26
      // wasm pass, so we default to an empty set here and let
      // `npm run compile` dispatch through `tron:compile-batches`,
      // which mutates this array between passes.
      include: [],

      // Batch defs for `tron:compile-batches`. Pulled in via
      // batchesPath so the file stays editable without restarting
      // hardhat. Switch to inline `batches: require('./...')` if you
      // want startup validation of the array shape.
      //
      // Overridable via the BATCHES env var so `compile:harnesses` can
      // point the batched compile at the FV harness batch set (which
      // allowlists the `fv/harnesses` basenames) instead of the default
      // contracts batches. Without this the harness compile reuses the
      // contracts allowlist and silently compiles `contracts/` rather
      // than the harnesses.
      batchesPath: process.env.BATCHES || './tron-batches.config.cjs',
    },
  },

  // hardhat-exposed: generated `$<X>` wrappers live in a top-level
  // `contracts-exposed/` tree (never under `contracts/`). The tron
  // batched compile pairs each `contracts/<x>` batch with
  // `contracts-exposed/<x>`, so wrapper bytecode lands in
  // `artifacts/contracts-exposed/` (tron-solc-validated) alongside
  // the originals.
  exposed: {
    imports: true,
    initializers: true,
    // `*WithInit*` (not just `*WithInit.sol`) so the closure-split
    // `contracts/mocks/withinit/WithInit_NN.sol` files (see
    // scripts/upgradeable/split-withinit.js) are also kept out of
    // hardhat-exposed's `$`-wrapper generation.
    // Under coverage, also skip generating the `$TRC7739Mock` wrapper: with the
    // optimizer off (forced by solidity-coverage on the legacy pipeline) its
    // nested-typed-data accessor is the one source that still hits "stack too
    // deep". The production draft-TRC7739.sol is still instrumented and covered
    // via its real mock; only this generated `$` accessor is dropped, and only
    // for the coverage build.
    exclude: [
      'vendor/**/*',
      '**/*WithInit*.sol',
      '**/withinit/**/*',
      ...(argv.coverage ? ['mocks/utils/cryptography/TRC7739Mock.sol'] : []),
    ],
    outDir: 'contracts-exposed',
  },
  warnings: {
    'contracts-exposed/**/*': {
      'code-size': 'off',
      'initcode-size': 'off',
    },
    'contracts/exposed/**/*': {
      'code-size': 'off',
      'initcode-size': 'off',
    },
    '*': {
      'unused-param': !argv.coverage, // coverage causes unused-param warnings
      'transient-storage': false,
      // Under tron-solc 0.8.26 the `chain` identifier is treated as a
      // builtin and tickles "shadows a builtin symbol" on
      // crosschain/CrosschainLinked.sol and
      // crosschain/bridges/abstract/BridgeFungible.sol. We can't fix
      // those without diverging from the byte-for-byte upstream OZ
      // source, so warn (visible at compile time) rather than error.
      default: 'warn',
    },
  },

  // Bare `hardhat test` (no --network) routes to the TRE network so the
  // tron pipeline + runtime bridge are active by default. Under coverage we
  // switch to the in-process Hardhat EVM: solidity-coverage instruments + runs
  // on that VM (it hooks the EDR `step` events), and the contracts are
  // EVM-source-compatible. This also keeps the tron bridge inactive so the JS
  // suite executes on the VM solidity-coverage actually hooks.
  defaultNetwork: argv.coverage ? 'hardhat' : 'tre',

  networks: {
    tre: {
      // TRE_URL lets parallel-test workers each point at their own TRE
      // container on a different host port. Serial runs default to 9090.
      url: process.env.TRE_URL || 'http://127.0.0.1:9090/jsonrpc',
      tron: true,
      accounts: [TRE_PRIVATE_KEY],
    },
  },
  gasReporter: {
    enabled: argv.gas,
    showMethodSig: true,
    includeBytecodeInJSON: true,
    currency: 'USD',
    coinmarketcap: argv.coinmarketcap,
  },
  paths: {
    sources: argv.src,
  },

  // Mocha hook/test timeout. TVM deploys are slow (~1-2s each:
  // protobuf createSmartContract → broadcast → instamine →
  // unconfirmed-receipt poll), and Governor-family fixtures deploy
  // 7-10 contracts plus token mints + delegations. The upstream OZ
  // default (4s, see .mocharc.js) is impossible on TVM; 600s gives
  // slow-tail hooks headroom without hiding genuine hangs.
  //
  // `reporter` is a Spec-extending reporter that writes a per-file
  // elapsed-time JSON when MOCHA_TIMINGS_OUT is set (consumed by
  // scripts/bucket-files.js to weight parallel-test buckets by real
  // wall time). When the env var is unset it's a pass-through to Spec.
  mocha: {
    timeout: 600_000,
    reporter: require.resolve('./scripts/mocha-file-timings-reporter.js'),
  },
  docgen: require('./docs/config'),
};
