---
'openzeppelin-tron-solidity': minor
---

Port ERC-1271 to TRC-1271.

- Rename `IERC1271` to `ITRC1271` (and the `ERC1271WalletMock` / `ERC1271` test behavior helpers), updating all imports and references (`SignatureChecker`, `draft-ERC7739`, `IGovernor`/`Governor`, `MultiSignerERC7913`).
- TRC-1271 (TIP-1271, https://github.com/tronprotocol/tips/blob/master/tip-1271.md) uses the same `isValidSignature(bytes32,bytes)` method and `0x1626ba7e` magic value as EIP-1271 — naming-only port.
