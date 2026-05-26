// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/TRC721/utils/TRC721Holder.sol)

pragma solidity ^0.8.20;

import {ITRC721Receiver} from "../ITRC721Receiver.sol";

/**
 * @dev Implementation of the {ITRC721Receiver} interface.
 *
 * Accepts all token transfers.
 * Make sure the contract is able to use its token with {ITRC721-safeTransferFrom}, {ITRC721-approve} or
 * {ITRC721-setApprovalForAll}.
 *
 * @custom:stateless
 */
abstract contract TRC721Holder is ITRC721Receiver {
    /**
     * @dev See {ITRC721Receiver-onTRC721Received}.
     *
     * Always returns `ITRC721Receiver.onTRC721Received.selector`.
     */
    function onTRC721Received(address, address, uint256, bytes memory) public virtual returns (bytes4) {
        return this.onTRC721Received.selector;
    }
}
