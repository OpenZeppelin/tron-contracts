---
'openzeppelin-tron-solidity': patch
---

Reject non-20-byte crosschain recipients in `BridgeFungible`, and document the address-in-`bytes` encoding rule.

On the TVM, addresses embedded inside a `bytes` payload must use the 20-byte EVM
form; the 21-byte `0x41`-prefixed / Base58Check representations that TRON tooling
(TronWeb, node APIs) surfaces are off-chain encodings only. `BridgeFungible._processMessage`
decoded the recipient as a raw `bytes` field and did `address(bytes20(toBinary))`, which
would silently truncate a mistakenly 21-byte recipient to a different address and release
custody to the wrong party. It now reverts `BridgeInvalidRecipient` when the recipient is
not exactly 20 bytes, matching the fail-fast the self-describing `InteroperableAddress.parseEvmV1`
already performs. The README "TVM differences" section documents the invariant for integrators.
