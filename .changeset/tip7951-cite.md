---
'openzeppelin-tron-solidity': patch
---

Reference TIP-7951 in `P256`.

`P256`'s NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-7951.md[TIP-7951], which specifies a native secp256r1 precompile for the TVM at `0x100` (following EIP-7951, superseding RIP-7212). The library continues to verify in pure Solidity until the precompile is enabled on the target network. Documentation only — no behavior change.
