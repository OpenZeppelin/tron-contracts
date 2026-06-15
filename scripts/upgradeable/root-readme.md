# OpenZeppelin Contracts for Tron — Upgradeable

**A library of secure, community-vetted smart contracts for the [Tron](https://tron.network) network (TVM) — the upgradeable variant.**

This package is the upgradeable build of [`@openzeppelin/tron-contracts`](https://github.com/OpenZeppelin/tron-contracts): the same OpenZeppelin component library, ported to Tron's TVM and the TRC token standards, with every stateful contract rewritten to be safe to deploy behind a proxy.

- Implementations of Tron token standards — [TRC-20](docs/modules/ROOT/pages/trc20.adoc), TRC-721, TRC-1155, [TRC-4626](docs/modules/ROOT/pages/trc4626.adoc) — and [ERC-6909](docs/modules/ROOT/pages/erc6909.adoc).
- Flexible role-based [access control](docs/modules/ROOT/pages/access-control.adoc) and on-chain [governance](docs/modules/ROOT/pages/governance.adoc).
- Reusable [utilities](docs/modules/ROOT/pages/utilities.adoc): safe math, cryptography/signature verification, data structures, and more.

> [!NOTE]
> You are looking at the **upgradeable** variant. It is generated automatically from the non-upgradeable [`@openzeppelin/tron-contracts`](https://github.com/OpenZeppelin/tron-contracts) by OpenZeppelin's [Upgradeability Transpiler](https://github.com/OpenZeppelin/openzeppelin-transpiler): constructors become initializer functions and state lives in [ERC-7201 namespaced storage](#namespaced-storage). Stateless code (interfaces and libraries) is **not** duplicated here — it is imported from `@openzeppelin/tron-contracts`, which is a **peer dependency**. See [Using with Upgrades](docs/modules/ROOT/pages/upgradeable.adoc) for the full guide.

> [!IMPORTANT]
> For upgradeable contracts, the storage layout of different **major** versions must be assumed incompatible (e.g. it is unsafe to upgrade across a major bump). See [Backwards Compatibility](docs/modules/ROOT/pages/backwards-compatibility.adoc).

> [!WARNING]
> This Tron port is under active development and is **not yet audited**. Treat it as pre-release software, pin exact versions, and do not use it in production without your own review.

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

## Key concepts

### Initializers instead of constructors

A contract deployed behind a proxy never runs its constructor in the proxy's context, so initialization happens in an initializer guarded by the `initializer` / `onlyInitializing` modifiers (from `Initializable`). Each contract exposes `__{ContractName}_init` (which chains its parent initializers) and `__{ContractName}_init_unchained` (which does not). See [Using with Upgrades → Multiple Inheritance](docs/modules/ROOT/pages/upgradeable.adoc) for the chaining rules.

### Namespaced storage

Every stateful contract keeps its state in a struct annotated with `@custom:storage-location erc7201:...`, following [ERC-7201: Namespaced Storage Layout](https://eips.ethereum.org/EIPS/eip-7201). This isolates each contract's storage so new state variables can be added — and inheritance reordered — without shifting the layout of existing deployments.

## How this package is generated

This repository is produced by transpiling `@openzeppelin/tron-contracts`. The process — applying the upgradeable patches, compiling, and running the transpiler with the Tron-specific flags (peer-import mode, namespaced storage, excluded proxy contracts) — is documented in [`scripts/upgradeable/README.md`](scripts/upgradeable/README.md). The exact non-upgradeable source each build was generated from is pinned as the `lib/tron-contracts` submodule.

## Learn More

The guides under [`docs/`](docs/modules/ROOT/pages/) cover the concepts and contracts in depth:

- [Using with Upgrades](docs/modules/ROOT/pages/upgradeable.adoc) — initializers, multiple inheritance, namespaced storage, proxy deployment.
- [Access Control](docs/modules/ROOT/pages/access-control.adoc) — decide who can perform each action.
- [Tokens](docs/modules/ROOT/pages/tokens.adoc) — TRC-20, TRC-721, TRC-1155, TRC-4626, ERC-6909.
- [Governance](docs/modules/ROOT/pages/governance.adoc) and [Utilities](docs/modules/ROOT/pages/utilities.adoc).
- [Backwards Compatibility](docs/modules/ROOT/pages/backwards-compatibility.adoc) and the [FAQ](docs/modules/ROOT/pages/faq.adoc).

Because this is the upgradeable variant of OpenZeppelin Contracts, the upstream [OpenZeppelin Contracts documentation](https://docs.openzeppelin.com/contracts) and [Using with Upgrades](https://docs.openzeppelin.com/contracts/upgradeable) guides apply to the contract APIs as well — substitute the `TRC` token names and the `@openzeppelin/tron-contracts*` package names for their Ethereum equivalents.

## Security

This project is maintained by [OpenZeppelin](https://openzeppelin.com). The underlying components are derived from the audited [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) library; however, **this Tron port has not been independently audited and is not yet covered by a bug bounty.** Using it is not a substitute for a security review of your own system.

The engineering guidelines we follow are in [`GUIDELINES.md`](GUIDELINES.md), and community standards in [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Smart contracts are a nascent technology and carry a high level of technical risk and uncertainty.

## License

Released under the [MIT License](LICENSE).
