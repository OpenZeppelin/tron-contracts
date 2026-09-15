---
'openzeppelin-tron-solidity': patch
---

`MultiSignerTRC7913`: Decode the multisignature payload directly from calldata and return `false` on malformed encoding instead of reverting during `abi.decode`. The `_validateSignatures` and `_validateThreshold` override parameters change from `bytes[] memory` to `bytes[] calldata`.
