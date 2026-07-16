// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.6.0) (crosschain/CrosschainLinked.sol)

pragma solidity ^0.8.26;

import {ITRC7786GatewaySource} from "../interfaces/draft-ITRC7786.sol";
import {InteroperableAddress} from "../utils/draft-InteroperableAddress.sol";
import {Bytes} from "../utils/Bytes.sol";
import {TRC7786Recipient} from "./TRC7786Recipient.sol";

/**
 * @dev Core bridging mechanism.
 *
 * This contract contains the logic to register and send messages to counterparts on remote chains using TRC-7786
 * gateways. It ensure received messages originate from a counterpart. This is the base of token bridges such as
 * {BridgeFungible}.
 *
 * Contracts that inherit from this contract can use the internal {_sendMessageToCounterpart} to send messages to their
 * counterpart on a foreign chain. They must override the {_processMessage} function to handle messages that have
 * been verified.
 */
abstract contract CrosschainLinked is TRC7786Recipient {
    using Bytes for bytes;
    using InteroperableAddress for bytes;

    struct Link {
        address gateway;
        bytes counterpart; // Full InteroperableAddress (chain ref + address)
    }
    mapping(bytes chainAddr => Link) private _links;

    /**
     * @dev Emitted when a new link is registered.
     *
     * Note: the `counterpart` argument is a full InteroperableAddress (chain ref + address).
     */
    event LinkRegistered(address gateway, bytes counterpart);

    /**
     * @dev Reverted when trying to register a link for a chain that is already registered.
     *
     * Note: the `chainAddr` argument is a "chain-only" InteroperableAddress (empty address).
     */
    error LinkAlreadyRegistered(bytes chainAddr);

    constructor(Link[] memory links) {
        for (uint256 i = 0; i < links.length; ++i) {
            _setLink(links[i].gateway, links[i].counterpart, false);
        }
    }

    /**
     * @dev Returns the TRC-7786 gateway used for sending and receiving cross-chain messages to a given chain.
     *
     * Note: The `chainAddr` parameter is a "chain-only" InteroperableAddress (empty address) and the `counterpart`
     * returns the full InteroperableAddress (chain ref + address) that is on `chainAddr`.
     */
    function getLink(bytes memory chainAddr) public view virtual returns (address gateway, bytes memory counterpart) {
        Link storage self = _links[chainAddr];
        return (self.gateway, self.counterpart);
    }

    /**
     * @dev Internal setter to change the TRC-7786 gateway and counterpart for a given chain. Called at construction.
     *
     * Note: The `counterpart` parameter is the full InteroperableAddress (chain ref + address).
     */
    function _setLink(address gateway, bytes memory counterpart, bool allowOverride) internal virtual {
        // Sanity check, this should revert if gateway is not an TRC-7786 implementation. Note that since
        // supportsAttribute returns data, an EOA would fail that test (nothing returned).
        ITRC7786GatewaySource(gateway).supportsAttribute(bytes4(0));

        bytes memory chainAddr = _extractChain(counterpart);
        if (allowOverride || _links[chainAddr].gateway == address(0)) {
            _links[chainAddr] = Link(gateway, counterpart);
            emit LinkRegistered(gateway, counterpart);
        } else {
            revert LinkAlreadyRegistered(chainAddr);
        }
    }

    /**
     * @dev Internal messaging function
     *
     * Note: The `chainAddr` parameter is a "chain-only" InteroperableAddress (empty address).
     */
    function _sendMessageToCounterpart(
        bytes memory chainAddr,
        bytes memory payload,
        bytes[] memory attributes
    ) internal virtual returns (bytes32) {
        (address gateway, bytes memory counterpart) = getLink(chainAddr);
        return ITRC7786GatewaySource(gateway).sendMessage(counterpart, payload, attributes);
    }

    /// @inheritdoc TRC7786Recipient
    function _isAuthorizedGateway(
        address instance,
        bytes calldata sender
    ) internal view virtual override returns (bool) {
        (address gateway, bytes memory router) = getLink(_extractChain(sender));
        return instance == gateway && sender.equal(router);
    }

    function _extractChain(bytes memory self) private pure returns (bytes memory) {
        (bytes2 chainType, bytes memory chainReference, ) = self.parseV1();
        return InteroperableAddress.formatV1(chainType, chainReference, hex"");
    }
}
