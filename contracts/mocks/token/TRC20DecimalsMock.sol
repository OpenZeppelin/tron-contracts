// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

abstract contract TRC20DecimalsMock is TRC20 {
    uint8 private immutable _decimals;

    constructor(uint8 decimals_) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
