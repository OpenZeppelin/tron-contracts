---
'openzeppelin-tron-solidity': minor
---

Port ERC721 to TRC721.

- Move `contracts/token/ERC721/` → `contracts/token/TRC721/` (and the
  `test/token/` mirror). Rename `ERC721`, `IERC721`, `IERC721Receiver`,
  `IERC721Enumerable`, `IERC721Metadata`, all extensions
  (`Burnable`/`Consecutive`/`Enumerable`/`Pausable`/`Royalty`/`URIStorage`/`Votes`/`Wrapper`),
  and the `Holder`/`Utils` utils to the `TRC721` / `ITRC721` family.
- In `contracts/interfaces/draft-IERC6093.sol`, rename only the
  `IERC721Errors` interface and its `ERC721*` errors to `ITRC721Errors`
  and `TRC721*`. `IERC20Errors` and `IERC1155Errors` are unchanged.
- Spec attribution: TRC-721 references link to TIP-721 (the TRON-side
  analogue of EIP-721). ERC-2309 (consecutive), ERC-2981 (royalty),
  ERC-4906 (metadata update), and the standalone `ERC2981` royalty
  implementation keep their names — no TIP equivalent exists.
- TIP-721 is functionally identical to EIP-721 except in one place: the
  receiver hook is `onTRC721Received` (selector `0x5175f878`) rather than
  `onERC721Received` (`0x150b7a02`). Our implementation follows TIP-721
  exactly; the selector is computed dynamically from the renamed function
  name, so the magic value used to confirm `safeTransfer` is the TIP-721
  one. Contracts that need to accept both TRC-721 and ERC-721 tokens will
  need to implement both hooks.
