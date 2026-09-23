---
'openzeppelin-tron-solidity': minor
---

`SignerEIP7702`: Remove the signer. EIP-7702 has no TRON analogue, so its "the account validates a signature recovering to its own address" path is unreachable on the TVM and the contract cannot fulfill its purpose. Same rationale as not porting `Create3`.
