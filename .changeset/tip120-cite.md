---
'openzeppelin-tron-solidity': patch
---

Reference TIP-120 in `ECDSA`.

`ECDSA`'s NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-120.md[TIP-120], TRON's ECDSA signature-encoding specification (the `(r, s, v)` layout with `v` in `{27, 28}` that this library produces and accepts). Documentation only — no behavior change.
