---
'openzeppelin-tron-solidity': patch
---

Correct TVM-inaccurate documentation surfaced by a security audit.

- Governance guide and the `MyGovernor` example assumed Ethereum's ~12s block
  time, labeling `votingDelay = 7200` / `votingPeriod = 50400` blocks as "1 day" /
  "1 week". With the default block-number clock and TRON's ~3s blocks those are
  ~6h / ~1.75 days. Updated the prose and the example to TRON-correct counts
  (28800 / 201600) so integrators don't ship voting windows ~4x shorter than intended.
- P256 utilities docs still described `verify` as trying the RIP-7212 `0x100`
  precompile with a Solidity fallback and gave an example calling `verifyNative`,
  which the port removed. The section now states `verify` runs entirely in Solidity
  on the TVM and the `verifyNative` example is dropped.
- `Blockhash` docs/changeset claimed "TVM does not implement EIP-2935"; TIP-2935
  specifies the same mechanism at the identical canonical address (not yet active on
  mainnet). Reworded to "not yet active on TRON mainnet".
- README NOTE said `SafeTRC20.safeTransferUSDT` verifies "the recipient's balance
  delta"; it verifies the calling contract's (sender's) debit, matching the
  function's own NatSpec. Corrected the wording.

Documentation and illustrative-example only — no library behavior change.
