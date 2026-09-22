---
'openzeppelin-tron-solidity': minor
---

`Blockhash`: Restore the TIP-2935 history-storage lookup so `blockHash` serves block hashes beyond the native 256-block window (between 257 and 8191 blocks ago). TIP-2935 (java-tron 4.8.2, `ALLOW_TVM_PRAGUE`) reuses the same history-storage address and bytecode as EIP-2935, so the library matches upstream; on networks where TIP-2935 is not active the lookup gracefully returns zero.
