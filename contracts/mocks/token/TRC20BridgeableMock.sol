// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20Bridgeable} from "../../token/TRC20/extensions/draft-TRC20Bridgeable.sol";

abstract contract TRC20BridgeableMock is TRC20Bridgeable {
    address private _bridge;

    error OnlyTokenBridge();
    event OnlyTokenBridgeFnCalled(address caller);

    constructor(address initialBridge) {
        _setBridge(initialBridge);
    }

    function _setBridge(address bridge) internal {
        _bridge = bridge;
    }

    function onlyTokenBridgeFn() external onlyTokenBridge {
        emit OnlyTokenBridgeFnCalled(msg.sender);
    }

    function _checkTokenBridge(address sender) internal view override {
        if (sender != _bridge) {
            revert OnlyTokenBridge();
        }
    }
}
