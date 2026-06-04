---
'openzeppelin-tron-solidity': patch
---

Reference TIP-191 in `MessageHashUtils`.

`MessageHashUtils` produces ERC-191 / EIP-712 signed-data digests; its NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-191.md[TIP-191] (the TRON-side analogue of ERC-191, with the same `0x19`-prefixed version-byte format) alongside ERC-191. Documentation only — no behavior change.
