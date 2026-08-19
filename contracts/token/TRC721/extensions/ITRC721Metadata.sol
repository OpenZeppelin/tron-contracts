// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.4.0) (token/TRC721/extensions/ITRC721Metadata.sol)

pragma solidity >=0.6.2;

import {ITRC721} from "../ITRC721.sol";

/**
 * @title TRC-721 Non-Fungible Token Standard, optional metadata extension
 * @dev See https://eips.ethereum.org/EIPS/eip-721
 */
interface ITRC721Metadata is ITRC721 {
    /**
     * @dev Returns the token collection name.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the token collection symbol.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
     */
    function tokenURI(uint256 tokenId) external view returns (string memory);
}
