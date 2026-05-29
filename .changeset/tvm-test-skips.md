---
'openzeppelin-tron-solidity': patch
---

Skip or re-enable tests for TVM/EVM divergences.

- Skip `TrieProof` (needs un-bridged anvil ethers + EVM trie roots), the
  `sanity` snapshot block-rollback assertion (TVM block number is monotonic
  through `tre_revert`), and the `TRC20Votes` one-checkpoint-per-block test
  (TRE cannot stage N transactions into one block).
- Re-enable 4 `RelayedCall` tests that were over-skipped; they pass on TVM.
