// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.7.0-rc.0) (crosschain/bridges/BridgeTRC1155.sol)

pragma solidity ^0.8.26;

import {ITRC1155} from "../../interfaces/ITRC1155.sol";
import {ITRC1155Receiver} from "../../interfaces/ITRC1155Receiver.sol";
import {ITRC1155Errors} from "../../interfaces/draft-IERC6093.sol";
import {TRC1155Holder} from "../../token/TRC1155/utils/TRC1155Holder.sol";
import {BridgeMultiToken} from "./abstract/BridgeMultiToken.sol";

/**
 * @dev This is a variant of {BridgeMultiToken} that implements the bridge logic for TRC-1155 tokens that do not expose
 * a crosschain mint and burn mechanism. Instead, it takes custody of bridged assets.
 */
// slither-disable-next-line locked-ether
abstract contract BridgeTRC1155 is BridgeMultiToken, TRC1155Holder {
    ITRC1155 private immutable _token;

    constructor(ITRC1155 token_) {
        _token = token_;
    }

    /// @dev Return the address of the TRC1155 token this bridge operates on.
    function token() public view virtual returns (ITRC1155) {
        return _token;
    }

    /// @dev Equivalent to `crosschainTransferFrom(from, to, id, value, "")`.
    function crosschainTransferFrom(address from, bytes memory to, uint256 id, uint256 value) public returns (bytes32) {
        return crosschainTransferFrom(from, to, id, value, "");
    }

    /**
     * @dev Transfer `value` of token `id` to a crosschain receiver. `data` is forwarded to the destination-chain
     * TRC-1155 receiver's acceptance hook.
     *
     * Note: The `to` parameter is the full InteroperableAddress (chain ref + address).
     */
    function crosschainTransferFrom(
        address from,
        bytes memory to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public returns (bytes32) {
        uint256[] memory ids = new uint256[](1);
        uint256[] memory values = new uint256[](1);
        ids[0] = id;
        values[0] = value;

        return crosschainTransferFrom(from, to, ids, values, data);
    }

    /// @dev Equivalent to `crosschainTransferFrom(from, to, ids, values, "")`.
    function crosschainTransferFrom(
        address from,
        bytes memory to,
        uint256[] memory ids,
        uint256[] memory values
    ) public returns (bytes32) {
        return crosschainTransferFrom(from, to, ids, values, "");
    }

    /**
     * @dev Transfer `values` of tokens `ids` to a crosschain receiver. `data` is forwarded to the destination-chain
     * TRC-1155 receiver's acceptance hook.
     *
     * Note: The `to` parameter is the full InteroperableAddress (chain ref + address).
     */
    function crosschainTransferFrom(
        address from,
        bytes memory to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual returns (bytes32) {
        // Permission is handled using the TRC1155's allowance system. This check replicates `TRC1155._checkAuthorized`.
        address spender = _msgSender();
        require(
            from == spender || token().isApprovedForAll(from, spender),
            ITRC1155Errors.TRC1155MissingApprovalForAll(spender, from)
        );

        // Perform the crosschain transfer and return the handler
        return _crosschainTransfer(from, to, ids, values, data);
    }

    /// @dev "Locking" tokens is done by taking custody.
    function _onSend(address from, uint256[] memory ids, uint256[] memory values) internal virtual override {
        token().safeBatchTransferFrom(from, address(this), ids, values, "");
    }

    /// @dev "Unlocking" tokens is done by releasing custody.
    function _onReceive(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual override {
        token().safeBatchTransferFrom(address(this), to, ids, values, data);
    }

    /// @dev Support receiving tokens only if the transfer was initiated by the bridge itself.
    function onERC1155Received(
        address operator,
        address /* from */,
        uint256 /* id */,
        uint256 /* value */,
        bytes memory /* data */
    ) public virtual override returns (bytes4) {
        return
            msg.sender == address(_token) && operator == address(this)
                ? ITRC1155Receiver.onERC1155Received.selector
                : bytes4(0);
    }

    /// @dev Support receiving tokens only if the transfer was initiated by the bridge itself.
    function onERC1155BatchReceived(
        address operator,
        address /* from */,
        uint256[] memory /* ids */,
        uint256[] memory /* values */,
        bytes memory /* data */
    ) public virtual override returns (bytes4) {
        return
            msg.sender == address(_token) && operator == address(this)
                ? ITRC1155Receiver.onERC1155BatchReceived.selector
                : bytes4(0);
    }
}
