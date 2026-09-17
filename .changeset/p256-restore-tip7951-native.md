---
'openzeppelin-tron-solidity': minor
---

`P256`: Restore the native secp256r1 precompile path for TIP-7951, matching upstream. `verify` now tries the precompile at `address(0x100)` and falls back to `verifySolidity` on networks that have not activated it (`ALLOW_TVM_OSAKA`). Callers (`WebAuthn`, `TRC7913P256Verifier`, `SignerP256`) are unchanged.
