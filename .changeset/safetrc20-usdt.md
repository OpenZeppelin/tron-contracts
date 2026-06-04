---
'openzeppelin-tron-solidity': minor
---

Add `SafeTRC20.safeTransferUSDT`.

TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) returns `false` from `transfer` even on a successful transfer (while reverting on failure), which `safeTransfer` incorrectly reads as a failure — its relaxed return-value check only tolerates an *empty* return, not a `false` one. `safeTransferUSDT` performs the transfer and verifies success by the recipient's balance increasing by `value`, ignoring the unreliable boolean. It needs no hardcoded token address and mutates no allowance state.

Only `transfer` is affected: USDT's `transferFrom` and `approve` return `true` normally (verified on mainnet), so `safeTransferFrom` works as-is and needs no variant.
