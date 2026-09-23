// SPDX-License-Identifier: MIT
// OpenZeppelin Tron Contracts (last updated v5.7.0-rc.0) (crosschain/bridges/abstract/BridgeNonFungible.sol)

pragma solidity ^0.8.26;

import {InteroperableAddress} from "../../../utils/draft-InteroperableAddress.sol";
import {Context} from "../../../utils/Context.sol";
import {TRC7786Recipient} from "../../TRC7786Recipient.sol";
import {CrosschainLinked} from "../../CrosschainLinked.sol";

/**
 * @dev Base contract for bridging TRC-721 between chains using a TRC-7786 gateway.
 *
 * In order to use this contract, two functions must be implemented to link it to the token:
 * * {_onSend}: called when a crosschain transfer is going out. Must take the sender tokens or revert.
 * * {_onReceive}: called when a crosschain transfer is coming in. Must give tokens to the receiver.
 *
 * This base contract is used by the {BridgeTRC721}, which interfaces with legacy TRC-721 tokens. It is also used by
 * the {TRC721Crosschain} extension, which embeds the bridge logic directly in the token contract.
 */
abstract contract BridgeNonFungible is Context, CrosschainLinked {
    /// @dev Emitted when a crosschain TRC-721 transfer is sent.
    event CrosschainNonFungibleTransferSent(bytes32 indexed sendId, address indexed from, bytes to, uint256 tokenId);

    /// @dev Emitted when a crosschain TRC-721 transfer is received.
    event CrosschainNonFungibleTransferReceived(
        bytes32 indexed receiveId,
        bytes from,
        address indexed to,
        uint256 tokenId
    );

    /// @dev Revert reason when the address part of the interoperable address is empty.
    error CrosschainNonFungibleEmptyAddress();

    /**
     * @dev Revert reason when the received recipient is not a valid 20-byte address.
     *
     * NOTE: This guard has no upstream (openzeppelin-contracts) equivalent. It is added for the TVM: TRON addresses
     * are 21 bytes (a `0x41` prefix followed by a 20-byte body), one byte more than an EVM address. A counterpart that
     * forgets to strip the `0x41` prefix would relay a 21-byte recipient, and the naive `bytes20(...)` cast would
     * silently truncate it to `0x41` plus the first 19 bytes of the real address — a valid-looking but wrong address
     * that the token would be delivered to. Rejecting any non-20-byte recipient turns that TVM-specific encoding
     * mistake into a clean revert instead of a lost token.
     */
    error CrosschainNonFungibleInvalidRecipient(bytes recipient);

    /**
     * @dev Internal crosschain transfer function.
     *
     * NOTE: The `to` parameter is the full InteroperableAddress (chain ref + address).
     */
    function _crosschainTransfer(address from, bytes memory to, uint256 tokenId) internal virtual returns (bytes32) {
        _onSend(from, tokenId);

        (bytes2 chainType, bytes memory chainReference, bytes memory addr) = InteroperableAddress.parseV1(to);
        require(addr.length > 0, CrosschainNonFungibleEmptyAddress());

        bytes32 sendId = _sendMessageToCounterpart(
            InteroperableAddress.formatV1(chainType, chainReference, hex""),
            abi.encode(InteroperableAddress.formatEvmV1(block.chainid, from), addr, tokenId),
            new bytes[](0)
        );

        emit CrosschainNonFungibleTransferSent(sendId, from, to, tokenId);

        return sendId;
    }

    /// @inheritdoc TRC7786Recipient
    function _processMessage(
        address /*gateway*/,
        bytes32 receiveId,
        bytes calldata /*sender*/,
        bytes calldata payload
    ) internal virtual override {
        // split payload
        (bytes memory from, bytes memory toEvm, uint256 tokenId) = abi.decode(payload, (bytes, bytes, uint256));
        // A TVM address body is 20 bytes; reject any other length instead of letting `bytes20` truncate a
        // 0x41-prefixed (21-byte) recipient or zero-pad a short one. See {CrosschainNonFungibleInvalidRecipient}.
        if (toEvm.length != 20) revert CrosschainNonFungibleInvalidRecipient(toEvm);
        address to = address(bytes20(toEvm));

        _onReceive(to, tokenId);

        emit CrosschainNonFungibleTransferReceived(receiveId, from, to, tokenId);
    }

    /// @dev Virtual function: implementation is required to handle token being burnt or locked on the source chain.
    function _onSend(address from, uint256 tokenId) internal virtual;

    /// @dev Virtual function: implementation is required to handle token being minted or unlocked on the destination chain.
    function _onReceive(address to, uint256 tokenId) internal virtual;
}
