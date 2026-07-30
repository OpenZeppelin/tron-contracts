---
'openzeppelin-tron-solidity': patch
---

Fix `BridgeTRC20` release path for false-on-success tokens (e.g. TRON USDT).

`BridgeTRC20._onReceive` released custody with `SafeTRC20.safeTransfer`,
which reverts for tokens such as TRON USDT
(`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) whose `transfer` returns `false` on a
*successful* transfer. Because locking (`_onSend` -> `safeTransferFrom`) keeps
working for USDT (its `transferFrom` returns `true`), the asymmetry let
deposits through while permanently trapping every withdrawal in the bridge.

`_onReceive` now uses `SafeTRC20.safeTransferChecked`, which verifies success
via the caller's balance delta and works whether the token returns `true`,
`false`, or nothing. This custodial bridge still assumes a token that is
neither rebasing nor fee-on-transfer, which it requires for release accounting
regardless of the transfer helper.
