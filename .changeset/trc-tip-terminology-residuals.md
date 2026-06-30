---
'openzeppelin-tron-solidity': patch
---

Complete the TRX/TRC terminology localization for residual references.

Localize residual Ethereum-standard mentions in NatSpec to the TRON
convention for standards TRON has republished: `TRC-165`, `TRC-1967`,
`TRC-1271` (bare inline mentions) and `TIP-721` (linked citation). Native
currency terms in `VestingWallet` and the `TRC20.decimals` docstring now use
TRX. References to standards TRON has not republished as a TIP (e.g. ERC-1167,
ERC-1822, ERC-6372, ERC-3156, ERC-2981, ERC-777) keep citing the real ERC.

Rename the `VestingWallet` native-currency event `EtherReleased` to
`TRXReleased` for consistency with `TRC20Released`. This changes the emitted
log topic; off-chain consumers must update to the new event name.

Also add a note explaining the retained `draft-IERC6093.sol` filename.
