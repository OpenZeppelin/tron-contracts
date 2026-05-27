---
'openzeppelin-tron-solidity': patch
---

Align proxy CREATE2 address prediction with TIP-26.

- `Clones.predictDeterministicAddress` and
  `predictDeterministicAddressWithImmutableArgs` now use the TIP-26
  `0x41` prefix in their keccak256 derivation, matching what TVM's
  CREATE2 opcode computes on-chain. The previous derivation hashed with
  the EVM `0xff` prefix, so the predicted address diverged from the
  address `cloneDeterministic` actually deploys at.
- Proxy module tests (`Clones`, `ProxyAdmin`,
  `TransparentUpgradeableProxy`, `UUPSUpgradeable`) read CREATE
  results from `receipt.internalTransactions` rather than
  `(sender, nonce)` prediction. TVM derives CREATE addresses from
  `sha3(txHash || sender)` — `staticCall` and the real deploy return
  different addresses, so the predict-and-attach pattern cannot work
  on TVM.
- `TransparentUpgradeableProxy.behaviour.js` resolves the inner
  `ProxyAdmin` via the ERC-1967 `AdminSlot` instead of predicting its
  CREATE address.
