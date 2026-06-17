// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import {TRC7786Recipient} from "../../crosschain/TRC7786Recipient.sol";

contract TRC7786RecipientMock is TRC7786Recipient {
    address private immutable _gateway;

    event MessageReceived(address gateway, bytes32 receiveId, bytes sender, bytes payload, uint256 value);

    constructor(address gateway_) {
        _gateway = gateway_;
    }

    function _isAuthorizedGateway(
        address gateway,
        bytes calldata /*sender*/
    ) internal view virtual override returns (bool) {
        return gateway == _gateway;
    }

    function _processMessage(
        address gateway,
        bytes32 receiveId,
        bytes calldata sender,
        bytes calldata payload
    ) internal virtual override {
        emit MessageReceived(gateway, receiveId, sender, payload, msg.value);
    }
}
