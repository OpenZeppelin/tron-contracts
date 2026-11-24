// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessManaged} from "../../../access/manager/AccessManaged.sol";
import {TRC20} from "../../../token/TRC20/TRC20.sol";

contract AccessManagedTRC20Mint is TRC20, AccessManaged {
    constructor(address manager) TRC20("MyToken", "TKN") AccessManaged(manager) {}

    // Minting is restricted according to the manager rules for this function.
    // The function is identified by its selector: 0x40c10f19.
    // Calculated with bytes4(keccak256('mint(address,uint256)'))
    function mint(address to, uint256 amount) public restricted {
        _mint(to, amount);
    }
}
