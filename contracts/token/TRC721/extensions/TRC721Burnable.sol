// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.5.0) (token/TRC721/extensions/TRC721Burnable.sol)

pragma solidity ^0.8.24;

import {TRC721} from "../TRC721.sol";
import {Context} from "../../../utils/Context.sol";

/**
 * @title TRC-721 Burnable Token
 * @dev TRC-721 Token that can be burned (destroyed).
 */
abstract contract TRC721Burnable is Context, TRC721 {
    /**
     * @dev Burns `tokenId`. See {TRC721-_burn}.
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     */
    function burn(uint256 tokenId) public virtual {
        // Setting an "auth" arguments enables the `_isAuthorized` check which verifies that the token exists
        // (from != 0). Therefore, it is not needed to verify that the return value is not 0 here.
        _update(address(0), tokenId, _msgSender());
    }
}
