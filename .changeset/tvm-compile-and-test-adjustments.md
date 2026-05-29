---
'openzeppelin-tron-solidity': patch
---

TVM compile-pipeline + runtime fixes and test adjustments.

Compile / runtime

- `tron-batches.config.cjs` batch 05 now scans `contracts/token/TRC721` and
  `contracts/token/TRC1155` (was the stale `ERC721`/`ERC1155` paths left over
  from the token rename). Without this the NFT contracts and their
  hardhat-exposed `$`-wrappers never compiled, surfacing as
  `Artifact for contract "$TRC721"/"$TRC1155" not found` across the suite.
- hardhat-exposed is gated behind `SKIP_EXPOSED`, its `outDir` moved to
  `contracts/exposed`, the tron compiler `target` set to
  `tron-when-network-tron`, and an `exposed:regen` script added; the generated
  tree is gitignored (regenerated, not committed).
- Add `.npmrc` `install-links=true` so the `file:` `@openzeppelin/hardhat-tron`
  dependency is copied (no nested `node_modules`) instead of symlinked. The
  symlinked copy resolved its own `chai`, so the plugin registered its
  TVM-aware `changeTokenBalance` / `changeEtherBalance` matchers on a different
  chai instance than the tests used — every balance-change assertion then fell
  through to upstream's matcher and crashed with
  `eth_getBlockByHash -> java.lang.NullPointerException`.
- Mocha timeout raised to 600s (TVM deploys are slow), solc `metadata` pinned,
  `warnings.default` relaxed to `warn` (tron-solc treats `chain` as a builtin
  symbol), `defaultNetwork: tre`, `.env` loading; pin
  `tronweb`/`mocha`/`solc`/`dotenv`.

Test helpers (TVM-aware)

- `account` default balance kept within TVM's `Long.MAX_VALUE` bound;
  `governance` `delegate()` awaited sequentially (TRE is single-witness);
  `txpool` `batchInBlock` made dual-mode — EVM path (`evm_setAutomine`) for the
  anvil-backed TrieProof test, TVM path (`tre_blockTime`/`tre_mine`) otherwise;
  add UserOperation EIP-712 types and an `erc4337` helper.

Skips for TVM/EVM divergences

- Skip TrieProof (needs un-bridged anvil ethers + EVM trie roots), the Blockhash
  future-block case (TVM `BLOCKHASH` returns non-zero for future blocks), the
  sanity snapshot block-rollback assertion (TVM block number is monotonic
  through `tre_revert`), and the TRC20Votes one-checkpoint-per-block test (TRE
  cannot stage N transactions into one block — this test also fails in the
  reference spike). Re-enable 4 `RelayedCall` tests that were over-skipped; they
  pass on TVM.

Also add `scripts/mocha-file-timings-reporter.js` (parallel-bucket weighting)
and `scripts/compare-bytecode.js`.
