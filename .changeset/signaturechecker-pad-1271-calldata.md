---
'openzeppelin-tron-solidity': patch
---

`SignatureChecker`: Zero-pad the TRC-1271 signature calldata to a 32-byte boundary when performing the TRC-1271 static call, so the encoded `bytes` argument conforms to the ABI spec.
