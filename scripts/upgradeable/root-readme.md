# OpenZeppelin Contracts for Tron — Upgradeable

**A library of secure, community-vetted smart contracts for the [Tron](https://tron.network) network (TVM) — the upgradeable variant.**

This package is the upgradeable build of [`@openzeppelin/tron-contracts`](https://github.com/OpenZeppelin/tron-contracts): the same OpenZeppelin component library, ported to Tron's TVM and the TRC token standards, with every stateful contract rewritten to be safe to deploy behind a proxy. It is the Tron counterpart of [OpenZeppelin Contracts Upgradeable](https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable).

- Implementations of Tron token standards — [TRC-20](docs/modules/ROOT/pages/trc20.adoc), TRC-721, TRC-1155, [TRC-4626](docs/modules/ROOT/pages/trc4626.adoc) — and [TRC-6909](docs/modules/ROOT/pages/trc6909.adoc).
- Flexible role-based [access control](docs/modules/ROOT/pages/access-control.adoc) and on-chain [governance](docs/modules/ROOT/pages/governance.adoc).
- Reusable [utilities](docs/modules/ROOT/pages/utilities.adoc): safe math, cryptography/signature verification, data structures, and more.

> [!NOTE]
> You are looking at the **upgradeable** variant. It is generated automatically from the non-upgradeable [`@openzeppelin/tron-contracts`](https://github.com/OpenZeppelin/tron-contracts) by OpenZeppelin's [Upgradeability Transpiler](https://github.com/OpenZeppelin/openzeppelin-transpiler): constructors become initializer functions and state lives in [ERC-7201 namespaced storage](#namespaced-storage). Stateless code (interfaces and libraries) is **not** duplicated here — it is imported from `@openzeppelin/tron-contracts`, which is a **peer dependency**. See [Using with Upgrades](docs/modules/ROOT/pages/upgradeable.adoc) for the full guide.

> [!IMPORTANT]
> For upgradeable contracts, the storage layout of different **major** versions must be assumed incompatible (e.g. it is unsafe to upgrade across a major bump). See [Backwards Compatibility](docs/modules/ROOT/pages/backwards-compatibility.adoc).

> [!WARNING]
> This Tron port is under active development. Pin exact versions, and do not use it in production without your own review.

## Overview

### Installation

```console
$ npm install @openzeppelin/tron-contracts-upgradeable @openzeppelin/tron-contracts
```

`@openzeppelin/tron-contracts` is a **peer dependency** — install it alongside the upgradeable package so the imported interfaces and libraries resolve.

### Usage

The upgradeable package mirrors the structure of `@openzeppelin/tron-contracts`, but every **stateful** file and contract carries the `Upgradeable` suffix. Constructors are replaced by internal `__{ContractName}_init` initializers; you write your own public `initialize` that runs behind a proxy.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TRC721Upgradeable} from "@openzeppelin/tron-contracts-upgradeable/token/TRC721/TRC721Upgradeable.sol";

contract MyCollectible is TRC721Upgradeable {
    function initialize() public initializer {
        __TRC721_init("MyCollectible", "MCO");
    }
}
```

Compared to the non-upgradeable version:

```diff
-import {TRC721} from "@openzeppelin/tron-contracts/token/TRC721/TRC721.sol";
+import {TRC721Upgradeable} from "@openzeppelin/tron-contracts-upgradeable/token/TRC721/TRC721Upgradeable.sol";

-contract MyCollectible is TRC721 {
-    constructor() TRC721("MyCollectible", "MCO") {}
+contract MyCollectible is TRC721Upgradeable {
+    function initialize() public initializer {
+        __TRC721_init("MyCollectible", "MCO");
+    }
 }
```

> [!NOTE]
> Interfaces and libraries (e.g. `ITRC721`, `SafeCast`, `Strings`) are **not** part of this package — import them from `@openzeppelin/tron-contracts`. Only stateful contracts are renamed with the `Upgradeable` suffix.

You then deploy the implementation behind a proxy (e.g. an ERC-1967 / UUPS / transparent proxy) using your Tron toolchain — [TronBox](https://github.com/tronprotocol/tronbox) or [`@openzeppelin/hardhat-tron`](https://github.com/OpenZeppelin/hardhat-tron) — and call `initialize` exactly once. See [Using with Upgrades](docs/modules/ROOT/pages/upgradeable.adoc) for proxy patterns and the initializer rules.

To keep your system secure, **always** use the installed code as-is; do not copy-paste from online sources or modify it yourself.

## Versioning

Versions track [OpenZeppelin Contracts Upgradeable](https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable) by major and minor: each `@openzeppelin/tron-contracts-upgradeable` minor ports the feature set of the same-numbered upstream release. Patch numbers are independent — they follow the Tron port's own fixes, so a given patch number does not refer to the same-numbered upstream patch. Each release is generated from the same-versioned `@openzeppelin/tron-contracts`, which it pins as an exact peer dependency.

## Key concepts

### Initializers instead of constructors

A contract deployed behind a proxy never runs its constructor in the proxy's context, so initialization happens in an initializer guarded by the `initializer` / `onlyInitializing` modifiers (from `Initializable`). Each contract exposes `__{ContractName}_init` (which chains its parent initializers) and `__{ContractName}_init_unchained` (which does not). See [Using with Upgrades → Multiple Inheritance](docs/modules/ROOT/pages/upgradeable.adoc) for the chaining rules.

### Namespaced storage

Every stateful contract keeps its state in a struct annotated with `@custom:storage-location erc7201:...`, following [ERC-7201: Namespaced Storage Layout](https://eips.ethereum.org/EIPS/eip-7201). This isolates each contract's storage so new state variables can be added — and inheritance reordered — without shifting the layout of existing deployments.

## TVM differences

This port adapts non-obvious differences between the TVM and the EVM, including `CREATE2` / plain `CREATE` address derivation, the `block.chainid` value used in TIP-712 domain separators, the TRC-721 receiver-hook magic value, and the handling of tokens that return `false` on a successful `transfer`. Each adaptation is documented in the affected contract's NatSpec.

### Native TRC-10 assets

This library works with contract-based tokens: TRC-20, TRC-721, TRC-1155 and the other TRC standards. Native TRC-10 assets, which a TRON account can hold alongside TRX, are outside its scope.

Moving a TRC-10 requires the TVM's token-aware call — `address.transferToken(amount, id)`, compiling to `CALLTOKEN`. Every value-bearing path here uses an ordinary `call`, which carries TRX only. A TRC-10 credited to a contract built on this library therefore stays with that contract, and no supplied path forwards or withdraws it. This includes the governance executors: `GovernorUpgradeable.relay`, `GovernorUpgradeable.execute` and `TimelockControllerUpgradeable.execute`/`executeBatch` accept TRX through `value`, and their proposal and operation hashes bind targets, TRX values and calldata, with no field for a token identifier or amount.

Hold assets that contracts need to move as TRC-20 — either natively or by wrapping the TRC-10.

> [!IMPORTANT]
> **Addresses embedded inside `bytes` payloads MUST use the 20-byte EVM form.** During execution the TVM represents every address as the low 20 bytes, so `msg.sender`, `address(this)`, and `address`-typed arguments are identical to the EVM. The 21-byte `0x41`-prefixed and Base58Check (`T…`) forms that TRON tooling (TronWeb, node APIs) works with are off-chain encodings only — they never appear on-chain. When an address is carried inside a `bytes` argument — an ERC-7930 interoperable address, a crosschain bridge message, an ERC-7913 signer (`verifier || key`), or any packed calldata — it must be the raw 20-byte value. The 21-byte form is rejected where the format is self-describing (`InteroperableAddress.parseEvmV1` and `BridgeFungible` revert on a non-20-byte address) and would otherwise be silently mis-parsed into the wrong address. Strip the `0x41` prefix at the encoding boundary (e.g. in your TronWeb integration) before placing an address in a `bytes` payload.

## How this package is generated

This repository is produced by transpiling `@openzeppelin/tron-contracts`. The process — applying the upgradeable patches, compiling, and running the transpiler with the Tron-specific flags (peer-import mode, namespaced storage, excluded proxy contracts) — is documented in [`scripts/upgradeable/README.md`](scripts/upgradeable/README.md). The exact non-upgradeable source each build was generated from is pinned as the `lib/tron-contracts` submodule.

## Learn More

The guides under [`docs/`](docs/modules/ROOT/pages/) cover the concepts and contracts in depth:

- [Using with Upgrades](docs/modules/ROOT/pages/upgradeable.adoc) — initializers, multiple inheritance, namespaced storage, proxy deployment.
- [Access Control](docs/modules/ROOT/pages/access-control.adoc) — decide who can perform each action.
- [Tokens](docs/modules/ROOT/pages/tokens.adoc) — TRC-20, TRC-721, TRC-1155, TRC-4626, TRC-6909.
- [Governance](docs/modules/ROOT/pages/governance.adoc) and [Utilities](docs/modules/ROOT/pages/utilities.adoc).
- [Backwards Compatibility](docs/modules/ROOT/pages/backwards-compatibility.adoc) and the [FAQ](docs/modules/ROOT/pages/faq.adoc).

Because this is the upgradeable variant of OpenZeppelin Contracts, the upstream [OpenZeppelin Contracts documentation](https://docs.openzeppelin.com/contracts) and [Using with Upgrades](https://docs.openzeppelin.com/contracts/upgradeable) guides apply to the contract APIs as well — substitute the `TRC` token names and the `@openzeppelin/tron-contracts*` package names for their Ethereum equivalents.

## Security

This project is maintained by [OpenZeppelin](https://openzeppelin.com). The underlying components are derived from the audited [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) library. Please report any security issues responsibly via the [security policy](SECURITY.md) rather than opening a public issue. Using this library is not a substitute for a security review of your own system.

The engineering guidelines we follow are in [`GUIDELINES.md`](GUIDELINES.md), and community standards in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Smart contracts are a nascent technology and carry a high level of technical risk and uncertainty.

## License

Released under the [MIT License](LICENSE).
