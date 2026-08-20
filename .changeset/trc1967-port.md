---
'openzeppelin-tron-solidity': minor
---

Port ERC-1967 to TRC-1967.

- Rename `IERC1967` / `ERC1967Proxy` / `ERC1967Utils` (the `proxy/ERC1967/` directory and the `ERC1967ProxyUnsafe` mock) to `ITRC1967` / `TRC1967Proxy` / `TRC1967Utils` / `proxy/TRC1967/`, updating all imports and references.
- TRC-1967 (TIP-1967, https://github.com/tronprotocol/tips/blob/master/tip-1967.md) standardises the same implementation/admin/beacon storage slots as EIP-1967 — naming-only port. The slot constants and their `eip1967.proxy.*` derivation strings are unchanged.
