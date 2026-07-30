---
'openzeppelin-tron-solidity': minor
---

Add `SafeTRC20.safeTransferChecked`, the recommended default for outbound transfers on TRON.

TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) returns `false` from `transfer` even on a successful transfer (while reverting on failure), which `safeTransfer` incorrectly reads as a failure — its relaxed return-value check only tolerates an *empty* return, not a `false` one. `safeTransferChecked` performs the transfer and verifies success by the calling contract's balance decreasing by at least `value`, ignoring the unreliable boolean. It needs no hardcoded token address and mutates no allowance state.

Verifying the caller's debit (rather than the recipient's credit) keeps the check correct for fee-on-transfer tokens whether the fee is borne by the recipient (net debit `== value`) or added on top (net debit `> value`): the caller is always debited at least `value` while only the recipient may receive less. Success therefore means the calling contract was debited at least `value`, not that `to` received `value`. It is NOT correct for rebasing or reflection tokens that can *increase* the caller's balance during the transfer, which can push the net debit below `value` (spurious revert) or above it (underflow panic); such tokens must not be paid out through this helper.

Only `transfer` is affected: USDT's `transferFrom` and `approve` return `true` normally (verified on mainnet), so `safeTransferFrom` works as-is and needs no variant.
