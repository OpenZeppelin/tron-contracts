---
'openzeppelin-tron-solidity': minor
---

`TRC2771Forwarder`: Revert the whole batch with `TRC2771ForwarderNoRefundReceiver` when a request is invalid or a value-bearing call fails and no `refundReceiver` is set, instead of consuming the nonce and refunding the leftover value to `address(0)`.
