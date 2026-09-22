---
'openzeppelin-tron-solidity': minor
---

`BridgeNonFungible` and `BridgeTRC721`: Add bridge contracts to handle crosschain movements of TRC-721 tokens. Unlike the upstream `BridgeERC721`, a received recipient that is not exactly 20 bytes is rejected with `CrosschainNonFungibleInvalidRecipient`: TVM addresses carry an extra leading `0x41` byte, so a non-stripped 21-byte recipient must be rejected rather than silently truncated by `bytes20` into a wrong address.
