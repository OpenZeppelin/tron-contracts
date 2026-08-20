---
'openzeppelin-tron-solidity': minor
---

Port EIP-712 to TIP-712.

- Rename the `EIP712` contract to `TIP712` (file, `EIP712Verifier` mock, internal `_TIP712Name`/`_TIP712Version` getters), updating all inheritors and references (`Governor`, `Votes`, `TRC20Permit`, `TRC2771Forwarder`, `ERC7739`).
- Compute the domain separator's `chainId` as `block.chainid & 0xffffffff`, as required by TIP-712 (https://github.com/tronprotocol/tips/blob/master/tip-712.md). This is the low four bytes — the value TRON exposes through `eth_chainId` and that off-chain TIP-712 signers use. It is a no-op where the TVM `CHAINID` opcode already returns four bytes, and makes the on-chain digest match off-chain signatures even where it returns the full genesis hash.
- The `EIP712Domain` type hash and the ERC-5267 `eip712Domain()` interface are unchanged (TIP-712 reuses them); TIP-712's `0x41` address-prefix and `trcToken` deltas concern off-chain encoders and application structs, not this base contract.
