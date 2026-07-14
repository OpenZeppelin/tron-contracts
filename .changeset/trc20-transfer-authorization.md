---
'openzeppelin-tron-solidity': minor
---

`TRC20TransferAuthorization`: Add a TRC-20 extension implementing ERC-3009's transfer with authorization using parallel nonces.

Ports `ERC20TransferAuthorization` and `draft-ERC3009` from OpenZeppelin
Contracts (OpenZeppelin/openzeppelin-contracts#6354) with the usual TRON
adaptations: TRC/TIP naming (`TRC3009`, `ITRC3009`, `ITRC3009Cancel`,
`TRC20TransferAuthorization`), `TIP712` domain separation instead of
`EIP712`, TRC-1271 signature support in the bytes-signature variants, and a
locally defined `BLOCK_RANGE_FLAG` (this repository does not ship the
account-abstraction utilities the upstream implementation imports it from).
