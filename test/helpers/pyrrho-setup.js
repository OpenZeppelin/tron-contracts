// Mocha root hook: make the Pyrrho-gated capabilities visible on a serial run.
//
// The per-worker Pyrrho activation (TIP-2935 block-hash history for {Blockhash} and the
// TIP-7951 secp256r1 precompile for {P256}) lives in scripts/run-tests-parallel.sh, so it
// only runs for `npm test`. A serial `npx hardhat test --network tre` against a fresh TRE
// never activates, and both suites degrade *silently* to their fallback paths (P256 skips
// the native-path assertions; Blockhash serves only the native 256-block window) — a green
// run that quietly did not exercise the mainnet behaviour.
//
// This hook closes that gap for any `--network tre` invocation:
//   * default: probe the chain and, if the proposals are inactive, print a loud warning
//     naming what will fall back and how to get full coverage. Zero side effects.
//   * TRE_ACTIVATE_PYRRHO=1: also activate the proposals first (idempotent, ~3s, and it
//     warps the chain clock past a maintenance period — hence opt-in, not the default).
//
// On a node already activated (e.g. by the parallel runner, which activates before invoking
// `hardhat test`) the probe short-circuits and this is a no-op.

const WARNING = [
  '',
  '  ⚠ Pyrrho TVM proposals are NOT active on this TRE node.',
  '    {Blockhash} (TIP-2935 history) and {P256} (TIP-7951 precompile) native paths will be',
  '    skipped or fall back, so their mainnet behaviour is NOT exercised by this run.',
  '    To exercise them: run `npm test` (the parallel runner activates each worker), set',
  '    TRE_ACTIVATE_PYRRHO=1 on this command, or run `node scripts/tre-activate-pyrrho.js`',
  '    against this node once.',
  '',
].join('\n');

const mochaHooks = {
  async beforeAll() {
    // Lazy-require so loading this file (at hardhat.config.js load time) stays cheap.
    const hre = require('hardhat');
    if (!hre.network.config.tron) return; // only relevant on a TRE network

    // The activation script talks to the node's HTTP base (/tre, /wallet), not the JSON-RPC
    // path the `tre` network is configured with; derive the base from TRE_HTTP or the URL.
    const url =
      process.env.TRE_HTTP || (hre.network.config.url || '').replace(/\/jsonrpc\/?$/, '') || 'http://127.0.0.1:9090';

    const { pyrrhoStatus, activatePyrrho } = require('../../scripts/tre-activate-pyrrho');

    let active;
    try {
      active = (await pyrrhoStatus({ url })).allActive;
    } catch (e) {
      // A node that can't answer the probe isn't worth failing the whole suite over.
      console.warn(`  ⚠ could not read Pyrrho status from ${url}: ${e.message}`);
      return;
    }
    if (active) return;

    if (process.env.TRE_ACTIVATE_PYRRHO) {
      try {
        await activatePyrrho({ url, log: msg => console.log(`  ${msg}`) });
        return;
      } catch (e) {
        console.warn(`  ⚠ TRE_ACTIVATE_PYRRHO set but activation failed: ${e.message}`);
      }
    }
    console.warn(WARNING);
  },
};

module.exports = { mochaHooks };
