---
'openzeppelin-tron-solidity': patch
---

TVM-aware test helpers.

- `account` default balance kept within TVM's `Long.MAX_VALUE` bound
  (`5 * WeiPerEther`; the upstream `10000 ETH` equivalent overflows TVM's
  1-wei-==-1-sun account balance).
- `txpool` `batchInBlock` made dual-mode — EVM path (`evm_setAutomine`) when an
  explicit provider is passed (anvil-backed tests), TVM path
  (`tre_blockTime`/`tre_mine`) otherwise.
