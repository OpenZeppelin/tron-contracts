// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TRC20Permit, TRC20} from "../patched/token/TRC20/extensions/TRC20Permit.sol";

contract TRC20PermitHarness is TRC20Permit {
    constructor(string memory name, string memory symbol) TRC20(name, symbol) TRC20Permit(name) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
