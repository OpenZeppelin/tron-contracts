// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC4626} from "../../token/TRC20/extensions/TRC4626.sol";

abstract contract TRC4626LimitsMock is TRC4626 {
    uint256 _maxDeposit;
    uint256 _maxMint;

    constructor() {
        _maxDeposit = 100 * 10 ** 18;
        _maxMint = 100 * 10 ** 18;
    }

    function maxDeposit(address) public view override returns (uint256) {
        return _maxDeposit;
    }

    function maxMint(address) public view override returns (uint256) {
        return _maxMint;
    }
}
