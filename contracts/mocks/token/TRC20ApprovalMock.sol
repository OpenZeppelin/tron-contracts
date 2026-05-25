// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

abstract contract TRC20ApprovalMock is TRC20 {
    function _approve(address owner, address spender, uint256 amount, bool) internal virtual override {
        super._approve(owner, spender, amount, true);
    }
}
