---
'openzeppelin-tron-solidity': patch
---

`BridgeFungible`: Reject a received crosschain recipient that is not exactly 20 bytes with `BridgeInvalidRecipient`, rather than letting `bytes20` truncate it into an unrelated address.
