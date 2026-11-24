// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {TRC20} from "../../token/TRC20/TRC20.sol";

contract TRC20WithAutoMinerReward is TRC20 {
    constructor() TRC20("Reward", "RWD") {
        _mintMinerReward();
    }

    function _mintMinerReward() internal {
        _mint(block.coinbase, 1000);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        if (!(from == address(0) && to == block.coinbase)) {
            _mintMinerReward();
        }
        super._update(from, to, value);
    }
}
