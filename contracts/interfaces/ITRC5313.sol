// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.4.0) (interfaces/ITRC5313.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface for the Light Contract Ownership Standard.
 *
 * A standardized minimal interface required to identify an account that controls a contract
 */
interface ITRC5313 {
    /**
     * @dev Gets the address of the owner.
     */
    function owner() external view returns (address);
}
