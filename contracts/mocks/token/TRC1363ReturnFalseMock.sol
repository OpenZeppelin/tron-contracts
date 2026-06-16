// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ITRC20, TRC20} from "../../token/TRC20/TRC20.sol";
import {TRC1363} from "../../token/TRC20/extensions/TRC1363.sol";

abstract contract TRC1363ReturnFalseOnTRC20Mock is TRC1363 {
    function transfer(address, uint256) public pure override(ITRC20, TRC20) returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) public pure override(ITRC20, TRC20) returns (bool) {
        return false;
    }

    function approve(address, uint256) public pure override(ITRC20, TRC20) returns (bool) {
        return false;
    }
}

abstract contract TRC1363ReturnFalseMock is TRC1363 {
    function transferAndCall(address, uint256, bytes memory) public pure override returns (bool) {
        return false;
    }

    function transferFromAndCall(address, address, uint256, bytes memory) public pure override returns (bool) {
        return false;
    }

    function approveAndCall(address, uint256, bytes memory) public pure override returns (bool) {
        return false;
    }
}
