---
'openzeppelin-tron-solidity': patch
---

`BridgeFungible`: Reject an empty recipient on the send path of `_crosschainTransfer` with `BridgeInvalidRecipient`, rather than forwarding a chain-only interoperable address to the counterpart.
