// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/ITRC1820Implementer.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface for an ERC-1820 implementer, as defined in the
 * https://eips.ethereum.org/EIPS/eip-1820#interface-implementation-erc1820implementerinterface[ERC].
 * Used by contracts that will be registered as implementers in the
 * {ITRC1820Registry}.
 */
interface ITRC1820Implementer {
    /**
     * @dev Returns a special value (`TRC1820_ACCEPT_MAGIC`) if this contract
     * implements `interfaceHash` for `account`.
     *
     * See {ITRC1820Registry-setInterfaceImplementer}.
     */
    function canImplementInterfaceForAddress(bytes32 interfaceHash, address account) external view returns (bytes32);
}
