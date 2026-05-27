---
'openzeppelin-tron-solidity': patch
---

Make VestingWallet tests robust to TRE's no-clock-rollback snapshot/revert.

- `VestingWallet.test.js` and `VestingWalletCliff.test.js` no longer
  pull `loadFixture` from `@nomicfoundation/hardhat-network-helpers`.
  TRE's `tre_revert` intentionally skips the chain clock when
  rolling state, so the cached `start = block.timestamp + 1h`
  captured during the first fixture run is in the past by the
  second call, and `time.increaseTo(schedule[0])` rejects the move
  as backwards. The replacement `loadFixture` runs the fixture
  fresh each time so `start` is computed against the live clock,
  and calls `refundSigners` so the value-bearing fixture
  (`sender.sendTransaction({to: mock, value: amount})`) does not
  drain the deployer balance across the 60+ schedule points.
- Reduce the test amount from 100 ETH-equivalent to 1
  ETH-equivalent. With the bridge's 1-wei == 1-sun pass-through,
  `parseEther('100')` would land at 1e20 sun and overflow TVM's
  account-balance `Long.MAX_VALUE` (~9.22e18 sun). Vesting
  schedule and release assertions are amount-relative, so the
  smaller magnitude preserves every semantic check.
- Pass explicit `data: '0x'` on the value-only seeding send — the
  bridge rejects an undefined `data` field on plain transfers.

`contracts/finance/VestingWallet.sol` already references the
`TRC20` / `ITRC20` / `SafeTRC20` family from the TRC20 port; no
contract changes are needed here.
