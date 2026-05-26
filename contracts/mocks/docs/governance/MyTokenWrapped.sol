// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ITRC20, TRC20} from "../../../token/TRC20/TRC20.sol";
import {TRC20Permit} from "../../../token/TRC20/extensions/TRC20Permit.sol";
import {TRC20Votes} from "../../../token/TRC20/extensions/TRC20Votes.sol";
import {TRC20Wrapper} from "../../../token/TRC20/extensions/TRC20Wrapper.sol";
import {Nonces} from "../../../utils/Nonces.sol";

contract MyTokenWrapped is TRC20, TRC20Permit, TRC20Votes, TRC20Wrapper {
    constructor(
        ITRC20 wrappedToken
    ) TRC20("MyTokenWrapped", "MTK") TRC20Permit("MyTokenWrapped") TRC20Wrapper(wrappedToken) {}

    // The functions below are overrides required by Solidity.

    function decimals() public view override(TRC20, TRC20Wrapper) returns (uint8) {
        return super.decimals();
    }

    function _update(address from, address to, uint256 amount) internal override(TRC20, TRC20Votes) {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view virtual override(TRC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
