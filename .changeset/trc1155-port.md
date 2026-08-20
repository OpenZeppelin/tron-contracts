---
'openzeppelin-tron-solidity': minor
---

Port ERC1155 to TRC1155.

- Move `contracts/token/ERC1155/` → `contracts/token/TRC1155/` (and the
  `test/token/` mirror). Rename `ERC1155`, `IERC1155`, `IERC1155Receiver`,
  `IERC1155MetadataURI`, all extensions (`Burnable`/`Pausable`/`Supply`/`URIStorage`),
  and `Holder`/`Utils` to the `TRC1155` / `ITRC1155` family.
- `contracts/interfaces/IERC1155*.sol` → `ITRC1155*.sol` (3 alias files).
- `draft-IERC6093.sol`: only the `IERC1155Errors` interface block is
  renamed to `ITRC1155Errors` with `TRC1155*` error names. `IERC20Errors`
  and `IERC721Errors` are unchanged.
- Mocks: `ERC1155ReceiverMock.sol` → `TRC1155ReceiverMock.sol`. Under
  `contracts/mocks/docs/token/`, `ERC1155/` → `TRC1155/`, and the
  pre-existing upstream typo `MyERC115HolderContract.sol` is fixed to
  `MyTRC1155HolderContract.sol`.
- Docs page `erc1155.adoc` → `trc1155.adoc`. README and guide cite TIP-1155
  with EIP-1155 noted as the ETH analogue.
- Downstream consumers updated: `TimelockController`, `Governor`,
  `ERC2771Forwarder` natspec, `ERC6909ContentURI`, `Stateless` mock.
- TIP-1155 is functionally identical to EIP-1155 — **including the
  receiver hook function names**. `onERC1155Received` (selector
  `0xf23a6e61`) and `onERC1155BatchReceived` (selector `0xbc197c81`) are
  kept verbatim per the TIP-1155 spec; only the receiver *interface name*
  changes (`IERC1155Receiver` → `ITRC1155Receiver`). This is different
  from TIP-721, which renames the receiver hook to `onTRC721Received`.
