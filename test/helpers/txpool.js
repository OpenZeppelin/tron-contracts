//
// `batchInBlock([fn, fn, ...])` exercises single-block-multi-tx
// assertions like "Votes only creates one checkpoint per block." On
// EVM hosts hardhat's auto-mine toggle handles this, but java-tron
// has no mempool primitive that lets us assemble N pre-built
// transactions into one block at the JSON-RPC layer. We achieve the
// same effect by toggling the chain's block-time setting:
//
//   1. `tre_blockTime(60)` — leave instamine mode and enter auto-mine
//      at 60-second intervals. Broadcasts queue in the pending pool
//      instead of producing a block per tx.
//   2. Kick off the N test-side `.send()` calls in parallel without
//      awaiting; each broadcast resolves immediately with a txID, and
//      the embedded `waitForReceipt` poll suspends until a block
//      lands.
//   3. Wait until at least N txs surface in the pending pool via the
//      FullNode's `/wallet/getpendingsize` endpoint.
//   4. `tre_mine` — the patched fork's manual-mine path calls
//      `BlockHandle.produce`, which drains the entire pending pool
//      into a single block (DposTask's auto-prod is held off via
//      `setBlockWaitLock` during the manual produce).
//   5. Resume instamine (`tre_blockTime(0)`) so subsequent test code
//      sees the usual one-tx-per-block semantics again.
//
// Caveats:
//   - Requires the patched FullNode.jar from `@openzeppelin/hardhat-
//     tron`; on a stock `tronbox/tre:dev` image the
//     `tre_blockTime(>0) + tre_mine` combo throws NPE in the DposTask
//     scheduler.
//   - The settle gate is bounded by `timeoutMs`; if a broadcast takes
//     longer than that to surface in pending, the resulting block may
//     not contain it and the test will see N-1 receipts instead of N.
//

const hre = require('hardhat');
const { setBlockTime, mine } = require('@openzeppelin/hardhat-tron/cheatcodes');

// Poll java-tron's pending-pool size until at least `n` txs are
// queued, or `timeoutMs` elapses. Uses `/wallet/getpendingsize` on
// the same host TronWeb is configured for.
async function waitForPendingSize(tronWeb, n, timeoutMs = 5000) {
  const url = tronWeb.fullNode.host.replace(/\/$/, '') + '/wallet/getpendingsize';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(r => r.json())
      .catch(() => ({ pendingSize: 0 }));
    if ((res.pendingSize || 0) >= n) return res.pendingSize;
    await new Promise(r => setTimeout(r, 25));
  }
  throw new Error(`batchInBlock: pending pool did not reach ${n} txs within ${timeoutMs}ms`);
}

async function batchInBlock(fns) {
  const { tronWeb } = hre.tre.makeTronWeb();
  const block = await setBlockTime(tronWeb, 60);
  if (!block.supported) {
    throw new Error(
      `batchInBlock: tre_blockTime not supported (${block.reason}). ` +
        'The patched FullNode.jar mounted by @openzeppelin/hardhat-tron is required.',
    );
  }
  let pending;
  try {
    // TronWeb's `createTransaction` stamps `timestamp = Date.now()`
    // at millisecond resolution and `expiration = timestamp + 60s`.
    // Firing two byte-identical calls (same selector + args +
    // ref_block) within the same millisecond yields identical
    // raw_data → identical txID → java-tron rejects the second as
    // a duplicate while still counting it toward `pendingSize`, so
    // the gate below would read N even though only N-1 actually
    // mine.
    //
    // The transaction build (which captures `Date.now()`) runs
    // asynchronously inside each `fn()`, so two near-simultaneous
    // kickoffs can still hit the same millisecond when the event
    // loop drains them. Spin ~10ms of wall-clock between kickoffs
    // so each build's `Date.now()` differs, even if `setTimeout`
    // under-delivers.
    pending = [];
    for (const fn of fns) {
      const before = Date.now();
      pending.push(fn());
      while (Date.now() - before < 10) {
        await new Promise(r => setTimeout(r, 1));
      }
    }
    // Deterministic gate: wait until all N broadcasts have reached
    // the pending pool before driving the manual mine.
    await waitForPendingSize(tronWeb, fns.length);
    const mineRes = await mine(tronWeb);
    if (!mineRes.supported) {
      throw new Error(`batchInBlock: tre_mine failed: ${mineRes.reason}`);
    }
    const results = await Promise.all(pending);
    return results;
  } finally {
    await setBlockTime(tronWeb, 0).catch(() => {});
  }
}

module.exports = { batchInBlock };
