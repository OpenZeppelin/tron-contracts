---
'openzeppelin-tron-solidity': patch
---

Route custody payouts through `SafeTRC20.safeTransferChecked` so they work with false-on-success tokens (e.g. TRON USDT).

`TRC4626` (`_transferOut`, used by `withdraw`/`redeem`), `VestingWallet.release(address)`, and `TRC20Wrapper.withdrawTo` paid the underlying out with `SafeTRC20.safeTransfer`, which reverts for tokens such as TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) whose `transfer` returns `false` on a *successful* transfer. Because the inbound leg uses `safeTransferFrom` (USDT returns `true`), deposits/funding succeeded while every withdrawal, release, or unwrap reverted — permanently trapping the assets. Each now uses `safeTransferChecked`, which verifies success by the caller's balance delta.

`TRC4626._transferOut` is `internal virtual`, and `VestingWallet.release`/`TRC20Wrapper.withdrawTo` are `public virtual`, so any integrator that wants the strict return-value semantics of `safeTransfer` can still override.
