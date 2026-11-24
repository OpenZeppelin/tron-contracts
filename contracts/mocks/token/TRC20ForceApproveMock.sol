// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

// contract that replicates USDT (0xdac17f958d2ee523a2206206994597c13d831ec7) approval behavior
abstract contract TRC20ForceApproveMock is TRC20 {
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        require(amount == 0 || allowance(msg.sender, spender) == 0, "USDT approval failure");
        return super.approve(spender, amount);
    }
}
