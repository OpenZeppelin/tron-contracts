// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/TRC1155/extensions/ITRC1155MetadataURI.sol)

pragma solidity >=0.6.2;

import {ITRC1155} from "../ITRC1155.sol";

/**
 * @dev Interface of the optional TRC1155MetadataExtension interface, as defined
 * in the https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[EIP-1155 metadata extensions]
 * section (mirrored by TIP-1155).
 */
interface ITRC1155MetadataURI is ITRC1155 {
    /**
     * @dev Returns the URI for token type `id`.
     *
     * If the `\{id\}` substring is present in the URI, it must be replaced by
     * clients with the actual token type ID.
     */
    function uri(uint256 id) external view returns (string memory);
}
