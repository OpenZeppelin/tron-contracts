---
'openzeppelin-tron-solidity': patch
---

Align CREATE2 address derivation with TVM's TIP-26 hash prefix.

- `Create2.computeAddress` and `Create2.deploy` now hash with the `0x41` prefix defined by TIP-26 (https://github.com/tronprotocol/tips/blob/master/tip-26.md), the TRON analogue of EIP-1014's `0xff`, so predicted addresses match what TVM's `create2` opcode computes on-chain.
- `RelayedCall.getRelayer` applies the same `0x41` prefix when predicting the relay contract address, fixing a mismatch where the predicted address (used for the `extcodesize` redeploy guard) diverged from the address the `create2` opcode actually produces.
