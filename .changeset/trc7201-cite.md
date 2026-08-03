---
'openzeppelin-tron-solidity': patch
---

Reference TIP-7201 in `Initializable` and `SlotDerivation`.

The namespaced-storage NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-7201.md[TIP-7201] (the TRON-side analogue of ERC-7201). The `erc7201:` storage-location tags are left unchanged — they are recognized verbatim by tooling and the derived slots are identical. Documentation only — no behavior change.
