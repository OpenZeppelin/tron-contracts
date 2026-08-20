---
'openzeppelin-tron-solidity': minor
---

Port ERC20 to TRC20.

- Move `contracts/token/ERC20/` → `contracts/token/TRC20/`. Renames `ERC20`/`IERC20`/`IERC20Metadata`/`IERC20Permit`/`SafeERC20`/all ERC20-prefixed extensions and their tests to the `TRC20` / `ITRC20` / `SafeTRC20` family.
- `ERC4626` → `TRC4626` (both the implementation and the `IERC4626`/`ITRC4626` interface).
- In `contracts/interfaces/draft-IERC6093.sol`, rename only the `IERC20Errors` interface and its `ERC20*` errors to `ITRC20Errors` and `TRC20*`. `IERC721Errors` and `IERC1155Errors` are unchanged.
- `ERC1363`, `ERC1363Utils`, and `BridgeERC20` keep their names; their internals are migrated to reference `TRC20`/`ITRC20`/`SafeTRC20`.
- TIP-20 (https://github.com/tronprotocol/tips/blob/master/tip-20.md) is functionally identical to EIP-20, so this is a naming-only port; no behavior changes.
