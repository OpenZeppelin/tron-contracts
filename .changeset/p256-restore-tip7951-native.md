---
'openzeppelin-tron-solidity': minor
---

Restore the native precompile path in `P256` for TIP-7951.

The TVM now ships a secp256r1 precompile at `address(0x100)`, specified by
TIP-7951 (chain parameter 96, `ALLOW_TVM_OSAKA`). It follows EIP-7951, which
keeps the RIP-7212 call interface. It is active on Nile (java-tron
GreatVoyage-v4.8.2) and pending the mainnet vote.

Per the TRON team's preference, the library keeps the upstream
`openzeppelin-contracts` structure byte-for-byte (except TRON-specific
NatSpec): `verify(...)` tries the precompile first and falls back to
`verifySolidity(...)` on networks that have not activated it, and
`verifyNative` and `_tryVerifyNative` return. Callers (`WebAuthn`,
`TRC7913P256Verifier`, `SignerP256`) keep using `verify(...)` unchanged and
get the cheap native verification automatically once a network activates the
precompile (~7.8k energy per verification instead of ~355k).

Tests probe for the precompile at runtime and skip the native assertions when
it is absent. The TRE runner activates `ALLOW_TVM_OSAKA` on each worker chain
with an on-chain committee proposal (`scripts/tre-activate-osaka.js`), which
requires a java-tron 4.8.2 based TRE image; on older images the activation
fails with a warning and the native tests stay pending. The
`MissingPrecompile` revert is covered by the restored Foundry test.
