---
'openzeppelin-tron-solidity': patch
---

`CrosschainLinked`: Parse the counterpart chain from calldata in `_isAuthorizedGateway`, avoiding an unnecessary memory copy of `sender`.
