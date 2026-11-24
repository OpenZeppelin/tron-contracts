// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TRC20} from "../../../token/TRC20/TRC20.sol";
import {TRC20Permit} from "../../../token/TRC20/extensions/TRC20Permit.sol";
import {TRC20Votes} from "../../../token/TRC20/extensions/TRC20Votes.sol";
import {Nonces} from "../../../utils/Nonces.sol";

contract MyToken is TRC20, TRC20Permit, TRC20Votes {
    constructor() TRC20("MyToken", "MTK") TRC20Permit("MyToken") {}

    // The functions below are overrides required by Solidity.

    function _update(address from, address to, uint256 amount) internal override(TRC20, TRC20Votes) {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view virtual override(TRC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
