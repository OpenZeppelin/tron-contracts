---
'openzeppelin-tron-solidity': patch
---

`BridgeFungible`: Reject an interoperable address whose address part is empty in `_crosschainTransfer` with `CrosschainFungibleEmptyAddress`, rather than forwarding it to the counterpart.
