# openzeppelin-tron-solidity


## 5.6.0-rc.0 (2026-08-20)

- `AccessManager`: treat `setAuthority` differently in `canCall` to prevent bypassing the `updateAuthority` security using an `execute`. ([#120](https://github.com/OpenZeppelin/tron-contracts/pull/120))
- `AccessManager`: Allow a role admin to cancel grant and revoke operations. ([#141](https://github.com/OpenZeppelin/tron-contracts/pull/141))
- `Governor`: Strict enforcement of the expected proposal state depending on `proposalNeedsQueuing` when calling `execute`. ([#119](https://github.com/OpenZeppelin/tron-contracts/pull/119))
- `Governor`: Revert with `GovernorProposalQueueingNotRequired` when `queue` is called on a proposal that does not require queueing, preventing it from being pushed into a `Queued` state that `execute` would then reject. Replaces the `GovernorQueueNotImplemented` error with `GovernorProposalQueueingNotRequired` and `GovernorProposalQueueingFailed`. ([#119](https://github.com/OpenZeppelin/tron-contracts/pull/119))
- Add `SafeTRC20.safeTransferChecked`, the recommended default for outbound transfers on TRON. ([#88](https://github.com/OpenZeppelin/tron-contracts/pull/88))

  TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) returns `false` from `transfer` even on a successful transfer (while reverting on failure), which `safeTransfer` incorrectly reads as a failure — its relaxed return-value check only tolerates an _empty_ return, not a `false` one. `safeTransferChecked` performs the transfer and verifies success by the calling contract's balance decreasing by at least `value`, ignoring the unreliable boolean. It needs no hardcoded token address and mutates no allowance state.

  Verifying the caller's debit (rather than the recipient's credit) keeps the check correct for fee-on-transfer tokens whether the fee is borne by the recipient (net debit `== value`) or added on top (net debit `> value`): the caller is always debited at least `value` while only the recipient may receive less. Success therefore means the calling contract was debited at least `value`, not that `to` received `value`. It is NOT correct for rebasing or reflection tokens that can _increase_ the caller's balance during the transfer, which can push the net debit below `value` (spurious revert) or above it (underflow panic); such tokens must not be paid out through this helper.

  Only `transfer` is affected: USDT's `transferFrom` and `approve` return `true` normally (verified on mainnet), so `safeTransferFrom` works as-is and needs no variant.

- Port EIP-712 to TIP-712. ([#86](https://github.com/OpenZeppelin/tron-contracts/pull/86))

  - Rename the `EIP712` contract to `TIP712` (file, `EIP712Verifier` mock, internal `_TIP712Name`/`_TIP712Version` getters), updating all inheritors and references (`Governor`, `Votes`, `TRC20Permit`, `TRC2771Forwarder`, `ERC7739`).
  - Compute the domain separator's `chainId` as `block.chainid & 0xffffffff`, as required by TIP-712 (https://github.com/tronprotocol/tips/blob/master/tip-712.md). This is the low four bytes — the value TRON exposes through `eth_chainId` and that off-chain TIP-712 signers use. It is a no-op where the TVM `CHAINID` opcode already returns four bytes, and makes the on-chain digest match off-chain signatures even where it returns the full genesis hash.
  - The `EIP712Domain` type hash and the ERC-5267 `eip712Domain()` interface are unchanged (TIP-712 reuses them); TIP-712's `0x41` address-prefix and `trcToken` deltas concern off-chain encoders and application structs, not this base contract.

- Port the remaining ERC names to TRC (same-number convention). ([#97](https://github.com/OpenZeppelin/tron-contracts/pull/97))

  - Rename the `ERC`/`IERC` prefix to `TRC`/`ITRC` (keeping the standard number) for every standard that still carried Ethereum naming, updating all imports, `supportsInterface` overrides, file paths, OpenZeppelin header-comment paths and tests across the token, crosschain, governance, cryptography and interface layers. Standards ported: TRC-777, TRC-1363, TRC-1820, TRC-1822, TRC-2309, TRC-2981, TRC-3156, TRC-4906, TRC-5267, TRC-5313, TRC-5805, TRC-6372, TRC-6909, TRC-7579, TRC-7674, TRC-7739, TRC-7751, TRC-7786, TRC-7802 and TRC-7913.
  - For consistency the bridge helpers `BridgeERC20`/`BridgeERC7802` become `BridgeTRC20`/`BridgeTRC7802`, the `GovernorERC721` test file is renamed to `GovernorTRC721` (its body was already TRC-named), and the two leftover `ERC2612ExpiredSignature`/`ERC2612InvalidSigner` errors from the TRC-2612 port are renamed to their `TRC2612` form.
  - These are naming-only ports: each TRC-NNN (TIP-NNN) is functionally identical to its EIP-NNN counterpart, so interface ids and behaviour are unchanged. On-chain magic values are deliberately left as-is for wire compatibility, e.g. `keccak256("ERC3156FlashBorrower.onFlashLoan")` in the TRC-3156 flash-loan flow and ERC-1820's `updateERC165Cache` / `implementsERC165Interface` ABI on `ITRC1820Registry`. EIP/ERC spec citations in comments are likewise preserved.

- Port ERC1155 to TRC1155. ([#54](https://github.com/OpenZeppelin/tron-contracts/pull/54))

  - Move `contracts/token/ERC1155/` → `contracts/token/TRC1155/` (and the `test/token/` mirror). Rename `ERC1155`, `IERC1155`, `IERC1155Receiver`, `IERC1155MetadataURI`, all extensions (`Burnable`/`Pausable`/`Supply`/`URIStorage`), and `Holder`/`Utils` to the `TRC1155` / `ITRC1155` family.
  - `contracts/interfaces/IERC1155*.sol` → `ITRC1155*.sol` (3 alias files).
  - `draft-IERC6093.sol`: only the `IERC1155Errors` interface block is renamed to `ITRC1155Errors` with `TRC1155*` error names. `IERC20Errors` and `IERC721Errors` are unchanged.
  - Mocks: `ERC1155ReceiverMock.sol` → `TRC1155ReceiverMock.sol`. Under `contracts/mocks/docs/token/`, `ERC1155/` → `TRC1155/`, and the pre-existing upstream typo `MyERC115HolderContract.sol` is fixed to `MyTRC1155HolderContract.sol`.
  - Docs page `erc1155.adoc` → `trc1155.adoc`. README and guide cite TIP-1155 with EIP-1155 noted as the ETH analogue.
  - Downstream consumers updated: `TimelockController`, `Governor`, `ERC2771Forwarder` natspec, `ERC6909ContentURI`, `Stateless` mock.
  - TIP-1155 is functionally identical to EIP-1155 — **including the receiver hook function names**. `onERC1155Received` (selector `0xf23a6e61`) and `onERC1155BatchReceived` (selector `0xbc197c81`) are kept verbatim per the TIP-1155 spec; only the receiver _interface name_ changes (`IERC1155Receiver` → `ITRC1155Receiver`). This is different from TIP-721, which renames the receiver hook to `onTRC721Received`.

- Port ERC-1271 to TRC-1271. ([#85](https://github.com/OpenZeppelin/tron-contracts/pull/85))

  - Rename `IERC1271` to `ITRC1271` (and the `ERC1271WalletMock` / `ERC1271` test behavior helpers), updating all imports and references (`SignatureChecker`, `draft-ERC7739`, `IGovernor`/`Governor`, `MultiSignerERC7913`).
  - TRC-1271 (TIP-1271, https://github.com/tronprotocol/tips/blob/master/tip-1271.md) uses the same `isValidSignature(bytes32,bytes)` method and `0x1626ba7e` magic value as EIP-1271 — naming-only port.

- Port ERC-165 to TRC-165. ([#82](https://github.com/OpenZeppelin/tron-contracts/pull/82))

  - Rename `IERC165` / `ERC165` / `ERC165Checker` (and the `ERC165Mock` test helpers) to `ITRC165` / `TRC165` / `TRC165Checker`, updating all imports and `supportsInterface` overrides across the access, governance, token and crosschain layers.
  - TRC-165 (TIP-165, https://github.com/tronprotocol/tips/blob/master/tip-165.md) is functionally identical to EIP-165 — this is a naming-only port; the `0x01ffc9a7` interface id and behaviour are unchanged.
  - `IERC1820Registry` keeps its `updateERC165Cache` / `implementsERC165Interface` function names, which are part of the separate ERC-1820 standard's external ABI.

- Port ERC-1967 to TRC-1967. ([#83](https://github.com/OpenZeppelin/tron-contracts/pull/83))

  - Rename `IERC1967` / `ERC1967Proxy` / `ERC1967Utils` (the `proxy/ERC1967/` directory and the `ERC1967ProxyUnsafe` mock) to `ITRC1967` / `TRC1967Proxy` / `TRC1967Utils` / `proxy/TRC1967/`, updating all imports and references.
  - TRC-1967 (TIP-1967, https://github.com/tronprotocol/tips/blob/master/tip-1967.md) standardises the same implementation/admin/beacon storage slots as EIP-1967 — naming-only port. The slot constants and their `eip1967.proxy.*` derivation strings are unchanged.

- Port ERC20 to TRC20. ([#52](https://github.com/OpenZeppelin/tron-contracts/pull/52))

  - Move `contracts/token/ERC20/` → `contracts/token/TRC20/`. Renames `ERC20`/`IERC20`/`IERC20Metadata`/`IERC20Permit`/`SafeERC20`/all ERC20-prefixed extensions and their tests to the `TRC20` / `ITRC20` / `SafeTRC20` family.
  - `ERC4626` → `TRC4626` (both the implementation and the `IERC4626`/`ITRC4626` interface).
  - In `contracts/interfaces/draft-IERC6093.sol`, rename only the `IERC20Errors` interface and its `ERC20*` errors to `ITRC20Errors` and `TRC20*`. `IERC721Errors` and `IERC1155Errors` are unchanged.
  - `ERC1363`, `ERC1363Utils`, and `BridgeERC20` keep their names; their internals are migrated to reference `TRC20`/`ITRC20`/`SafeTRC20`.
  - TIP-20 (https://github.com/tronprotocol/tips/blob/master/tip-20.md) is functionally identical to EIP-20, so this is a naming-only port; no behavior changes.

- Port ERC-2612 to TRC-2612. ([#94](https://github.com/OpenZeppelin/tron-contracts/pull/94))

  - Rename the `IERC2612` interface alias to `ITRC2612` (file and `interfaces/README.adoc` references). The NatSpec dual-cites TRON's TIP-2612 (https://github.com/tronprotocol/tips/blob/master/tip-2612.md) and EIP-2612.
  - Naming-only port of the leftover numbered alias. The permit implementation (`TRC20Permit`) and its interface (`ITRC20Permit`) were already ported and cite TIP-2612; `ITRC2612` remains a thin alias of `ITRC20Permit`.

- `TRC2771Forwarder`: Revert the whole batch with `TRC2771ForwarderNoRefundReceiver` when a request is invalid or a value-bearing call fails and no `refundReceiver` is set, instead of consuming the nonce and refunding the leftover value to `address(0)`. ([#121](https://github.com/OpenZeppelin/tron-contracts/pull/121))
- Port ERC-2771 to TRC-2771. ([#84](https://github.com/OpenZeppelin/tron-contracts/pull/84))

  - Rename `ERC2771Context` / `ERC2771Forwarder` (and the `ERC2771ContextMock`) to `TRC2771Context` / `TRC2771Forwarder`, updating all imports and references (including `Multicall`).
  - TRC-2771 (TIP-2771, https://github.com/tronprotocol/tips/blob/master/tip-2771.md) is the TRON-side analogue of EIP-2771 — naming-only port; sender extraction is unchanged (TVM addresses are the same 20-byte values as EVM).

- [BREAKING] `TRC20FlashMint`: Expect the flash-loan callback to return `keccak256("TRC3156FlashBorrower.onFlashLoan")`, the value TIP-3156 mandates, instead of the Ethereum preimage carried over from upstream. Borrowers returning the previous value are now rejected with `TRC3156InvalidReceiver`. ([#114](https://github.com/OpenZeppelin/tron-contracts/pull/114))
- [BREAKING] `SlotDerivation`: `erc7201Slot` has been renamed to `trc7201Slot`. Derived slot values are unchanged, as is the `erc7201:` storage-location annotation prefix. ([#115](https://github.com/OpenZeppelin/tron-contracts/pull/115))
- Port ERC721 to TRC721. ([#53](https://github.com/OpenZeppelin/tron-contracts/pull/53))

  - Move `contracts/token/ERC721/` → `contracts/token/TRC721/` (and the `test/token/` mirror). Rename `ERC721`, `IERC721`, `IERC721Receiver`, `IERC721Enumerable`, `IERC721Metadata`, all extensions (`Burnable`/`Consecutive`/`Enumerable`/`Pausable`/`Royalty`/`URIStorage`/`Votes`/`Wrapper`), and the `Holder`/`Utils` utils to the `TRC721` / `ITRC721` family.
  - In `contracts/interfaces/draft-IERC6093.sol`, rename only the `IERC721Errors` interface and its `ERC721*` errors to `ITRC721Errors` and `TRC721*`. `IERC20Errors` and `IERC1155Errors` are unchanged.
  - Spec attribution: TRC-721 references link to TIP-721 (the TRON-side analogue of EIP-721). ERC-2309 (consecutive), ERC-2981 (royalty), ERC-4906 (metadata update), and the standalone `ERC2981` royalty implementation keep their names — no TIP equivalent exists.
  - TIP-721 is functionally identical to EIP-721 except in one place: the receiver hook is `onTRC721Received` (selector `0x5175f878`) rather than `onERC721Received` (`0x150b7a02`). Our implementation follows TIP-721 exactly; the selector is computed dynamically from the renamed function name, so the magic value used to confirm `safeTransfer` is the TIP-721 one. Contracts that need to accept both TRC-721 and ERC-721 tokens will need to implement both hooks.

- Use the TRON personal-sign prefix in `MessageHashUtils`. ([#107](https://github.com/OpenZeppelin/tron-contracts/pull/107))

  - Rename `MessageHashUtils.toEthSignedMessageHash` to `toTronSignedMessageHash` (both the `bytes32` and `bytes` overloads) and switch the hard-coded ERC-191 prefix `"\x19Ethereum Signed Message:\n"` to the TRON one, `"\x19TRON Signed Message:\n"`. This matches the digest produced by native TRON wallet tooling (TronWeb `signMessage` / `signMessageV2`, TronLink) per TIP-191, so signatures from those tools now verify against `ECDSA.recover`. Previously the library used the Ethereum prefix, which only native TRON signers would not match.
  - This is a behavioral, consensus-critical change: the digest bytes differ, so any signature flow relying on the old Ethereum-prefixed digest must be regenerated against the TRON prefix.
  - The leading version byte is intentionally kept as `0x19` (not `0x15`) to match the prefix TronWeb and TronLink emit in practice, even though `0x15` is the byte-length of `"TRON Signed Message:\n"`.
  - The other digests in the library (`toDataWithIntendedValidatorHash`, `toTypedDataHash`, the EIP-712 domain helpers) are unchanged.

- `BridgeFungible`: Reject an interoperable address whose address part is empty in `_crosschainTransfer` with `CrosschainFungibleEmptyAddress`, rather than forwarding it to the counterpart. ([#136](https://github.com/OpenZeppelin/tron-contracts/pull/136))
- `BridgeFungible`: Reject a received crosschain recipient that is not exactly 20 bytes with `BridgeInvalidRecipient`, rather than letting `bytes20` truncate it into an unrelated address. ([#117](https://github.com/OpenZeppelin/tron-contracts/pull/117))
- Fix `BridgeTRC20` release path for false-on-success tokens (e.g. TRON USDT). ([#108](https://github.com/OpenZeppelin/tron-contracts/pull/108))

`BridgeTRC20._onReceive` released custody with `SafeTRC20.safeTransfer`, which reverts for tokens such as TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`) whose `transfer` returns `false` on a _successful_ transfer. Because locking (`_onSend` -> `safeTransferFrom`) keeps working for USDT (its `transferFrom` returns `true`), the asymmetry let deposits through while permanently trapping every withdrawal in the bridge.
 `_onReceive` now uses `SafeTRC20.safeTransferChecked`, which verifies success via the caller's balance delta and works whether the token returns `true`, `false`, or nothing. This custodial bridge still assumes a token that is neither rebasing nor fee-on-transfer, which it requires for release accounting regardless of the transfer helper.

- `GovernorPreventLateQuorum`: Bound `lateQuorumVoteExtension` by a new internal virtual `_maxLateQuorumVoteExtension` (default `votingPeriod()`) to cap the total voting duration to twice the voting period, thus preventing a large extension from bricking governance. Integrators can override `_maxLateQuorumVoteExtension` to enforce a different bound. ([#137](https://github.com/OpenZeppelin/tron-contracts/pull/137))
- Make VestingWallet tests robust to TRE's no-clock-rollback snapshot/revert. ([#57](https://github.com/OpenZeppelin/tron-contracts/pull/57))

  - `VestingWallet.test.js` and `VestingWalletCliff.test.js` no longer pull `loadFixture` from `@nomicfoundation/hardhat-network-helpers`. TRE's `tre_revert` intentionally skips the chain clock when rolling state, so the cached `start = block.timestamp + 1h` captured during the first fixture run is in the past by the second call, and `time.increaseTo(schedule[0])` rejects the move as backwards. The replacement `loadFixture` runs the fixture fresh each time so `start` is computed against the live clock, and calls `refundSigners` so the value-bearing fixture (`sender.sendTransaction({to: mock, value: amount})`) does not drain the deployer balance across the 60+ schedule points.
  - Reduce the test amount from 100 ETH-equivalent to 1 ETH-equivalent. With the bridge's 1-wei == 1-sun pass-through, `parseEther('100')` would land at 1e20 sun and overflow TVM's account-balance `Long.MAX_VALUE` (~9.22e18 sun). Vesting schedule and release assertions are amount-relative, so the smaller magnitude preserves every semantic check.
  - Pass explicit `data: '0x'` on the value-only seeding send — the bridge rejects an undefined `data` field on plain transfers.

  `contracts/finance/VestingWallet.sol` already references the `TRC20` / `ITRC20` / `SafeTRC20` family from the TRC20 port; no contract changes are needed here.

- Adapt governance tests to TVM transaction-shape semantics. ([#59](https://github.com/OpenZeppelin/tron-contracts/pull/59))

  - Pass explicit `data: '0x'` on the value-only `sendTransaction` calls that seed Governor / TimelockController fixtures and probe the disabled-deposit path. The bridge rejects an undefined `data` field on plain transfers.
  - Loosen the `mockFunctionOutOfGas` revert assertion in `TimelockController.test.js` from `revertedWithCustomError('FailedCall')` to `.to.be.reverted`. The inner call burns the full energy budget; TVM does not propagate the `FailedCall` custom-error payload through the OOG bubble, so the assertion's error-shape introspection is dropped while the bubbles-up-as-revert check is preserved.
  - Work around the CompTimelock ↔ Governor cyclic constructor in `GovernorTimelockCompound.test.js`. EVM breaks the cycle by predicting the governor's CREATE address from the deployer's next nonce; TVM CREATE addresses derive from `keccak256(txID || ownerAddress)[12:]`, which depends on the governor-deploy tx's own raw_data and cannot be predicted ahead of broadcast. Deploy `CompTimelock` with a placeholder admin, deploy the governor against the real timelock, then rewrite `CompTimelock.admin` (slot 0) via `setStorageAt` to the governor's real address.

  The governance contracts themselves already reference the
  `TRC20Votes` / `TRC721Holder` / `TRC1155Holder` families from
  prior token-port PRs; no contract changes are needed.

- Skip ERC2771Forwarder OOG-bubbling tests on TVM where the contract ([#58](https://github.com/OpenZeppelin/tron-contracts/pull/58)) defence works but the assertion can't observe it.
 The four `bubbles out of gas` cases probe `_checkForwardedGas`'s `invalid()` reaction to an under-funded forward. The defence itself is robust on TVM — the chain burns all forwarded energy before returning — but the existing assertions read `gasUsed` from a mined-but-failed receipt, which is an EVM-only artefact. TVM rejects under-provisioned txs at the broadcast layer with `OTHER_ERROR` (verified via `OZ_TRACE_BROADCAST=1`: `usedEnergy[100000]` reported in the reject message) rather than mining a failed receipt to read later. The skips are documented rather than faked; the same defence is still exercised on EVM-targeted runs.

- Drop the RIP-7212 native path from `P256` (no precompile on TVM). ([#63](https://github.com/OpenZeppelin/tron-contracts/pull/63))
TRON-TVM does not ship the RIP-7212 secp256r1 precompile at `address(0x100)`, so the native fast-path can never succeed there. Remove `verifyNative`, `_tryVerifyNative`, `_rip7212` and the `Errors` import from `contracts/utils/cryptography/P256.sol`; `verify(...)` now delegates straight to `verifySolidity(...)`. Callers (`WebAuthn`, `ERC7913P256Verifier`, `SignerP256`) keep using `verify(...)` unchanged. `P256.test.js` is updated to exercise `$verifySolidity` (the `$verify` / `$verifyNative` exposed wrappers no longer exist) and batches the wycheproof vectors through a single concurrent `it()` to keep wall time reasonable on TRE while preserving every per-vector assertion.

- Accept 0x41-byte signatures in `TRC7913P256Verifier`. ([#109](https://github.com/OpenZeppelin/tron-contracts/pull/109))
`TRC7913P256Verifier.verify` required signatures to be exactly `0x40` bytes, rejecting a `0x41`-byte signature that carries a trailing recovery byte. This diverged from upstream OZ ERC-7913 (which uses `signature.
length >= 0x40`) and from the port's own `SignerP256` (which reads only the first `0x40` bytes), so a valid secp256r1 signature accepted by one P256 path was rejected by the other.
Relax the check to `signature.length >= 0x40`. Only `r || s` (the first `0x40` bytes) is read, and malleability is already prevented by `P256.verify`'s low-s check, so the trailing byte cannot change the verification result — the strict length was an interop regression with no security benefit.

- Align proxy CREATE2 address prediction with TIP-26. ([#55](https://github.com/OpenZeppelin/tron-contracts/pull/55))

  - `Clones.predictDeterministicAddress` and `predictDeterministicAddressWithImmutableArgs` now use the TIP-26 `0x41` prefix in their keccak256 derivation, matching what TVM's CREATE2 opcode computes on-chain. The previous derivation hashed with the EVM `0xff` prefix, so the predicted address diverged from the address `cloneDeterministic` actually deploys at.
  - Proxy module tests (`Clones`, `ProxyAdmin`, `TransparentUpgradeableProxy`, `UUPSUpgradeable`) read CREATE results from `receipt.internalTransactions` rather than `(sender, nonce)` prediction. TVM derives CREATE addresses from `sha3(txHash || sender)` — `staticCall` and the real deploy return different addresses, so the predict-and-attach pattern cannot work on TVM.
  - `TransparentUpgradeableProxy.behaviour.js` resolves the inner `ProxyAdmin` via the ERC-1967 `AdminSlot` instead of predicting its CREATE address.

- `TRC4626`, `VestingWallet`, `TRC20Wrapper`: Pay the underlying out with `SafeTRC20.safeTransferChecked` instead of `safeTransfer`, so a token that returns `false` from a successful `transfer` (TRON USDT) can be withdrawn rather than trapped. ([#131](https://github.com/OpenZeppelin/tron-contracts/pull/131))
- Trim contracts/utils/Blockhash.sol down to the native BLOCKHASH opcode only ([#49](https://github.com/OpenZeppelin/tron-contracts/pull/49))
- Adapt cross-cutting test helpers to TVM's single-witness model. ([#60](https://github.com/OpenZeppelin/tron-contracts/pull/60))

  - `test/helpers/txpool.js`'s `batchInBlock` no longer drives `evm_setAutomine` + `evm_mine` (those JSON-RPC methods don't exist on java-tron). Instead it leaves instamine via the patched FullNode's `tre_blockTime(60)` cheatcode, parks the broadcasts in the pending pool with ~10ms wall-clock spacing so each tx gets a distinct `Date.now()` timestamp (and therefore a distinct txID), waits on `/wallet/getpendingsize` until all N are queued, drives a manual `tre_mine`, then restores instamine. Callers (`TRC20Votes` and `TrieProof` tests) keep their `batchInBlock([fn, fn, ...])` call shape.
  - `test/helpers/governance.js`'s `GovernorHelper.delegate(...)` serialises its three sub-calls instead of running them in parallel via `Promise.all`. TVM's instamine + single-witness setup already orders tx execution per block; firing the three calls in parallel just queues concurrent HTTP requests at the FullNode and stacks per-tx receipt-poll deadlines until the later broadcasts time out. Sequential awaits stay inside the suite's time budget and stop back-pressuring the witness.

- Reference TIP-120 in `ECDSA`. ([#89](https://github.com/OpenZeppelin/tron-contracts/pull/89))
`ECDSA`'s NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-120.md[TIP-120], TRON's ECDSA signature-encoding specification (the `(r, s, v)` layout with `v` in `{27, 28}` that this library produces and accepts). Documentation only — no behavior change.

- Reference TIP-191 in `MessageHashUtils`. ([#87](https://github.com/OpenZeppelin/tron-contracts/pull/87))
`MessageHashUtils` produces ERC-191 / EIP-712 signed-data digests; its NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-191.md[TIP-191] (the TRON-side analogue of ERC-191, with the same `0x19`-prefixed version-byte format) alongside ERC-191. Documentation only — no behavior change.

- `ITRC20`: Reference TIP-20 (https://github.com/tronprotocol/tips/blob/master/tip-20.md) alongside EIP-20 in the interface documentation, aligning `ITRC20` with the dual-citation convention already used by the other TRON token standards. ([#80](https://github.com/OpenZeppelin/tron-contracts/pull/80))
- Align CREATE2 address derivation with TVM's TIP-26 hash prefix. ([#62](https://github.com/OpenZeppelin/tron-contracts/pull/62))

  - `Create2.computeAddress` and `Create2.deploy` now hash with the `0x41` prefix defined by TIP-26 (https://github.com/tronprotocol/tips/blob/master/tip-26.md), the TRON analogue of EIP-1014's `0xff`, so predicted addresses match what TVM's `create2` opcode computes on-chain.
  - `RelayedCall.getRelayer` applies the same `0x41` prefix when predicting the relay contract address, fixing a mismatch where the predicted address (used for the `extcodesize` redeploy guard) diverged from the address the `create2` opcode actually produces.

- Reference TIP-7951 in `P256`. ([#90](https://github.com/OpenZeppelin/tron-contracts/pull/90))
`P256`'s NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-7951.md[TIP-7951], which specifies a native secp256r1 precompile for the TVM at `0x100` (following EIP-7951, superseding RIP-7212). The library continues to verify in pure Solidity until the precompile is enabled on the target network. Documentation only — no behavior change.

- Complete the TRX/TRC terminology localization for residual references. ([#110](https://github.com/OpenZeppelin/tron-contracts/pull/110))
Localize residual Ethereum-standard mentions in NatSpec to the TRON convention for standards TRON has republished: `TRC-165`, `TRC-1967`, `TRC-1271` (bare inline mentions) and `TIP-721` (linked citation). Native currency terms in `VestingWallet` and the `TRC20.decimals` docstring now use TRX. References to standards TRON has not republished as a TIP (e.g. ERC-1167, ERC-1822, ERC-6372, ERC-3156, ERC-2981, ERC-777) keep citing the real ERC.
Rename the `VestingWallet` native-currency event `EtherReleased` to `TRXReleased` for consistency with `TRC20Released`. This changes the emitted log topic; off-chain consumers must update to the new event name. Also add a note explaining the retained `draft-IERC6093.sol` filename.

- `TRC1155Burnable`: use `_checkAuthorized` to correctly apply authorization overrides. ([#122](https://github.com/OpenZeppelin/tron-contracts/pull/122))
- Reference TIP-7201 in `Initializable` and `SlotDerivation`. ([#91](https://github.com/OpenZeppelin/tron-contracts/pull/91))

  The namespaced-storage NatSpec now cites https://github.com/tronprotocol/tips/blob/master/tip-7201.md[TIP-7201] (the TRON-side analogue of ERC-7201). The `erc7201:` storage-location tags are left unchanged — they are recognized verbatim by tooling and the derived slots are identical. Documentation only — no behavior change.

- TVM compile-pipeline and build-infra adjustments. ([#68](https://github.com/OpenZeppelin/tron-contracts/pull/68))

  - `hardhat-exposed` is gated behind `SKIP_EXPOSED`, its `outDir` moved to `contracts/exposed`, the tron compiler `target` set to `tron-when-network-tron` (so `--network hardhat` falls through to stock solc for wrapper generation), and an `exposed:regen` script added; the generated tree is gitignored (regenerated, not committed).
  - Mocha timeout raised to 600s (TVM deploys are slow), solc `metadata` pinned (`bytecodeHash: ipfs`, `useLiteralContent: true`) so bytecode stays reproducible, `warnings.default` relaxed to `warn` (tron-solc treats `chain` as a builtin symbol on the crosschain contracts), `defaultNetwork: tre`, and `.env` loading via `dotenv`.
  - Pin `dotenv`, `mocha`, `solc`, and `tronweb`.
  - Add `scripts/mocha-file-timings-reporter.js` (per-file wall-time weighting for parallel-test buckets) and `scripts/compare-bytecode.js` (compile-migration drift detector).

- TVM-aware test helpers. ([#69](https://github.com/OpenZeppelin/tron-contracts/pull/69))

  - `account` default balance kept within TVM's `Long.MAX_VALUE` bound (`5 * WeiPerEther`; the upstream `10000 ETH` equivalent overflows TVM's 1-wei-==-1-sun account balance).
  - `txpool` `batchInBlock` made dual-mode — EVM path (`evm_setAutomine`) when an explicit provider is passed (anvil-backed tests), TVM path (`tre_blockTime`/`tre_mine`) otherwise.

- Skip or re-enable tests for TVM/EVM divergences. ([#70](https://github.com/OpenZeppelin/tron-contracts/pull/70))

  - Skip the `TRC20Votes` one-checkpoint-per-block test (TRE cannot stage N transactions into one block).
  - Re-enable 4 `RelayedCall` tests that were over-skipped; they pass on TVM.

- Harden deterministic deployment, signature, and token utilities, and correct related docs. ([#103](https://github.com/OpenZeppelin/tron-contracts/pull/103))

  - `Create2.deploy` and `Clones.cloneDeterministic` now reject a colliding (already-deployed) target address with a cheap code-presence check before invoking `create2`, avoiding the near-full energy burn a TVM `create2` collision otherwise incurs. `Create2.deploy` also now reverts if `create2` returns an address with no runtime code.
  - `TRC7913P256Verifier.verify` now requires the signature to be exactly `0x40` bytes, rejecting non-canonical encodings with trailing bytes that previously verified identically.
  - `draft-TRC7739`'s nested typed-data verification now rejects a zero `structHash` produced by a malformed `contentsDescr`, keeping the verified digest bound to the contents and account domain.
  - `WebAuthn`, `SafeTRC20`, and `TIP712` gain documentation clarifying, respectively, that high-`s` ES256 assertions must be normalized off-chain, that `SafeTRC20` is not a token-authenticity check and `trySafeTransfer` may report `false` for false-on-success tokens, and that long `name`/`version` values are unreliable behind proxies/clones.
  - `Blockhash` documentation now reflects the opcode-only (256-block) behavior rather than EIP-2935 extended history, which is not yet active on TRON mainnet (specified for the TVM by TIP-2935).

- Align utility CREATE2 helpers with TIP-26 and tune utility tests for TVM. ([#56](https://github.com/OpenZeppelin/tron-contracts/pull/56))

  - Utility tests aligned with TVM behaviour:
    - `Address`, `Create2`, `LowLevelCall` — pass explicit `data: '0x'` on empty value-only sends (the bridge rejects undefined `data`) and loosen revert assertions whose custom-error payload doesn't survive TVM's energy-burn-on-OOG / collision path.
    - `RelayedCall` — skip the relayer-execution sub-suites. TVM's transaction-routing layer rejects external calls to contracts deployed via raw `create2` with hand-crafted bytecode (no metadata, no contractStore entry). The CREATE2 deployment itself still works, but the call shape these tests probe never runs.
    - `RLP` — resolve nested promise arguments explicitly before passing them through `$encode_list`; the bridge's plain JS Proxy doesn't implicitly await like ethers' `Contract` proxy does.
    - `SignatureChecker` — skip `isValidERC1271SignatureNow` cases that rely on the identity precompile while the locally bundled `tronbox/tre` image OOMs on the staticcall path. Mainnet java-tron registers Identity at 0x04 and behaves like EVM.
    - `ERC165Checker` — skip the return-bomb assertion that reads `gasUsed` via a sub-method the bridge's invoke proxy doesn't surface. The contract-side defence itself is exercised by every other `supportsInterface` test in the file.
    - `MerkleTree` — batch independent view reads with `Promise.all` to amortise per-call HTTP RTT, serialize the fill loop (`Promise.all` → `for`) to avoid confusing the unconfirmed-tx poll path, and loosen the full-tree revert to `.to.be.reverted` since the panic selector (0x41) doesn't always propagate through TVM's revert-data field.
