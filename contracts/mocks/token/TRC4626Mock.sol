// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ITRC20, TRC20} from "../../token/TRC20/TRC20.sol";
import {TRC4626} from "../../token/TRC20/extensions/TRC4626.sol";

contract TRC4626Mock is TRC4626 {
    constructor(address underlying) TRC20("TRC4626Mock", "E4626M") TRC4626(ITRC20(underlying)) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
