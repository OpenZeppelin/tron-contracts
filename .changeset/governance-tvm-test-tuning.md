---
'openzeppelin-tron-solidity': patch
---

Adapt governance tests to TVM transaction-shape semantics.

- Pass explicit `data: '0x'` on the value-only `sendTransaction`
  calls that seed Governor / TimelockController fixtures and probe
  the disabled-deposit path. The bridge rejects an undefined `data`
  field on plain transfers.
- Loosen the `mockFunctionOutOfGas` revert assertion in
  `TimelockController.test.js` from
  `revertedWithCustomError('FailedCall')` to `.to.be.reverted`. The
  inner call burns the full energy budget; TVM does not propagate
  the `FailedCall` custom-error payload through the OOG bubble, so
  the assertion's error-shape introspection is dropped while the
  bubbles-up-as-revert check is preserved.
- Work around the CompTimelock ↔ Governor cyclic constructor in
  `GovernorTimelockCompound.test.js`. EVM breaks the cycle by
  predicting the governor's CREATE address from the deployer's
  next nonce; TVM CREATE addresses derive from
  `keccak256(txID || ownerAddress)[12:]`, which depends on the
  governor-deploy tx's own raw_data and cannot be predicted ahead
  of broadcast. Deploy `CompTimelock` with a placeholder admin,
  deploy the governor against the real timelock, then rewrite
  `CompTimelock.admin` (slot 0) via `setStorageAt` to the
  governor's real address.

The governance contracts themselves already reference the
`TRC20Votes` / `TRC721Holder` / `TRC1155Holder` families from
prior token-port PRs; no contract changes are needed.
