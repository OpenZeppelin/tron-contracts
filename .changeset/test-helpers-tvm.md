---
'openzeppelin-tron-solidity': patch
---

Adapt cross-cutting test helpers to TVM's single-witness model.

- `test/helpers/txpool.js`'s `batchInBlock` no longer drives
  `evm_setAutomine` + `evm_mine` (those JSON-RPC methods don't exist
  on java-tron). Instead it leaves instamine via the patched
  FullNode's `tre_blockTime(60)` cheatcode, parks the broadcasts in
  the pending pool with ~10ms wall-clock spacing so each tx gets a
  distinct `Date.now()` timestamp (and therefore a distinct txID),
  waits on `/wallet/getpendingsize` until all N are queued, drives a
  manual `tre_mine`, then restores instamine. Callers (`TRC20Votes`
  and `TrieProof` tests) keep their `batchInBlock([fn, fn, ...])`
  call shape.
- `test/helpers/governance.js`'s `GovernorHelper.delegate(...)`
  serialises its three sub-calls instead of running them in parallel
  via `Promise.all`. TVM's instamine + single-witness setup already
  orders tx execution per block; firing the three calls in parallel
  just queues concurrent HTTP requests at the FullNode and stacks
  per-tx receipt-poll deadlines until the later broadcasts time out.
  Sequential awaits stay inside the suite's time budget and stop
  back-pressuring the witness.
