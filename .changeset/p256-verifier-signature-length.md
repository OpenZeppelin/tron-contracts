---
'openzeppelin-tron-solidity': patch
---

Accept 0x41-byte signatures in `TRC7913P256Verifier`.

`TRC7913P256Verifier.verify` required signatures to be exactly `0x40` bytes,
rejecting a `0x41`-byte signature that carries a trailing recovery byte. This
diverged from upstream OZ ERC-7913 (which uses `signature.length >= 0x40`) and
from the port's own `SignerP256` (which reads only the first `0x40` bytes), so
a valid secp256r1 signature accepted by one P256 path was rejected by the
other.

Relax the check to `signature.length >= 0x40`. Only `r || s` (the first `0x40`
bytes) is read, and malleability is already prevented by `P256.verify`'s low-s
check, so the trailing byte cannot change the verification result — the strict
length was an interop regression with no security benefit.
