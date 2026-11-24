// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

/**
 * @dev Mock that mimics TRON USDT (`TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`): `transfer` performs the transfer
 * (reverting on failure, e.g. insufficient balance) but returns `false` even on success. `transferFrom` and
 * `approve` are left unchanged (return `true`), matching the real contract — only `transfer` is broken.
 */
abstract contract TRC20USDTMock is TRC20 {
    function transfer(address to, uint256 value) public override returns (bool) {
        super.transfer(to, value);
        return false;
    }
}
