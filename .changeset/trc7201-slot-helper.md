---
'openzeppelin-tron-solidity': major
---

Rename `SlotDerivation.erc7201Slot` to `trc7201Slot`.

Aligns the namespaced-storage helper's name with the port's TRON naming
convention and with TIP-7201 (the TRON-side analogue of ERC-7201). This is a
pure identifier rename: the slot-derivation formula
(`keccak256(keccak256(id) - 1) & ~0xff`) and every derived slot value are
unchanged, and the `@custom:storage-location erc7201:` annotation prefix — which
upgrade-safety tooling recognizes verbatim — is intentionally left untouched.

Callers using `using SlotDerivation for string` must update `.erc7201Slot()` to
`.trc7201Slot()`.
