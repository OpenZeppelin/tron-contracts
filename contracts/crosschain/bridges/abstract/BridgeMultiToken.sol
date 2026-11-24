// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.7.0) (crosschain/bridges/abstract/BridgeMultiToken.sol)

pragma solidity ^0.8.26;

import {InteroperableAddress} from "../../../utils/draft-InteroperableAddress.sol";
import {Context} from "../../../utils/Context.sol";
import {TRC7786Recipient} from "../../TRC7786Recipient.sol";
import {CrosschainLinked} from "../../CrosschainLinked.sol";

/**
 * @dev Base contract for bridging TRC-1155 between chains using a TRC-7786 gateway.
 *
 * In order to use this contract, two functions must be implemented to link it to the token:
 * * {_onSend}: called when a crosschain transfer is going out. Must take the sender tokens or revert.
 * * {_onReceive}: called when a crosschain transfer is coming in. Must give tokens to the receiver.
 *
 * This base contract is used by the {BridgeTRC1155}, which interfaces with legacy TRC-1155 tokens. It is also used by
 * the {TRC1155Crosschain} extension, which embeds the bridge logic directly in the token contract.
 *
 * This base contract implements the crosschain transfer operation through internal functions. It is for the "child
 * contracts" that inherit from this to implement the external interfaces and make these functions accessible.
 */
abstract contract BridgeMultiToken is Context, CrosschainLinked {
    using InteroperableAddress for bytes;

    event CrosschainMultiTokenTransferSent(
        bytes32 indexed sendId,
        address indexed from,
        bytes to,
        uint256[] ids,
        uint256[] values,
        bytes data
    );
    event CrosschainMultiTokenTransferReceived(
        bytes32 indexed receiveId,
        bytes from,
        address indexed to,
        uint256[] ids,
        uint256[] values,
        bytes data
    );

    /// @dev Revert reason when the address part of the interoperable address is empty.
    error CrosschainMultiTokenEmptyAddress();

    /**
     * @dev Revert reason when the received recipient is not a valid 20-byte address.
     *
     * NOTE: This guard has no upstream (openzeppelin-contracts) equivalent. It is added for the TVM: TRON addresses
     * are 21 bytes (a `0x41` prefix followed by a 20-byte body), one byte more than an EVM address. A counterpart that
     * forgets to strip the `0x41` prefix would relay a 21-byte recipient, and the naive `bytes20(...)` cast would
     * silently truncate it to `0x41` plus the first 19 bytes of the real address — a valid-looking but wrong address
     * that the tokens would be delivered to. Rejecting any non-20-byte recipient turns that TVM-specific encoding
     * mistake into a clean revert instead of lost tokens.
     */
    error CrosschainMultiTokenInvalidRecipient(bytes recipient);

    /**
     * @dev Internal crosschain transfer function. `data` is forwarded through the TRC-7786 payload to
     * {_onReceive} on the destination chain.
     *
     * Note: The `to` parameter is the full InteroperableAddress (chain ref + address).
     */
    function _crosschainTransfer(
        address from,
        bytes memory to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) internal virtual returns (bytes32) {
        _onSend(from, ids, values);

        (bytes2 chainType, bytes memory chainReference, bytes memory addr) = to.parseV1();
        require(addr.length > 0, CrosschainMultiTokenEmptyAddress());

        bytes32 sendId = _sendMessageToCounterpart(
            InteroperableAddress.formatV1(chainType, chainReference, hex""),
            abi.encode(InteroperableAddress.formatEvmV1(block.chainid, from), addr, ids, values, data),
            new bytes[](0)
        );

        emit CrosschainMultiTokenTransferSent(sendId, from, to, ids, values, data);
        return sendId;
    }

    /// @inheritdoc TRC7786Recipient
    function _processMessage(
        address /*gateway*/,
        bytes32 receiveId,
        bytes calldata /*sender*/,
        bytes calldata payload
    ) internal virtual override {
        // NOTE: Gateway is validated by {_isAuthorizedGateway} (implemented in {CrosschainLinked}). No need to check here.

        // split payload
        (bytes memory from, bytes memory toEvm, uint256[] memory ids, uint256[] memory values, bytes memory data) = abi
            .decode(payload, (bytes, bytes, uint256[], uint256[], bytes));
        // A TVM address body is 20 bytes; reject any other length instead of letting `bytes20` truncate a
        // 0x41-prefixed (21-byte) recipient or zero-pad a short one. See {CrosschainMultiTokenInvalidRecipient}.
        if (toEvm.length != 20) revert CrosschainMultiTokenInvalidRecipient(toEvm);
        address to = address(bytes20(toEvm));

        _onReceive(to, ids, values, data);

        emit CrosschainMultiTokenTransferReceived(receiveId, from, to, ids, values, data);
    }

    /// @dev Virtual function: implementation is required to handle token being burnt or locked on the source chain.
    function _onSend(address from, uint256[] memory ids, uint256[] memory values) internal virtual;

    /// @dev Virtual function: implementation is required to handle token being minted or unlocked on the destination chain.
    function _onReceive(address to, uint256[] memory ids, uint256[] memory values, bytes memory data) internal virtual;
}
