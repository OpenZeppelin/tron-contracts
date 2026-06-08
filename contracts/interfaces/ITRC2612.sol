// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/ITRC2612.sol)

pragma solidity >=0.6.2;

import {ITRC20Permit} from "../token/TRC20/extensions/ITRC20Permit.sol";

/**
 * @dev Interface of the TRC-2612 permit extension, as defined in
 * https://github.com/tronprotocol/tips/blob/master/tip-2612.md[TIP-2612]
 * (the TRON-side analogue of https://eips.ethereum.org/EIPS/eip-2612[EIP-2612]).
 *
 * This is an alias of {ITRC20Permit}, kept under its standard number for discoverability.
 */
interface ITRC2612 is ITRC20Permit {}
