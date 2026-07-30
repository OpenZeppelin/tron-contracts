// SPDX-License-Identifier: MIT
// Tron Contracts (last updated v5.4.0) (token/TRC721/ITRC721Receiver.sol)

pragma solidity >=0.5.0;

/**
 * @title TRC-721 token receiver interface
 * @dev Interface for any contract that wants to support safeTransfers
 * from TRC-721 asset contracts.
 */
interface ITRC721Receiver {
    /**
     * @dev Whenever an {ITRC721} `tokenId` token is transferred to this contract via {ITRC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be
     * reverted.
     *
     * The selector can be obtained in Solidity with `ITRC721Receiver.onTRC721Received.selector`.
     */
    function onTRC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
