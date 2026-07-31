# OpenZeppelin Contracts for TRON

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**A library for secure smart contract development on TRON.** A port of [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) to the TRON Virtual Machine (TVM), adapted to TRON's standards (TIPs / TRCs) and to the ways the TVM differs from the EVM.

> [!WARNING]
> **This project is under active development and has NOT been audited.** Contract names, APIs, and behavior may still change. Do not use in production without an independent security review.

## Overview

`@openzeppelin/tron-contracts` is based on [OpenZeppelin Contracts **v5.6.1**](https://github.com/OpenZeppelin/openzeppelin-contracts) and keeps its battle-tested implementations, while:

- **Renaming** the standards that TRON publishes under its own identifiers — for example `ERC20` → `TRC20`, `ERC165` → `TRC165`, `EIP712` → `TIP712` — and dual-citing both the TRON (TIP / TRC) and Ethereum (EIP / ERC) specifications in the documentation.
- **Adapting** the implementations where the TVM diverges from the EVM (e.g. `CREATE2` address derivation, the `block.chainid` used in EIP-712 domain separators, the TRC-721 receiver hook, and tokens such as TRON USDT whose `transfer` returns `false` on success).

Where TRON only publishes a signing or utility spec (rather than a renamable contract standard), the contract keeps its descriptive name (e.g. `ECDSA`, `MessageHashUtils`, `P256`) and simply references the relevant TIP.

## Installation

```sh
npm install @openzeppelin/tron-contracts
```

## Usage

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TRC20} from "@openzeppelin/tron-contracts/token/TRC20/TRC20.sol";

contract MyToken is TRC20 {
    constructor() TRC20("MyToken", "MTK") {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}
```

## TRON ↔ Ethereum standards

The TVM is EVM-compatible, but TRON standardizes many interfaces under its own [TIP](https://github.com/tronprotocol/tips) (TRON Improvement Proposal) and TRC numbers. This library references the TRON standard and dual-cites the Ethereum equivalent where one exists.

### Ported (renamed to the TRON identifier)

| Domain | TRON | Ethereum | Contracts |
| --- | --- | --- | --- |
| Fungible token | [TRC-20](https://github.com/tronprotocol/tips/blob/master/tip-20.md) | ERC-20 | `TRC20` (+ extensions) |
| Non-fungible token | [TRC-721](https://github.com/tronprotocol/tips/blob/master/tip-721.md) | ERC-721 | `TRC721` (+ extensions) |
| Multi-token | [TRC-1155](https://github.com/tronprotocol/tips/blob/master/tip-1155.md) | ERC-1155 | `TRC1155` (+ extensions) |
| Tokenized vault | [TRC-4626](https://github.com/tronprotocol/tips/blob/master/tip-4626.md) | ERC-4626 | `TRC4626` |
| Permit (gasless approval) | [TIP-2612](https://github.com/tronprotocol/tips/blob/master/tip-2612.md) | ERC-2612 | `TRC20Permit`, `ITRC20Permit` |
| Interface introspection | [TRC-165](https://github.com/tronprotocol/tips/blob/master/tip-165.md) | ERC-165 | `TRC165`, `TRC165Checker`, `ITRC165` |
| Proxy storage slots | [TRC-1967](https://github.com/tronprotocol/tips/blob/master/tip-1967.md) | ERC-1967 | `TRC1967Proxy`, `TRC1967Utils`, `ITRC1967` |
| Meta-transactions | [TRC-2771](https://github.com/tronprotocol/tips/blob/master/tip-2771.md) | ERC-2771 | `TRC2771Context`, `TRC2771Forwarder` |
| Contract signature validation | [TRC-1271](https://github.com/tronprotocol/tips/blob/master/tip-1271.md) | ERC-1271 | `ITRC1271`, `SignatureChecker` |
| Typed structured data | [TIP-712](https://github.com/tronprotocol/tips/blob/master/tip-712.md) | EIP-712 | `TIP712` |

### Referenced (descriptive name kept; TIP cited)

| Domain | TRON | Ethereum | Contracts |
| --- | --- | --- | --- |
| Signed data (`0x19` prefix) | [TIP-191](https://github.com/tronprotocol/tips/blob/master/tip-191.md) | ERC-191 | `MessageHashUtils` |
| ECDSA signature encoding | [TIP-120](https://github.com/tronprotocol/tips/blob/master/tip-120.md) | — | `ECDSA` |
| secp256r1 (P256) precompile | [TIP-7951](https://github.com/tronprotocol/tips/blob/master/tip-7951.md) | EIP-7951 / RIP-7212 | `P256` |
| Namespaced storage layout | [TIP-7201](https://github.com/tronprotocol/tips/blob/master/tip-7201.md) | ERC-7201 | `Initializable`, `SlotDerivation` |
| `CREATE2` address derivation | [TIP-26](https://github.com/tronprotocol/tips/blob/master/tip-26.md) | EIP-1014 | `Create2`, `Clones` |

> [!NOTE]
> Several of these carry TVM-specific behavior documented in the affected contract's NatSpec — for example: the TIP-712 domain separator masks `chainId` to its low four bytes (the value TRON exposes via `eth_chainId`); `CREATE2` derives addresses with a `0x41` prefix; and TRON USDT's `transfer` returns `false` even on a successful transfer, which `SafeTRC20.safeTransferUSDT` handles by verifying the calling contract's own balance delta (the sender's debit).

## TVM differences

This port adapts non-obvious differences between the TVM and the EVM, including `CREATE2` / plain `CREATE` address derivation, the `block.chainid` value used in TIP-712 domain separators, the TRC-721 receiver-hook magic value, and the handling of tokens that return `false` on a successful `transfer`. Each adaptation is documented in the affected contract's NatSpec.

## Security

This code is **unaudited** and under active development; use it at your own risk. Please report any security issues responsibly via the repository's security policy rather than opening a public issue.

## License

OpenZeppelin Contracts for TRON is released under the [MIT License](LICENSE).
