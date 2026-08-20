---
'openzeppelin-tron-solidity': minor
---

Use the TRON personal-sign prefix in `MessageHashUtils`.

- Rename `MessageHashUtils.toEthSignedMessageHash` to `toTronSignedMessageHash` (both the `bytes32` and `bytes` overloads) and switch the hard-coded ERC-191 prefix `"\x19Ethereum Signed Message:\n"` to the TRON one, `"\x19TRON Signed Message:\n"`. This matches the digest produced by native TRON wallet tooling (TronWeb `signMessage` / `signMessageV2`, TronLink) per TIP-191, so signatures from those tools now verify against `ECDSA.recover`. Previously the library used the Ethereum prefix, which only native TRON signers would not match.
- This is a behavioral, consensus-critical change: the digest bytes differ, so any signature flow relying on the old Ethereum-prefixed digest must be regenerated against the TRON prefix.
- The leading version byte is intentionally kept as `0x19` (not `0x15`) to match the prefix TronWeb and TronLink emit in practice, even though `0x15` is the byte-length of `"TRON Signed Message:\n"`.
- The other digests in the library (`toDataWithIntendedValidatorHash`, `toTypedDataHash`, the EIP-712 domain helpers) are unchanged.
