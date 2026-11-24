// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

abstract contract TRC20ReturnFalseMock is TRC20 {
    function transfer(address, uint256) public pure override returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        return false;
    }

    function approve(address, uint256) public pure override returns (bool) {
        return false;
    }
}
