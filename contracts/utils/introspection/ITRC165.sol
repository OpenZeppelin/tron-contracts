// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (utils/introspection/ITRC165.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the TRC-165 standard, as defined in
 * https://github.com/tronprotocol/tips/blob/master/tip-165.md[TIP-165] (the TRON-side analogue
 * of https://eips.ethereum.org/EIPS/eip-165[EIP-165]).
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({TRC165Checker}).
 *
 * For an implementation, see {TRC165}.
 */
interface ITRC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
