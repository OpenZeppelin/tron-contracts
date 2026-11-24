// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TRC20} from "../../../../token/TRC20/TRC20.sol";

contract GLDToken is TRC20 {
    constructor(uint256 initialSupply) TRC20("Gold", "GLD") {
        _mint(msg.sender, initialSupply);
    }
}
