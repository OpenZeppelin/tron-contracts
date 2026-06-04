---
'openzeppelin-tron-solidity': major
---

Port ERC-2771 to TRC-2771.

- Rename `ERC2771Context` / `ERC2771Forwarder` (and the `ERC2771ContextMock`) to `TRC2771Context` / `TRC2771Forwarder`, updating all imports and references (including `Multicall`).
- TRC-2771 (TIP-2771, https://github.com/tronprotocol/tips/blob/master/tip-2771.md) is the TRON-side analogue of EIP-2771 — naming-only port; sender extraction is unchanged (TVM addresses are the same 20-byte values as EVM).
