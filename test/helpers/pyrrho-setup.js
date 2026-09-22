// Mocha root hook: keep the Pyrrho-gated node capabilities honest on any `--network tre` run.
//
// The TIP-2935 block-hash history ({Blockhash}) and the TIP-7951 secp256r1 precompile ({P256})
// are OFF on a fresh TRE. When inactive, both suites degrade *silently* to their fallback paths
// (P256 skips its native-path assertions; Blockhash serves only the native 256-block window) — a
// green run that never exercised the mainnet behaviour.
//
// This hook runs before any `--network tre` suite:
//   * default (ad-hoc serial run): probe and, if inactive, print a loud warning; zero side effects.
//   * TRE_ACTIVATE_PYRRHO=1: also activate first (idempotent, ~3s; warps the chain clock past a
//     maintenance period — hence opt-in).
//   * TRE_REQUIRE_PYRRHO=1 (set by scripts/run-tests-parallel.sh, i.e. `npm test` / CI): activate
//     and, if the proposals are still inactive afterwards, THROW — failing the run instead of
//     silently testing the fallbacks. Implies activation.
//
// On an already-active node the probe short-circuits and this is a no-op.

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

    const required = !!process.env.TRE_REQUIRE_PYRRHO;
    const shouldActivate = required || !!process.env.TRE_ACTIVATE_PYRRHO;

    // The activation script talks to the node's HTTP base (/tre, /wallet), not the JSON-RPC
    // path the `tre` network is configured with; derive the base from TRE_HTTP or the URL.
    const url =
      process.env.TRE_HTTP || (hre.network.config.url || '').replace(/\/jsonrpc\/?$/, '') || 'http://127.0.0.1:9090';

    const { pyrrhoStatus, activatePyrrho } = require('../../scripts/tre-activate-pyrrho');

    let active;
    try {
      active = (await pyrrhoStatus({ url })).allActive;
    } catch (e) {
      const msg = `could not read Pyrrho status from ${url}: ${e.message}`;
      // When required, an unreadable node is a hard failure (the native paths can't be confirmed).
      if (required) throw new Error(`TRE_REQUIRE_PYRRHO is set but ${msg}`);
      console.warn(`  ⚠ ${msg}`);
      return;
    }
    if (active) return;

    if (shouldActivate) {
      try {
        // activatePyrrho resolves only once the proposals are active; it throws otherwise.
        await activatePyrrho({ url, log: msg => console.log(`  ${msg}`) });
        return;
      } catch (e) {
        if (required) throw new Error(`TRE_REQUIRE_PYRRHO is set but Pyrrho activation failed on ${url}: ${e.message}`);
        console.warn(`  ⚠ TRE_ACTIVATE_PYRRHO set but activation failed: ${e.message}`);
      }
    }

    if (required) {
      throw new Error(
        `TRE_REQUIRE_PYRRHO is set but the Pyrrho proposals are inactive on ${url}. The Blockhash ` +
          `(TIP-2935) and P256 (TIP-7951) native paths would not be exercised — failing the run instead ` +
          `of silently testing the fallbacks.`,
      );
    }
    console.warn(WARNING);
  },
};

module.exports = { mochaHooks };
