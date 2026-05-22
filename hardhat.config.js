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
require('hardhat-exposed');
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
    version: argv.compiler,
    settings: {
      optimizer: {
        enabled: true,
        runs: argv.runs,
      },
      evmVersion: argv.evm,
      viaIR: argv.ir,
      outputSelection: { '*': { '*': ['storageLayout'] } },
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
      target: 'tron',

      // Glob allowlist for plain `hardhat compile`. The full OZ
      // corpus is too large for a single tron-solc 0.8.26 wasm pass,
      // so we default to just the Counter contract here and let
      // `npm run compile` dispatch through `tron:compile-batches`,
      // which mutates this array between passes.
      include: ['contracts/Counter.sol'],

      // Batch defs for `tron:compile-batches`. Pulled in via
      // batchesPath so the file stays editable without restarting
      // hardhat. Switch to inline `batches: require('./...')` if you
      // want startup validation of the array shape.
      batchesPath: './tron-batches.config.cjs',
    },
  },
  warnings: {
    'contracts-exposed/**/*': {
      'code-size': 'off',
      'initcode-size': 'off',
    },
    '*': {
      'unused-param': !argv.coverage, // coverage causes unused-param warnings
      'transient-storage': false,
      default: 'error',
    },
  },
  networks: {
    tre: {
      // TRE_URL lets parallel-test workers each point at their own TRE
      // container on a different host port. Serial runs default to 9090.
      url: process.env.TRE_URL || 'http://127.0.0.1:9090/jsonrpc',
      tron: true,
      accounts: [TRE_PRIVATE_KEY],
    },
  },
  exposed: {
    imports: true,
    initializers: true,
    exclude: ['vendor/**/*', '**/*WithInit.sol'],
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
  docgen: require('./docs/config'),
};
