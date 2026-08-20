// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.4.0) (token/TRC20/extensions/ITRC20Metadata.sol)

pragma solidity >=0.6.2;

import {ITRC20} from "../ITRC20.sol";

/**
 * @dev Interface for the optional metadata functions from the TRC-20 standard.
 */
interface ITRC20Metadata is ITRC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}
