---
'openzeppelin-tron-solidity': patch
---

`TRC4626`, `VestingWallet`, `TRC20Wrapper`: Pay the underlying out with `SafeTRC20.safeTransferChecked` instead of `safeTransfer`, so a token that returns `false` from a successful `transfer` (TRON USDT) can be withdrawn rather than trapped.
