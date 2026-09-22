---
'openzeppelin-tron-solidity': minor
---

`BridgeMultiToken` and `BridgeTRC1155`: Add bridge contracts to handle crosschain movements of TRC-1155 tokens. Unlike the upstream `BridgeERC1155`, a received recipient that is not exactly 20 bytes is rejected with `CrosschainMultiTokenInvalidRecipient`: TVM addresses carry an extra leading `0x41` byte, so a non-stripped 21-byte recipient must be rejected rather than silently truncated by `bytes20` into a wrong address.
