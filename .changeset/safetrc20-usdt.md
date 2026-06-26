---
'openzeppelin-tron-solidity': minor
---

Add `SafeTRC20.safeTransferUSDT`.

TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) returns `false` from `transfer` even on a successful transfer (while reverting on failure), which `safeTransfer` incorrectly reads as a failure — its relaxed return-value check only tolerates an *empty* return, not a `false` one. `safeTransferUSDT` performs the transfer and verifies success by the calling contract's balance decreasing by `value`, ignoring the unreliable boolean. It needs no hardcoded token address and mutates no allowance state.

Verifying the sender's debit (rather than the recipient's credit) keeps the check correct even if USDT's transfer fee is ever enabled: the sender is always debited the full `value` while only the recipient would receive less. Success therefore means the calling contract was debited `value`, not that `to` received `value`; with a fee-on-transfer token the recipient gets less than `value` and the transfer is still treated as successful.

Only `transfer` is affected: USDT's `transferFrom` and `approve` return `true` normally (verified on mainnet), so `safeTransferFrom` works as-is and needs no variant.
