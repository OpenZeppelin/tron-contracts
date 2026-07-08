---
'openzeppelin-tron-solidity': patch
---

Fix frozen withdrawals for false-on-success tokens (e.g. TRON USDT) in `TRC4626`, `TRC20Wrapper` and `VestingWallet`.

TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) performs the transfer but returns `false` from a *successful* `transfer`, while its `transferFrom` correctly returns `true`. `SafeTRC20.safeTransfer` treats that `false` as a failure and reverts, so on the out (send) path — but not the in (`transferFrom`) path — the following silently break for any deployment whose asset/underlying/vested token is such a token:

- `TRC4626._transferOut` → every `withdraw`/`redeem` reverts, permanently freezing the vault's assets.
- `TRC20Wrapper.withdrawTo` → the wrapped underlying can never be unwrapped.
- `VestingWallet.release(address token)` → vested tokens can never be released.

All three now use `SafeTRC20.safeTransferUSDT`, which ignores the unreliable boolean and verifies success by the sender's balance debit (correct whether the token returns `true`, `false`, or nothing). The in paths (`safeTransferFrom`) are unchanged because USDT's `transferFrom` already returns `true`. This mirrors the earlier `BridgeTRC20._onReceive` fix.
