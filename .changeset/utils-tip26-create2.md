---
'openzeppelin-tron-solidity': patch
---

Align utility CREATE2 helpers with TIP-26 and tune utility tests for TVM.


- Utility tests aligned with TVM behaviour:
  - `Address`, `Create2`, `LowLevelCall` — pass explicit `data: '0x'`
    on empty value-only sends (the bridge rejects undefined `data`)
    and loosen revert assertions whose custom-error payload doesn't
    survive TVM's energy-burn-on-OOG / collision path.
  - `RelayedCall` — skip the relayer-execution sub-suites. TVM's
    transaction-routing layer rejects external calls to contracts
    deployed via raw `create2` with hand-crafted bytecode (no
    metadata, no contractStore entry). The CREATE2 deployment itself
    still works, but the call shape these tests probe never runs.
  - `RLP` — resolve nested promise arguments explicitly before
    passing them through `$encode_list`; the bridge's plain JS Proxy
    doesn't implicitly await like ethers' `Contract` proxy does.
  - `SignatureChecker` — skip `isValidERC1271SignatureNow` cases
    that rely on the identity precompile while the locally bundled
    `tronbox/tre` image OOMs on the staticcall path. Mainnet
    java-tron registers Identity at 0x04 and behaves like EVM.
  - `ERC165Checker` — skip the return-bomb assertion that reads
    `gasUsed` via a sub-method the bridge's invoke proxy doesn't
    surface. The contract-side defence itself is exercised by every
    other `supportsInterface` test in the file.
  - `MerkleTree` — batch independent view reads with `Promise.all`
    to amortise per-call HTTP RTT, serialize the fill loop
    (`Promise.all` → `for`) to avoid confusing the unconfirmed-tx
    poll path, and loosen the full-tree revert to `.to.be.reverted`
    since the panic selector (0x41) doesn't always propagate
    through TVM's revert-data field.
