---
'openzeppelin-tron-solidity': patch
---

Drop the RIP-7212 native path from `P256` (no precompile on TVM).

TRON-TVM does not ship the RIP-7212 secp256r1 precompile at `address(0x100)`,
so the native fast-path can never succeed there. Remove `verifyNative`,
`_tryVerifyNative`, `_rip7212` and the `Errors` import from
`contracts/utils/cryptography/P256.sol`; `verify(...)` now delegates straight to
`verifySolidity(...)`. Callers (`WebAuthn`, `ERC7913P256Verifier`, `SignerP256`)
keep using `verify(...)` unchanged.

`P256.test.js` is updated to exercise `$verifySolidity` (the `$verify` /
`$verifyNative` exposed wrappers no longer exist) and batches the wycheproof
vectors through a single concurrent `it()` to keep wall time reasonable on TRE
while preserving every per-vector assertion.
