---
'openzeppelin-tron-solidity': minor
---

Port ERC-165 to TRC-165.

- Rename `IERC165` / `ERC165` / `ERC165Checker` (and the `ERC165Mock` test helpers) to `ITRC165` / `TRC165` / `TRC165Checker`, updating all imports and `supportsInterface` overrides across the access, governance, token and crosschain layers.
- TRC-165 (TIP-165, https://github.com/tronprotocol/tips/blob/master/tip-165.md) is functionally identical to EIP-165 — this is a naming-only port; the `0x01ffc9a7` interface id and behaviour are unchanged.
- `IERC1820Registry` keeps its `updateERC165Cache` / `implementsERC165Interface` function names, which are part of the separate ERC-1820 standard's external ABI.
