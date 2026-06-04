// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (token/TRC1155/utils/TRC1155Holder.sol)

pragma solidity ^0.8.20;

import {ITRC165, TRC165} from "../../../utils/introspection/TRC165.sol";
import {ITRC1155Receiver} from "../ITRC1155Receiver.sol";

/**
 * @dev Simple implementation of `ITRC1155Receiver` that will allow a contract to hold TRC-1155 tokens.
 *
 * IMPORTANT: When inheriting this contract, you must include a way to use the received tokens, otherwise they will be
 * stuck.
 *
 * @custom:stateless
 */
abstract contract TRC1155Holder is TRC165, ITRC1155Receiver {
    /// @inheritdoc ITRC165
    function supportsInterface(bytes4 interfaceId) public view virtual override(TRC165, ITRC165) returns (bool) {
        return interfaceId == type(ITRC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
