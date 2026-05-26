// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

contract TRC20Mock is TRC20 {
    constructor() TRC20("TRC20Mock", "E20M") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
