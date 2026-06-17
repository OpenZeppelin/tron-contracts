---
'openzeppelin-tron-solidity': major
---

Port the remaining ERC names to TRC (same-number convention).

- Rename the `ERC`/`IERC` prefix to `TRC`/`ITRC` (keeping the standard number) for every standard that still carried Ethereum naming, updating all imports, `supportsInterface` overrides, file paths, OpenZeppelin header-comment paths and tests across the token, crosschain, governance, cryptography and interface layers. Standards ported: TRC-777, TRC-1363, TRC-1820, TRC-1822, TRC-2309, TRC-2981, TRC-3156, TRC-4906, TRC-5267, TRC-5313, TRC-5805, TRC-6372, TRC-6909, TRC-7579, TRC-7674, TRC-7739, TRC-7751, TRC-7786, TRC-7802 and TRC-7913.
- For consistency the bridge helpers `BridgeERC20`/`BridgeERC7802` become `BridgeTRC20`/`BridgeTRC7802`, the `GovernorERC721` test file is renamed to `GovernorTRC721` (its body was already TRC-named), and the two leftover `ERC2612ExpiredSignature`/`ERC2612InvalidSigner` errors from the TRC-2612 port are renamed to their `TRC2612` form.
- These are naming-only ports: each TRC-NNN (TIP-NNN) is functionally identical to its EIP-NNN counterpart, so interface ids and behaviour are unchanged. On-chain magic values are deliberately left as-is for wire compatibility, e.g. `keccak256("ERC3156FlashBorrower.onFlashLoan")` in the TRC-3156 flash-loan flow and ERC-1820's `updateERC165Cache` / `implementsERC165Interface` ABI on `ITRC1820Registry`. EIP/ERC spec citations in comments are likewise preserved.
