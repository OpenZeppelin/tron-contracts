---
'openzeppelin-tron-solidity': patch
---

Fix `TRC20FlashMint` flash-loan callback magic value to match TIP-3156.

TIP-3156 (unlike TIP-712/1155/2612, which deliberately keep the Ethereum
string) renames the callback success value: the lender MUST verify that
`onFlashLoan` returns `keccak256("TRC3156FlashBorrower.onFlashLoan")`, not the
Ethereum `keccak256("ERC3156FlashBorrower.onFlashLoan")`. `TRC20FlashMint`
hardcoded the `ERC` preimage as its expected `RETURN_VALUE`, and the
`TRC3156FlashBorrowerMock` returned the same wrong value — so the port's lender
and its own borrower agreed with each other and the divergence passed CI.

The consequence was a cross-implementation interoperability break on TRON: a
TIP-3156-conformant borrower (returning the `TRC` hash) was rejected with
`TRC3156InvalidReceiver` and the loan reverted, and borrowers written against
this library were rejected by any spec-conformant lender. `RETURN_VALUE`, the
mock, and the `ITRC3156FlashBorrower.onFlashLoan` NatSpec now use the
TIP-mandated `"TRC3156FlashBorrower.onFlashLoan"` preimage. Because the
constant is derived from a hardcoded string literal (not a `.selector`), it
does not track the `ERC` -> `TRC` interface rename automatically and had to be
fixed explicitly.
