---
'openzeppelin-tron-solidity': minor
---

`Create3`: Add the `CREATE3` deployment library from OpenZeppelin Contracts. NOTE: `CREATE3` relies on a plain `CREATE` whose address on the TVM derives from the transaction hash (not `(sender, nonce)`), so the library does not produce reproducible addresses on TRON and must not be used for counterfactual deployment there; the contract documents this in detail. It is included for upstream parity.
