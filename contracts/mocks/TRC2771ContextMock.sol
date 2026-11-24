// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ContextMock} from "./ContextMock.sol";
import {Context} from "../utils/Context.sol";
import {Multicall} from "../utils/Multicall.sol";
import {TRC2771Context} from "../metatx/TRC2771Context.sol";

// By inheriting from TRC2771Context, Context's internal functions are overridden automatically
contract TRC2771ContextMock is ContextMock, TRC2771Context, Multicall {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder) TRC2771Context(trustedForwarder) {
        emit Sender(_msgSender()); // _msgSender() should be accessible during construction
    }

    function _msgSender() internal view override(Context, TRC2771Context) returns (address) {
        return TRC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, TRC2771Context) returns (bytes calldata) {
        return TRC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, TRC2771Context) returns (uint256) {
        return TRC2771Context._contextSuffixLength();
    }
}
