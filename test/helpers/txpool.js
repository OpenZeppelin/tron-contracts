//
// test/helpers/txpool.js (dual-mode)
//
// `batchInBlock(fns[, provider])` forces several transactions into a
// single block — used by single-block-multi-tx assertions like "Votes
// only creates one checkpoint per block" and the TrieProof inclusion
// tests.
//
// Two modes, selected by whether an explicit `provider` is passed:
//
//   * EVM mode (provider given) — used by TrieProof, which runs against
//     a spawned `anvil` node. Standard hardhat/anvil mempool control:
//     evm_setAutomine(false) → fire all txs → evm_mine → collect
//     receipts. This is the upstream OpenZeppelin behaviour, kept intact
//     because anvil (unlike TRE) supports these RPCs.
//
//   * TVM mode (no provider) — used by every on-TRE test. java-tron has
//     no mempool primitive to assemble N pre-built txs into one block at
//     the JSON-RPC layer, so we toggle the chain's block-time setting:
//
//       1. `tre_blockTime(60)` — leave instamine, enter auto-mine at 60s.
//          Broadcasts queue in the pending pool instead of one-block-per-tx.
//       2. Fire the N test-side `.send()` calls (staggered ~10ms so each
//          gets a distinct timestamp → distinct txID; identical raw_data
//          within 1ms collides and java-tron rejects the dup).
//       3. Gate on /wallet/getpendingsize reaching N.
//       4. `tre_mine` — the patched fork drains the whole pending pool
//          into one block.
//       5. Resume instamine (`tre_blockTime(0)`).
//
//     Requires the patched FullNode.jar; on stock tronbox/tre:dev the
//     tre_blockTime(>0)+tre_mine combo NPEs in the DposTask scheduler.
//

const { network } = require('hardhat');
const { expect } = require('chai');

const hre = require('hardhat');
const { unique } = require('./iterate');
const { setBlockTime, mine } = require('@openzeppelin/hardhat-tron/cheatcodes');

// ---- EVM mode (anvil / hardhat network) --------------------------------

async function batchInBlockEVM(txs, provider) {
  try {
    // disable auto-mining
    await provider.send('evm_setAutomine', [false]);
    // send all transactions
    const responses = await Promise.all(txs.map(fn => fn()));
    // mine one block
    await provider.send('evm_mine');
    // fetch receipts
    const receipts = await Promise.all(responses.map(response => response.wait()));
    // Sanity check, all tx should be in the same block
    expect(unique(receipts.map(receipt => receipt.blockNumber))).to.have.lengthOf(1);
    // return responses
    return receipts;
  } finally {
    // enable auto-mining
    await provider.send('evm_setAutomine', [true]);
  }
}

// ---- TVM mode (TRE) -----------------------------------------------------

// Poll java-tron's pending-pool size until at least `n` txs are
// queued, or `timeoutMs` elapses. Uses `/wallet/getpendingsize` which
// the FullNode exposes on the same host TronWeb is configured for.
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

async function batchInBlockTVM(fns) {
  const { tronWeb } = hre.tre.makeTronWeb();
  const block = await setBlockTime(tronWeb, 60);
  if (!block.supported) {
    throw new Error(
      `batchInBlock: tre_blockTime not supported (${block.reason}). ` +
        'The patched FullNode.jar mounted via docker-compose.tre.yml is required.',
    );
  }
  let pending;
  try {
    // Stagger broadcasts so each tx has a distinct timestamp. TronWeb's
    // `createTransaction` stamps `timestamp = Date.now()` at ms
    // resolution; two byte-identical calls within <1ms yield the same
    // raw_data → same txID → java-tron rejects the second as a duplicate
    // AND still counts it toward pendingSize, so the gate below can read
    // N even though only N-1 mine.
    pending = [];
    for (const fn of fns) {
      const before = Date.now();
      pending.push(fn());
      while (Date.now() - before < 10) {
        await new Promise(r => setTimeout(r, 1));
      }
    }
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

// ---- dispatcher ---------------------------------------------------------
//
// An explicit `provider` selects EVM mode (TrieProof passes its anvil
// provider). With no provider, we use TVM mode — NOT `network.provider`,
// which is the TRE network and doesn't support evm_setAutomine.
async function batchInBlock(fns, provider) {
  if (provider !== undefined && provider !== network.provider) {
    return batchInBlockEVM(fns, provider);
  }
  return batchInBlockTVM(fns);
}

module.exports = { batchInBlock };
